import { exec, execInsert, queryAll, queryOne } from './db-helpers'

export interface LinkRow {
  id: number
  title: string
  url: string
  remark: string | null
  tags: string
  favicon: string | null
  open_count: number
  created_at: string
  updated_at: string
}

export function searchLinks(keyword: string): LinkRow[] {
  const like = `%${keyword}%`
  return queryAll(
    `SELECT * FROM links
     WHERE title LIKE ? OR url LIKE ? OR remark LIKE ?
     ORDER BY open_count DESC, updated_at DESC
     LIMIT 6`,
    [like, like, like]
  ) as unknown as LinkRow[]
}

export function listLinks(): LinkRow[] {
  return queryAll(`SELECT * FROM links ORDER BY updated_at DESC`) as unknown as LinkRow[]
}

export function createLink(data: {
  title: string
  url: string
  remark?: string
  tags?: string[]
}): LinkRow {
  const tags = JSON.stringify(data.tags ?? [])
  const id = execInsert(
    `INSERT INTO links (title, url, remark, tags) VALUES (?, ?, ?, ?)`,
    [data.title, data.url, data.remark ?? null, tags]
  )
  return queryOne(`SELECT * FROM links WHERE id = ?`, [id]) as unknown as LinkRow
}

export function updateLink(id: number, data: Record<string, unknown>): void {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url) }
  if (data.remark !== undefined) { fields.push('remark = ?'); values.push(data.remark) }
  if (data.tags !== undefined) {
    fields.push('tags = ?')
    values.push(JSON.stringify(data.tags))
  }
  fields.push("updated_at = datetime('now')")

  if (fields.length === 0) return
  values.push(id)
  exec(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteLink(id: number): void {
  exec(`DELETE FROM links WHERE id = ?`, [id])
}

export function incrementOpenCount(id: number): void {
  exec(`UPDATE links SET open_count = open_count + 1, updated_at = datetime('now') WHERE id = ?`, [id])
}
