import { ipcMain, shell, BrowserWindow, app, screen } from 'electron'
import { searchLinks, listLinks, createLink, updateLink, deleteLink, incrementOpenCount } from '../services/links-dao'
import { listNotes, createNote, updateNote, deleteNote } from '../services/notes-dao'
import { listSnippets, createSnippet, updateSnippet, deleteSnippet } from '../services/snippets-dao'
import { listClipboardHistory, deleteClipboardEntry, clearClipboardHistory } from '../services/clipboard-dao'
import { getSetting, setSetting } from '../services/settings-dao'
import { clipboard } from 'electron'
import { translateText, guessLang, BaiduConfig } from '../services/translate-service'
import { ocrImage } from '../services/ocr-service'

export function registerIpcHandlers(
  getMainWindow: () => BrowserWindow | null,
  showMainWindow: () => void,
  showTranslateResult?: (original: string, translated: string) => void
): void {
  // ── Window controls ──────────────────────────────────
  ipcMain.on('window:minimize', () => {
    const win = getMainWindow()
    win?.minimize()
  })
  ipcMain.on('window:maximize', () => {
    const win = getMainWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.on('window:close', () => {
    const win = getMainWindow()
    win?.hide()
  })

  // ── Search bar ──────────────────────────────────────
  ipcMain.handle('search:links', (_e, keyword: string) => {
    return searchLinks(keyword)
  })

  ipcMain.handle('link:open', (_e, url: string) => {
    // Find link by URL and increment count
    const links = searchLinks(url)
    const match = links.find((l) => l.url === url)
    if (match) {
      incrementOpenCount(match.id)
    }
    return shell.openExternal(url)
  })

  ipcMain.on('window:open-main', () => {
    showMainWindow()
  })

  ipcMain.on('window:hide-search', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    win?.hide()
  })

  ipcMain.on('search-bar:resize', (e, height: number) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) {
      win.setSize(680, Math.round(height), true)
      const { width: sw, height: sh } = screen.getPrimaryDisplay().workArea
      const [ww] = win.getSize()
      win.setPosition(Math.round((sw - ww) / 2), Math.round(sh * 0.28))
    }
  })

  // ── Links ───────────────────────────────────────────
  ipcMain.handle('links:list', () => listLinks())
  ipcMain.handle('links:create', (_e, data) => createLink(data))
  ipcMain.handle('links:update', (_e, id, data) => updateLink(id, data))
  ipcMain.handle('links:delete', (_e, id) => deleteLink(id))

  // ── Notes ───────────────────────────────────────────
  ipcMain.handle('notes:list', () => listNotes())
  ipcMain.handle('notes:create', (_e, data) => createNote(data))
  ipcMain.handle('notes:update', (_e, id, data) => updateNote(id, data))
  ipcMain.handle('notes:delete', (_e, id) => deleteNote(id))

  // ── Snippets ────────────────────────────────────────
  ipcMain.handle('snippets:list', () => listSnippets())
  ipcMain.handle('snippets:create', (_e, data) => createSnippet(data))
  ipcMain.handle('snippets:update', (_e, id, data) => updateSnippet(id, data))
  ipcMain.handle('snippets:delete', (_e, id) => deleteSnippet(id))

  // ── Clipboard ───────────────────────────────────────
  ipcMain.handle('clipboard:list', (_e, limit, offset) =>
    listClipboardHistory(limit, offset)
  )
  ipcMain.handle('clipboard:copy', (_e, text: string) => {
    clipboard.writeText(text)
  })
  ipcMain.handle('clipboard:clear', () => clearClipboardHistory())

  // ── Translate ───────────────────────────────────────
  // Text translation via Baidu
  ipcMain.handle('translate:text', async (_e, q: string, from: string, to: string) => {
    const appId = getSetting('baiduAppId')
    const secretKey = getSetting('baiduSecretKey')
    if (!appId || !secretKey) {
      throw new Error('请先在设置中配置百度翻译 API')
    }
    const config: BaiduConfig = { appId: appId as string, secretKey: secretKey as string }
    return translateText(q, from || guessLang(q), to || (guessLang(q) === 'zh' ? 'en' : 'zh'), config)
  })

  // Screenshot: OCR + translate (via overlay flow, kept for external calls)
  // Note: the main overlay flow is in main/index.ts

  // ── Settings ────────────────────────────────────────
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key))
  ipcMain.handle('settings:set', (_e, key: string, value: unknown) => {
    const stored = typeof value === 'string' ? value : JSON.stringify(value)
    setSetting(key, stored)
    if (key === 'autoStart') {
      app.setLoginItemSettings({ openAtLogin: stored === 'true' })
    }
  })
}
