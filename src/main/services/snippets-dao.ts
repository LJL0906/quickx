import { exec, execInsert, queryAll, queryOne } from './db-helpers'

export interface SnippetRow {
  id: number
  title: string
  code: string
  language: string | null
  tags: string
  created_at: string
  updated_at: string
}

export function listSnippets(): SnippetRow[] {
  return queryAll(`SELECT * FROM snippets ORDER BY updated_at DESC`) as unknown as SnippetRow[]
}

export function createSnippet(data: {
  title: string
  code: string
  language?: string
  tags?: string[]
}): SnippetRow {
  const tags = JSON.stringify(data.tags ?? [])
  const id = execInsert(
    `INSERT INTO snippets (title, code, language, tags) VALUES (?, ?, ?, ?)`,
    [data.title, data.code, data.language ?? null, tags]
  )
  return queryOne(`SELECT * FROM snippets WHERE id = ?`, [id]) as unknown as SnippetRow
}

export function updateSnippet(id: number, data: Record<string, unknown>): void {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code) }
  if (data.language !== undefined) { fields.push('language = ?'); values.push(data.language) }
  if (data.tags !== undefined) {
    fields.push('tags = ?')
    values.push(JSON.stringify(data.tags))
  }
  fields.push("updated_at = datetime('now')")

  if (fields.length === 0) return
  values.push(id)
  exec(`UPDATE snippets SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteSnippet(id: number): void {
  exec(`DELETE FROM snippets WHERE id = ?`, [id])
}
