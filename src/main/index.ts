import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, clipboard, ipcMain, dialog } from 'electron'
import path from 'path'
import { exec } from 'child_process'
import { initDb, closeDb } from './services/database'
import { autoUpdater } from 'electron-updater'
import { addTextEntry } from './services/clipboard-dao'
import { registerIpcHandlers } from './ipc/index'
import { saveScreenshot, cleanupScreenshot } from './services/screenshot'

// ── Window references ────────────────────────────────────
let searchBarWin: BrowserWindow | null = null
let mainWin: BrowserWindow | null = null
let translateResultWin: BrowserWindow | null = null
let resultWinReady = false
let pendingResult: { original: string; translated: string } | null = null

// ...

function showTranslateResult(original: string, translated: string): void {
  pendingResult = { original, translated }
  if (!translateResultWin) {
    translateResultWin = createTranslateResultWindow()
    translateResultWin.on('ready-to-show', () => {
      resultWinReady = true
      translateResultWin?.show()
      translateResultWin?.focus()
      if (pendingResult) {
        translateResultWin?.webContents.send('translate-result:data', pendingResult)
        pendingResult = null
      }
    })
    translateResultWin.on('closed', () => {
      translateResultWin = null
      resultWinReady = false
    })
    return
  }
  // Window ready — send directly
  if (resultWinReady && !translateResultWin.isDestroyed()) {
    translateResultWin.show()
    translateResultWin.focus()
    translateResultWin.webContents.send('translate-result:data', { original, translated })
    pendingResult = null
  }
}
let translateInputWin: BrowserWindow | null = null
let tray: Tray | null = null

const isDev = process.env.NODE_ENV === 'development'

// ── Path helpers ─────────────────────────────────────────
function getPreload(name: string): string {
  return path.join(__dirname, `${name}.js`)
}

function getRendererHtml(name: string): string {
  if (isDev) {
    return `http://localhost:5173/${name}/index.html`
  }
  return path.join(__dirname, '..', 'renderer', `${name}/index.html`)
}

// ── Icon path ────────────────────────────────────────────
const iconPath = path.join(app.getAppPath(), 'assets', 'icon.png')

// ── Search Bar Window ────────────────────────────────────
function positionSearchBar(win: BrowserWindow): void {
  const { screen } = require('electron')
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workArea
  const [winW] = win.getSize()
  const x = Math.round((width - winW) / 2)
  const y = Math.round(height * 0.28) // upper third, not dead center
  win.setPosition(x, y)
}

function createSearchBar(): BrowserWindow {
  const win = new BrowserWindow({
    width: 680, height: 60, frame: false, transparent: true,
    alwaysOnTop: true, resizable: false, skipTaskbar: true,
    icon: iconPath, show: false,
    webPreferences: { preload: getPreload('search-bar'), contextIsolation: true, nodeIntegration: false },
  })
  win.loadURL(getRendererHtml('search-bar'))
  positionSearchBar(win)
  win.on('blur', () => win.hide())
  return win
}

// ── Main Window ──────────────────────────────────────────
function createMainWindow(): BrowserWindow {
  const { getSetting } = require('./services/settings-dao')
  const w = parseInt(getSetting('mainWinWidth') as string) || 1200
  const h = parseInt(getSetting('mainWinHeight') as string) || 900
  const win = new BrowserWindow({
    width: w, height: h, minWidth: 800, minHeight: 600,
    frame: false, title: 'QuickX', icon: iconPath, show: false,
    webPreferences: { preload: getPreload('main-window'), contextIsolation: true, nodeIntegration: false },
  })
  win.loadURL(getRendererHtml('main-window'))
  win.on('close', (e) => { if (!isQuitting) { e.preventDefault(); win.hide() } })
  return win
}

// ── Toggle Search Bar ────────────────────────────────────
function toggleSearchBar(): void {
  if (!searchBarWin) {
    searchBarWin = createSearchBar()
    searchBarWin.on('ready-to-show', () => { searchBarWin?.show(); positionSearchBar(searchBarWin); searchBarWin?.focus(); searchBarWin?.webContents.send('focus-input') })
    searchBarWin.on('closed', () => { searchBarWin = null })
  } else if (searchBarWin.isVisible()) {
    searchBarWin.hide()
  } else {
    searchBarWin.show(); positionSearchBar(searchBarWin); searchBarWin.focus(); searchBarWin.webContents.send('focus-input')
  }
}

