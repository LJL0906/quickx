import { Database as SqlJsDatabase } from 'sql.js'
import { getDb, saveDb } from './database'

// ── Helpers ───────────────────────────────────────────────

/** Run INSERT/UPDATE/DELETE, auto-save */
export function exec(sql: string, params: unknown[] = []): void {
  const db = getDb()
  db.run(sql, params)
  saveDb()
}

/** Run INSERT and return lastInsertRowid */
export function execInsert(sql: string, params: unknown[] = []): number {
  const db = getDb()
  db.run(sql, params)
  const result = db.exec('SELECT last_insert_rowid() as id')
  saveDb()
  return result[0].values[0][0] as number
}

/** Run SELECT and return rows as objects */
export function queryAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const db = getDb()
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

/** Run SELECT and return first row or null */
export function queryOne(sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}
