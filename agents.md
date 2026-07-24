# QuickX — AGENTS.md

## Project Identity

QuickX is a Windows desktop productivity tool built with Electron + React + TypeScript.
It provides quick search, translation, screenshot OCR, note-taking, code snippets, and clipboard management.

## Build & Run

```bash
npm run dev       # Development (concurrently: esbuild watch + vite dev + electron)
npm run build     # Production build (esbuild main + vite renderer)
npm run start     # Launch with Electron
npm run bs        # Build + Start
npm run release   # Build + Package (NSIS) + Publish to GitHub
```

## Architecture

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # App entry, window management, shortcuts, IPC
│   ├── ipc/index.ts         # IPC handlers (CRUD, translate, settings)
│   └── services/            # Data & API layer
│       ├── database.ts      # sql.js init/migration
│       ├── db-helpers.ts    # SQL query helpers
│       ├── *-dao.ts         # Data access objects (links, notes, snippets, clipboard, settings)
│       ├── translate-service.ts  # Baidu Translate API
│       ├── ocr-service.ts        # Baidu OCR API
│       └── screenshot.ts         # Screenshot save/cleanup
├── preload/                 # contextBridge APIs
│   ├── search-bar.ts        # API for search bar window
│   ├── main-window.ts       # API for main window (CRUD, settings, restart)
│   ├── translate-input.ts   # API for translate input window
│   └── translate-result.ts  # API for OCR/translate result window
└── renderer/                # React frontend
    ├── search-bar/          # Alt+Q search float (links + Baidu search)
    ├── main-window/         # Tabbed main window (Links/Notes/Snippets/Clipboard/Settings)
    ├── translate-input/     # Alt+E translate window (left input, right output)
    └── translate-result/    # OCR result window (original + translate button)
```

## Key Conventions

- **IPC pattern**: Renderer → preload (contextBridge) → ipcMain.handle/on → DAO/Service
- **No frontend router**: Tab switching is React state-driven
- **Database**: sql.js (SQLite compiled to WASM), in-memory with periodic disk flush
- **Build**: esbuild for main+preload (bundled CJS), Vite for renderer (multi-page)
- **Package**: electron-builder → NSIS installer → GitHub Release auto-update

## Active Skills

- `electron-dev` — Electron desktop app development
- `react-ui` — React component development
- `karpathy` — Andrej Karpathy coding style (minimal, elegant, well-commented)
