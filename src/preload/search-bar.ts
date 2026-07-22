import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('quickx', {
  // Search links
  searchLinks: (keyword: string) => ipcRenderer.invoke('search:links', keyword),
  // Open link in browser
  openLink: (url: string) => ipcRenderer.invoke('link:open', url),
  // Open main window
  openMainWindow: () => ipcRenderer.send('window:open-main'),
  // Hide search bar
  hide: () => ipcRenderer.send('window:hide-search'),
  // Resize window
  resizeSearchBar: (height: number) => ipcRenderer.send('search-bar:resize', height),
  // Focus listener
  onFocusInput: (cb: () => void) => {
    ipcRenderer.on('focus-input', () => cb())
  },
})
