// ── Shared types between main process and renderer ──────

export interface LinkItem {
  id: number
  title: string
  url: string
  remark: string | null
  tags: string | null
  favicon: string | null
  open_count: number
  created_at: string
  updated_at: string
}

export interface NoteItem {
  id: number
  title: string
  content: string | null
  tags: string | null
  created_at: string
  updated_at: string
}

export interface SnippetItem {
  id: number
  title: string
  code: string
  language: string | null
  tags: string | null
  created_at: string
  updated_at: string
}

export interface ClipboardItem {
  id: number
  content: string
  copied_at: string
}

// ── Search Bar API ───────────────────────────────────────
export interface SearchBarAPI {
  searchLinks: (keyword: string) => Promise<LinkItem[]>
  openLink: (url: string) => Promise<void>
  openMainWindow: () => void
  hide: () => void
  onFocusInput: (cb: () => void) => void
}

// ── Main Window API ──────────────────────────────────────
export interface MainWindowAPI {
  // Window controls
  minimize: () => void
  maximize: () => void
  close: () => void

  // Links
  getLinks: () => Promise<LinkItem[]>
  createLink: (data: { title: string; url: string; remark?: string; tags?: string[] }) => Promise<LinkItem>
  updateLink: (id: number, data: Record<string, unknown>) => Promise<void>
  deleteLink: (id: number) => Promise<void>
  openLink: (url: string) => Promise<void>

  // Notes
  getNotes: () => Promise<NoteItem[]>
  createNote: (data: { title: string; content?: string; tags?: string[] }) => Promise<NoteItem>
  updateNote: (id: number, data: Record<string, unknown>) => Promise<void>
  deleteNote: (id: number) => Promise<void>

  // Snippets
  getSnippets: () => Promise<SnippetItem[]>
  createSnippet: (data: { title: string; code: string; language?: string; tags?: string[] }) => Promise<SnippetItem>
  updateSnippet: (id: number, data: Record<string, unknown>) => Promise<void>
  deleteSnippet: (id: number) => Promise<void>

  // Clipboard
  getClipboardHistory: (limit?: number, offset?: number) => Promise<ClipboardItem[]>
  copyToClipboard: (text: string) => Promise<void>
  clearClipboardHistory: () => Promise<void>

  // Settings
  getSetting: (key: string) => Promise<unknown>
  setSetting: (key: string, value: unknown) => Promise<void>
}

// ── Aliases (for components using "Row" naming) ──────────
export type LinkRow = LinkItem
export type NoteRow = NoteItem
export type SnippetRow = SnippetItem
export type ClipboardRow = ClipboardItem
declare global {
  interface Window {
    quickx: SearchBarAPI & MainWindowAPI
  }
}
