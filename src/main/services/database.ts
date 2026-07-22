import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

let db: SqlJsDatabase
let dbPath: string

export async function initDb(customPath?: string): Promise<SqlJsDatabase> {
  const wasmPath = path.join(__dirname, 'sql-wasm.wasm')
  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  })
  dbPath = customPath || path.join(app.getPath('userData'), 'data.db')

  // Load existing database or create new
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  migrate(db)
  return db
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

export function saveDb(): void {
  if (!db || !dbPath) return
  const data = db.export()
  const buffer = Buffer.from(data)
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(dbPath, buffer)
}

export function closeDb(): void {
  saveDb()
  if (db) {
    db.close()
  }
}

function migrate(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      remark TEXT,
      tags TEXT DEFAULT '[]',
      favicon TEXT,
      open_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      language TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS clipboard_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL UNIQUE,
      copied_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  // Indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_links_updated ON links(updated_at DESC)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_links_open_count ON links(open_count DESC)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_snippets_updated ON snippets(updated_at DESC)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets(language)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_clipboard_time ON clipboard_history(copied_at DESC)`)
}
