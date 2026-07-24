import { contextBridge, ipcRenderer, clipboard } from 'electron'

contextBridge.exposeInMainWorld('quickx', {
  copyText: (text: string) => clipboard.writeText(text),
  close: () => ipcRenderer.send('translate-result:close'),
  onResult: (cb: (data: { original: string; translated: string }) => void) => {
    ipcRenderer.on('translate-result:data', (_e, data) => cb(data))
  },
  /** Request translation of the current original text */
  requestTranslate: (text: string) => ipcRenderer.invoke('translate-result:translate', text),
})