// ── Show Main Window ─────────────────────────────────────
function showMainWindow(): void {
  if (!mainWin) {
    mainWin = createMainWindow()
    mainWin.on('ready-to-show', () => mainWin?.show())
    mainWin.on('closed', () => { mainWin = null })
  } else { mainWin.show(); mainWin.focus() }
}

// ── Translate Result Window ──────────────────────────────
function createTranslateResultWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1000, height: 700, minWidth: 500, minHeight: 400,
    frame: false, alwaysOnTop: true, resizable: true, skipTaskbar: false,
    icon: iconPath, show: false,
    webPreferences: { preload: getPreload('translate-result'), contextIsolation: true, nodeIntegration: false },
  })
  win.loadURL(getRendererHtml('translate-result'))
  win.center()
  // closed handler registered in showTranslateResult
  return win
}

// ── Translate Input Window ──────────────────────────────
function createTranslateInputWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1000, height: 700, minWidth: 500, minHeight: 400,
    frame: false, title: 'QuickX 翻译', icon: iconPath, show: false,
    webPreferences: { preload: getPreload('translate-input'), contextIsolation: true, nodeIntegration: false },
  })
  win.loadURL(getRendererHtml('translate-input'))
  win.center()
  win.on('closed', () => { translateInputWin = null })
  return win
}

function toggleTranslateInput(): void {
  if (translateInputWin && translateInputWin.isVisible()) { translateInputWin.hide(); return }
  if (translateInputWin) { translateInputWin.show(); translateInputWin.focus(); return }
  translateInputWin = createTranslateInputWindow()
  translateInputWin.on('ready-to-show', () => { translateInputWin?.show(); translateInputWin?.focus() })
}

// ── Screenshot Translate via System Screenshot ───────────
let screenshotImageWatcher: ReturnType<typeof setInterval> | null = null
let lastImageHash = ''

function startScreenshotTranslate(): void {
  // Record current clipboard image hash
  const img = clipboard.readImage()
  lastImageHash = img.isEmpty() ? '' : img.toDataURL().slice(0, 200)

  // Try to trigger Windows screenshot tool
  exec('start ms-screenclip:', () => {
    // Ignore errors — user can always use Win+Shift+S manually
  })

  // Start polling for new clipboard image (every 300ms, timeout 30s)
  let elapsed = 0
  screenshotImageWatcher = setInterval(() => {
    elapsed += 300
    const newImg = clipboard.readImage()
    if (newImg.isEmpty()) {
      if (elapsed >= 30000) stopScreenshotWatcher()
      return
    }
    const newHash = newImg.toDataURL().slice(0, 200)
    if (newHash === lastImageHash) {
      if (elapsed >= 30000) stopScreenshotWatcher()
      return
    }
    // New image detected!
    stopScreenshotWatcher()
    processScreenshotImage(newImg)
  }, 300)
}

function stopScreenshotWatcher(): void {
  if (screenshotImageWatcher) { clearInterval(screenshotImageWatcher); screenshotImageWatcher = null }
}

async function processScreenshotImage(img: Electron.NativeImage): Promise<void> {
  // Show result window immediately with loading state
  showTranslateResult('', '正在 OCR 识别...')

  const { ocrImage } = require('./services/ocr-service')
  const { getSetting } = require('./services/settings-dao')

  const result = saveScreenshot(img)
  try {
    const originalText = await ocrImage(result.filePath)
    // Only show OCR result — user decides whether to translate
    showTranslateResult(originalText, '')
  } catch (err: any) {
    showTranslateResult('', `错误: ${err.message}`)
  } finally {
    cleanupScreenshot(result.filePath)
  }
}

// ── Shortcut management ──────────────────────────────────
const DEFAULT_SHORTCUTS: Record<string, string> = {
  search: 'Alt+Q', links: 'Alt+`', notes: 'Alt+1', snippets: 'Alt+2',
  clipboard: 'Alt+3', settings: 'Alt+4', screenshotTranslate: 'Alt+T', translateInput: 'Alt+E',
}

type ShortcutAction = 'search' | 'links' | 'notes' | 'snippets' | 'clipboard' | 'settings' | 'screenshotTranslate' | 'translateInput'

