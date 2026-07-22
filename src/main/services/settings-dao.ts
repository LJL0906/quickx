import { queryOne, exec } from './db-helpers'

export function getSetting(key: string): string | undefined {
  const row = queryOne(`SELECT value FROM settings WHERE key = ?`, [key]) as
    | { value: string }
    | undefined
  return row?.value
}

export function setSetting(key: string, value: string): void {
  exec(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  )
}
