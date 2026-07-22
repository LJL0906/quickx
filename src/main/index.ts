import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, clipboard, ipcMain, dialog } from 'electron'
import path from 'path'
import { initDb, closeDb } from './services/database'
import { autoUpdater } from 'electron-updater'
import { addTextEntry } from './services/clipboard-dao'
import { registerIpcHandlers } from './ipc/index'

// ── Window references ────────────────────────────────────
let searchBarWin: BrowserWindow | null = null
let mainWin: BrowserWindow | null = null
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
function createSearchBar(): BrowserWindow {
  const win = new BrowserWindow({
    width: 600,
    height: 56,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: getPreload('search-bar'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadURL(getRendererHtml('search-bar'))
  win.center()

  win.on('blur', () => {
    win.hide()
  })

  return win
}

// ── Main Window ──────────────────────────────────────────
function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    title: 'QuickX',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: getPreload('main-window'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadURL(getRendererHtml('main-window'))

  // Close = hide to tray instead of quitting
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  return win
}

// ── Toggle Search Bar ────────────────────────────────────
function toggleSearchBar(): void {
  if (!searchBarWin) {
    searchBarWin = createSearchBar()
    searchBarWin.on('ready-to-show', () => {
      searchBarWin?.show()
      searchBarWin?.center()
      searchBarWin?.focus()
      searchBarWin?.webContents.send('focus-input')
    })
    searchBarWin.on('closed', () => {
      searchBarWin = null
    })
  } else if (searchBarWin.isVisible()) {
    searchBarWin.hide()
  } else {
    searchBarWin.show()
    searchBarWin.center()
    searchBarWin.focus()
    searchBarWin.webContents.send('focus-input')
  }
}

// ── Show Main Window ─────────────────────────────────────
function showMainWindow(): void {
  if (!mainWin) {
    mainWin = createMainWindow()
    mainWin.on('ready-to-show', () => {
      mainWin?.show()
    })
    mainWin.on('closed', () => {
      mainWin = null
    })
  } else {
    mainWin.show()
    mainWin.focus()
  }
}

// ── Shortcut management ──────────────────────────────────
const DEFAULT_SHORTCUTS: Record<string, string> = {
  search: 'Alt+Q',
  links: 'Alt+`',
  notes: 'Alt+1',
  snippets: 'Alt+2',
  clipboard: 'Alt+3',
  settings: 'Alt+4',
}

type ShortcutAction = 'search' | 'links' | 'notes' | 'snippets' | 'clipboard' | 'settings'

const shortcutActions: Record<ShortcutAction, () => void> = {
  search: () => toggleSearchBar(),
  links: () => navigateTo('links'),
  notes: () => navigateTo('notes'),
  snippets: () => navigateTo('snippets'),
  clipboard: () => navigateTo('clipboard'),
  settings: () => navigateTo('settings'),
}

function navigateTo(tab: string) {
  if (mainWin && mainWin.isVisible()) {
    mainWin.hide()
  } else {
    showMainWindow()
    mainWin?.webContents.send('navigate', tab)
  }
}

function registerAllShortcuts(getSetting: (key: string) => string | undefined) {
  const raw = getSetting('shortcuts')
  const custom: Record<string, string> = raw ? JSON.parse(raw) : {}
  const shortcuts = { ...DEFAULT_SHORTCUTS, ...custom }

  for (const [action, key] of Object.entries(shortcuts)) {
    const handler = shortcutActions[action as ShortcutAction]
    if (handler) {
      const ok = globalShortcut.register(key, handler)
      console.log(`[QuickX] ${action} (${key}) registered:`, ok)
    }
  }
}
function warmUpMainWindow(): void {
  mainWin = createMainWindow()
  // Don't show — just keep it ready in background
  mainWin.on('closed', () => {
    mainWin = null
  })
}

// ── Tray ──────────────────────────────────────────────────
function createTray(): void {
  const iconPath = path.join(app.getAppPath(), 'assets', 'icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('QuickX')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主窗口',
      click: () => showMainWindow(),
    },
    {
      label: '检查更新',
      click: () => autoUpdater.checkForUpdatesAndNotify(),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => toggleSearchBar())
}

// ── Clipboard polling ────────────────────────────────────
let clipboardTimer: ReturnType<typeof setInterval> | null = null
let lastClipboardText = ''

function startClipboardWatcher(): void {
  lastClipboardText = clipboard.readText()

  clipboardTimer = setInterval(() => {
    const text = clipboard.readText()
    if (text && text !== lastClipboardText) {
      lastClipboardText = text
      addTextEntry(text, mainWin)
    }
  }, 1000)
}

function stopClipboardWatcher(): void {
  if (clipboardTimer) {
    clearInterval(clipboardTimer)
    clipboardTimer = null
  }
}

// ── App Lifecycle ─────────────────────────────────────────
let isQuitting = false

app.whenReady().then(async () => {
  const settingsDao = require("./services/settings-dao")
  const fs = require('fs')
  // Init database
  await initDb()
  console.log('[QuickX] database initialized')

  // Switch to custom DB path if configured
  const customPath = settingsDao.getSetting('dbPath')
  const defaultPath = path.join(app.getPath('userData'), 'data.db')
  if (customPath && customPath !== defaultPath && fs.existsSync(customPath)) {
    closeDb()
    await initDb(customPath)
    console.log('[QuickX] switched to custom DB:', customPath)
  }

  // Apply auto-start setting
  const autoStart = settingsDao.getSetting('autoStart')
  if (autoStart === 'true') {
    app.setLoginItemSettings({ openAtLogin: true })
    console.log('[QuickX] auto-start enabled')
  }

  // Register IPC handlers
  registerIpcHandlers(() => mainWin, showMainWindow)

  // Shortcut CRUD (needs access to registerAllShortcuts)
  ipcMain.handle('shortcuts:get', () => {
    try {
      const raw = settingsDao.getSetting('shortcuts')
      const custom = raw ? JSON.parse(raw) : {}
      return { ...DEFAULT_SHORTCUTS, ...custom }
    } catch {
      return { ...DEFAULT_SHORTCUTS }
    }
  })
  ipcMain.handle('shortcuts:set', (_e: any, action: string, key: string) => {
    const raw = settingsDao.getSetting('shortcuts')
    const custom: Record<string, string> = raw ? JSON.parse(raw) : {}
    custom[action] = key
    settingsDao.setSetting('shortcuts', JSON.stringify(custom))
    globalShortcut.unregisterAll()
    registerAllShortcuts(settingsDao.getSetting)
  })

  // Update check
  ipcMain.handle('app:check-update', () => {
    autoUpdater.checkForUpdatesAndNotify()
  })

  // Database management

  ipcMain.handle('db:getPath', () => {
    return settingsDao.getSetting('dbPath') || path.join(app.getPath('userData'), 'data.db')
  })

  ipcMain.handle('db:selectPath', async () => {
    const result = await dialog.showSaveDialog({
      title: '选择数据库存储位置',
      defaultPath: 'data.db',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    if (result.canceled || !result.filePath) return null

    const { saveDb } = require('./services/database')
    saveDb()
    const oldPath = settingsDao.getSetting('dbPath') || path.join(app.getPath('userData'), 'data.db')
    const newPath = result.filePath
    if (oldPath === newPath) return newPath

    // Copy old DB before closing
    if (fs.existsSync(oldPath)) {
      const newDir = path.dirname(newPath)
      if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true })
      fs.copyFileSync(oldPath, newPath)
    }

    // Close and reopen
    closeDb()
    await initDb(newPath)
    settingsDao.setSetting('dbPath', newPath)

    console.log('[QuickX] database moved to:', newPath)
    return newPath
  })

  ipcMain.handle('db:export', async () => {
    const result = await dialog.showSaveDialog({
      title: '导出数据',
      defaultPath: `quickx-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    if (result.canceled || !result.filePath) return null

    // Export directly from in-memory DB to target file
    const { getDb } = require('./services/database')
    const db = getDb()
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(result.filePath, buffer)

    console.log('[QuickX] exported to:', result.filePath, 'size:', buffer.length)
    return result.filePath
  })

  ipcMain.handle('db:import', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入数据',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return null

    const importPath = result.filePaths[0]
    const stat = fs.statSync(importPath)
    if (stat.size > 50 * 1024 * 1024) {
      console.error('[QuickX] import file too large:', stat.size)
      return null
    }

    const currentPath = settingsDao.getSetting('dbPath') || path.join(app.getPath('userData'), 'data.db')
    if (!fs.existsSync(importPath)) return null

    // Backup current
    if (fs.existsSync(currentPath)) {
      fs.copyFileSync(currentPath, currentPath + '.backup')
    }

    closeDb()
    fs.copyFileSync(importPath, currentPath)
    await initDb(currentPath)

    console.log('[QuickX] database imported')
    return currentPath
  })

  // Register global shortcut
  registerAllShortcuts(settingsDao.getSetting)

  // Start clipboard watcher
  startClipboardWatcher()

  // Pre-warm main window (hidden, ready to show instantly)
  warmUpMainWindow()

  // Create tray
  createTray()

  console.log('[QuickX] ready')

  // Auto updater (only in production)
  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify()
  }
})

app.on('window-all-closed', () => {
  // Don't quit — tray app
})

app.on('before-quit', () => {
  isQuitting = true
  stopClipboardWatcher()
  globalShortcut.unregisterAll()
  closeDb()
})

app.on('activate', () => {
  toggleSearchBar()
})
