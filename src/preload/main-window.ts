import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('quickx', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Links
  getLinks: () => ipcRenderer.invoke('links:list'),
  createLink: (data: { title: string; url: string; remark?: string; tags?: string[] }) =>
    ipcRenderer.invoke('links:create', data),
  updateLink: (id: number, data: Record<string, unknown>) =>
    ipcRenderer.invoke('links:update', id, data),
  deleteLink: (id: number) => ipcRenderer.invoke('links:delete', id),
  openLink: (url: string) => ipcRenderer.invoke('link:open', url),

  // Notes
  getNotes: () => ipcRenderer.invoke('notes:list'),
  createNote: (data: { title: string; content?: string; tags?: string[] }) =>
    ipcRenderer.invoke('notes:create', data),
  updateNote: (id: number, data: Record<string, unknown>) =>
    ipcRenderer.invoke('notes:update', id, data),
  deleteNote: (id: number) => ipcRenderer.invoke('notes:delete', id),

  // Snippets
  getSnippets: () => ipcRenderer.invoke('snippets:list'),
  createSnippet: (data: { title: string; code: string; language?: string; tags?: string[] }) =>
    ipcRenderer.invoke('snippets:create', data),
  updateSnippet: (id: number, data: Record<string, unknown>) =>
    ipcRenderer.invoke('snippets:update', id, data),
  deleteSnippet: (id: number) => ipcRenderer.invoke('snippets:delete', id),

  // Clipboard
  getClipboardHistory: (limit?: number, offset?: number) =>
    ipcRenderer.invoke('clipboard:list', limit, offset),
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:copy', text),
  clearClipboardHistory: () => ipcRenderer.invoke('clipboard:clear'),
  onClipboardUpdated: (cb: () => void) => {
    ipcRenderer.on('clipboard:updated', () => cb())
  },

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),

  // Navigation
  onNavigate: (cb: (tab: string) => void) => {
    ipcRenderer.on('navigate', (_e, tab: string) => cb(tab))
  },

  // Shortcuts
  getShortcuts: () => ipcRenderer.invoke('shortcuts:get'),
  setShortcut: (action: string, key: string) => ipcRenderer.invoke('shortcuts:set', action, key),

  // Database
  getDbPath: () => ipcRenderer.invoke('db:getPath'),
  selectDbPath: () => ipcRenderer.invoke('db:selectPath'),
  exportDb: () => ipcRenderer.invoke('db:export'),
  importDb: () => ipcRenderer.invoke('db:import'),

  // Update
  checkUpdate: () => ipcRenderer.invoke('app:check-update'),

  // Restart
  restartApp: () => ipcRenderer.invoke('app:restart'),

  // Version
  getAppVersion: () => ipcRenderer.invoke('app:version'),
})
