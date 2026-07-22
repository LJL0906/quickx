import { exec, execInsert, queryAll, queryOne } from './db-helpers'

export interface NoteRow {
  id: number
  title: string
  content: string | null
  tags: string
  created_at: string
  updated_at: string
}

export function listNotes(): NoteRow[] {
  return queryAll(`SELECT * FROM notes ORDER BY updated_at DESC`) as unknown as NoteRow[]
}

export function createNote(data: {
  title: string
  content?: string
  tags?: string[]
}): NoteRow {
  const tags = JSON.stringify(data.tags ?? [])
  const id = execInsert(
    `INSERT INTO notes (title, content, tags) VALUES (?, ?, ?)`,
    [data.title, data.content ?? null, tags]
  )
  return queryOne(`SELECT * FROM notes WHERE id = ?`, [id]) as unknown as NoteRow
}

export function updateNote(id: number, data: Record<string, unknown>): void {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content) }
  if (data.tags !== undefined) {
    fields.push('tags = ?')
    values.push(JSON.stringify(data.tags))
  }
  fields.push("updated_at = datetime('now')")

  if (fields.length === 0) return
  values.push(id)
  exec(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteNote(id: number): void {
  exec(`DELETE FROM notes WHERE id = ?`, [id])
}