const shortcutActions: Record<ShortcutAction, () => void> = {
  search: () => toggleSearchBar(),
  links: () => navigateTo('links'), notes: () => navigateTo('notes'),
  snippets: () => navigateTo('snippets'), clipboard: () => navigateTo('clipboard'),
  settings: () => navigateTo('settings'),
  screenshotTranslate: () => startScreenshotTranslate(),
  translateInput: () => toggleTranslateInput(),
}

function navigateTo(tab: string) {
  if (mainWin && mainWin.isVisible()) { mainWin.hide() }
  else { showMainWindow(); mainWin?.webContents.send('navigate', tab) }
}

function registerAllShortcuts(getSetting: (key: string) => string | undefined) {
  const raw = getSetting('shortcuts'); const custom: Record<string, string> = raw ? JSON.parse(raw) : {}
  const shortcuts = { ...DEFAULT_SHORTCUTS, ...custom }
  for (const [action, key] of Object.entries(shortcuts)) {
    const handler = shortcutActions[action as ShortcutAction]
    if (handler) console.log(`[QuickX] ${action} (${key}) registered:`, globalShortcut.register(key, handler))
  }
}

function warmUpMainWindow(): void {
  mainWin = createMainWindow()
  mainWin.on('closed', () => { mainWin = null })
}

/** Pre-load Tesseract language data in background so first OCR is instant. */
function warmUpTesseract(): void {
  const { warmUpWorker } = require('./services/ocr-service')
  warmUpWorker()
}

// ── Tray ──────────────────────────────────────────────────
function createTray(): void {
  const icon = nativeImage.createFromPath(path.join(app.getAppPath(), 'assets', 'icon.png')).resize({ width: 16, height: 16 })
  tray = new Tray(icon); tray.setToolTip('QuickX')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开主窗口', click: () => showMainWindow() },
    { label: '检查更新', click: () => autoUpdater.checkForUpdatesAndNotify() },
    { type: 'separator' },
    { label: '重新启动', click: () => { isQuitting = true; app.relaunch(); app.quit() } },
    { label: '退出', click: () => { isQuitting = true; app.quit() } },
  ]))
  tray.on('click', () => toggleSearchBar())
}

// ── Clipboard text polling ───────────────────────────────
let clipboardTimer: ReturnType<typeof setInterval> | null = null
let lastClipboardText = ''

function startClipboardWatcher(): void {
  lastClipboardText = clipboard.readText()
  clipboardTimer = setInterval(() => {
    const text = clipboard.readText()
    if (text && text !== lastClipboardText) { lastClipboardText = text; addTextEntry(text, mainWin) }
  }, 1000)
}

function stopClipboardWatcher(): void {
  if (clipboardTimer) { clearInterval(clipboardTimer); clipboardTimer = null }
}

// ── App Lifecycle ─────────────────────────────────────────
let isQuitting = false

