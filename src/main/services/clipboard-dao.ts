import { exec, queryAll } from './db-helpers'
import { createHash } from 'crypto'
import { BrowserWindow } from 'electron'

export interface ClipboardRow {
  id: number
  content: string
  content_hash: string
  copied_at: string
}

export function listClipboardHistory(limit = 50, offset = 0): ClipboardRow[] {
  return queryAll(
    `SELECT * FROM clipboard_history ORDER BY copied_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  ) as unknown as ClipboardRow[]
}

export function addTextEntry(text: string, notifyWin?: BrowserWindow | null): void {
  const hash = createHash('sha256').update(text).digest('hex')

  const last = queryAll(
    `SELECT content_hash FROM clipboard_history ORDER BY copied_at DESC LIMIT 1`
  ) as { content_hash: string }[]
  if (last.length > 0 && last[0].content_hash === hash) return

  exec(
    `INSERT OR IGNORE INTO clipboard_history (content, content_hash) VALUES (?, ?)`,
    [text, hash]
  )

  trimHistory()

  if (notifyWin && !notifyWin.isDestroyed()) {
    notifyWin.webContents.send('clipboard:updated')
  }
}

function trimHistory(): void {
  exec(
    `DELETE FROM clipboard_history WHERE id NOT IN (
      SELECT id FROM clipboard_history ORDER BY copied_at DESC LIMIT 200
    )`
  )
}

export function deleteClipboardEntry(id: number): void {
  exec(`DELETE FROM clipboard_history WHERE id = ?`, [id])
}

export function clearClipboardHistory(): void {
  exec(`DELETE FROM clipboard_history`)
}
