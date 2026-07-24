import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('quickx', {
  translateText: (q: string, from: string, to: string) =>
    ipcRenderer.invoke('translate:text', q, from, to),
  close: () => ipcRenderer.send('translate-input:close'),
})