app.whenReady().then(async () => {
  const settingsDao = require("./services/settings-dao")
  const fs = require('fs')
  await initDb()
  console.log('[QuickX] database initialized')

  const customPath = settingsDao.getSetting('dbPath')
  const defaultPath = path.join(app.getPath('userData'), 'data.db')
  if (customPath && customPath !== defaultPath && fs.existsSync(customPath)) {
    closeDb(); await initDb(customPath); console.log('[QuickX] switched to custom DB:', customPath)
  }

  if (settingsDao.getSetting('autoStart') === 'true') {
    app.setLoginItemSettings({ openAtLogin: true }); console.log('[QuickX] auto-start enabled')
  }

  registerIpcHandlers(() => mainWin, showMainWindow, showTranslateResult)

  // Translate result + input window IPC
  ipcMain.on('translate-result:close', () => { translateResultWin?.close(); translateResultWin = null; resultWinReady = false })
  ipcMain.on('translate-input:close', () => { translateInputWin?.close(); translateInputWin = null })

  // Translate on demand (from OCR result window)
  ipcMain.handle('translate-result:translate', async (_e, text: string) => {
    const { translateText, guessLang, BaiduConfig } = require('./services/translate-service')
    const appId = settingsDao.getSetting('baiduAppId')
    const secretKey = settingsDao.getSetting('baiduSecretKey')
    if (!appId || !secretKey) throw new Error('请先在设置中配置百度翻译 API')
    const config: BaiduConfig = { appId: appId as string, secretKey: secretKey as string }
    const results = await translateText(text, guessLang(text), guessLang(text) === 'zh' ? 'en' : 'zh', config)
    return results.map((r: any) => r.dst).join('\n')
  })

  // Shortcut CRUD
  ipcMain.handle('shortcuts:get', () => {
    try { const raw = settingsDao.getSetting('shortcuts'); return { ...DEFAULT_SHORTCUTS, ...(raw ? JSON.parse(raw) : {}) } }
    catch { return { ...DEFAULT_SHORTCUTS } }
  })
  ipcMain.handle('shortcuts:set', (_e: any, action: string, key: string) => {
    const raw = settingsDao.getSetting('shortcuts'); const custom: Record<string, string> = raw ? JSON.parse(raw) : {}
    custom[action] = key; settingsDao.setSetting('shortcuts', JSON.stringify(custom))
    globalShortcut.unregisterAll(); registerAllShortcuts(settingsDao.getSetting)
  })

  // Update check
  ipcMain.handle('app:check-update', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      if (!result || !result.updateInfo.version) return { available: false }
      autoUpdater.downloadUpdate(); return { available: true, version: result.updateInfo.version }
    } catch { return { available: false, error: true } }
  })

  // Restart app
  ipcMain.handle('app:restart', () => {
    isQuitting = true
    app.relaunch()
    app.quit()
  })

  // App version
  ipcMain.handle('app:version', () => app.getVersion())

  // Database management
  ipcMain.handle('db:getPath', () => settingsDao.getSetting('dbPath') || path.join(app.getPath('userData'), 'data.db'))
  ipcMain.handle('db:selectPath', async () => {
    const result = await dialog.showSaveDialog({ title: '选择数据库存储位置', defaultPath: 'data.db', filters: [{ name: 'SQLite Database', extensions: ['db'] }] })
    if (result.canceled || !result.filePath) return null
    const { saveDb } = require('./services/database'); saveDb()
    const oldPath = settingsDao.getSetting('dbPath') || path.join(app.getPath('userData'), 'data.db')
    if (oldPath === result.filePath) return result.filePath
    if (fs.existsSync(oldPath)) { const dir = path.dirname(result.filePath); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.copyFileSync(oldPath, result.filePath) }
    closeDb(); await initDb(result.filePath); settingsDao.setSetting('dbPath', result.filePath)
    return result.filePath
  })
  ipcMain.handle('db:export', async () => {
    const result = await dialog.showSaveDialog({ title: '导出数据', defaultPath: `quickx-backup-${new Date().toISOString().slice(0,10)}.db`, filters: [{ name: 'SQLite Database', extensions: ['db'] }] })
    if (result.canceled || !result.filePath) return null
    const { getDb } = require('./services/database'); const data = getDb().export(); fs.writeFileSync(result.filePath, Buffer.from(data))
    return result.filePath
  })
  ipcMain.handle('db:import', async () => {
    const result = await dialog.showOpenDialog({ title: '导入数据', filters: [{ name: 'SQLite Database', extensions: ['db'] }], properties: ['openFile'] })
    if (result.canceled || !result.filePaths[0]) return null
    const importPath = result.filePaths[0]; if (fs.statSync(importPath).size > 50*1024*1024) return null
    const currentPath = settingsDao.getSetting('dbPath') || path.join(app.getPath('userData'), 'data.db')
    if (fs.existsSync(currentPath)) fs.copyFileSync(currentPath, currentPath + '.backup')
    closeDb(); fs.copyFileSync(importPath, currentPath); await initDb(currentPath)
    return currentPath
  })

  registerAllShortcuts(settingsDao.getSetting)
  startClipboardWatcher()
  warmUpMainWindow()
  warmUpTesseract()
  createTray()
  console.log('[QuickX] ready')

  autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true
  if (!isDev) autoUpdater.checkForUpdatesAndNotify()
})

app.on('window-all-closed', () => {})
app.on('before-quit', () => {
  isQuitting = true
  stopClipboardWatcher(); stopScreenshotWatcher()
  globalShortcut.unregisterAll(); closeDb()
  const { disposeWorker } = require('./services/ocr-service'); disposeWorker().catch(() => {})
})
app.on('activate', () => toggleSearchBar())
