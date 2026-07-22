import { useState, useEffect, useCallback } from 'react'
import TitleBar from './components/TitleBar'
import LinksPage from './pages/LinksPage'
import NotesPage from './pages/NotesPage'
import SnippetsPage from './pages/SnippetsPage'
import ClipboardPage from './pages/ClipboardPage'
import SettingsPage from './pages/SettingsPage'

type Tab = 'links' | 'notes' | 'snippets' | 'clipboard' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'links', label: '链接' },
  { key: 'notes', label: '笔记' },
  { key: 'snippets', label: '代码' },
  { key: 'clipboard', label: '剪切板' },
  { key: 'settings', label: '设置' },
]

// Global toast
type ToastItem = { id: number; message: string }
let toastId = 0
let pushToast: ((msg: string) => void) | null = null
;(window as any).__toast = (msg: string) => pushToast?.(msg)

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('links')
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2000)
  }, [])

  useEffect(() => { pushToast = addToast; return () => { pushToast = null } }, [addToast])

  useEffect(() => {
    window.quickx.onNavigate((tab: string) => {
      if (TABS.some(t => t.key === tab)) setActiveTab(tab as Tab)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-surface">
      <TitleBar />

      <nav className="flex items-center h-11 px-5 bg-surface border-b border-surface-border shrink-0 gap-1">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`relative px-3.5 h-8 text-[13px] rounded transition-colors font-medium
              ${activeTab === tab.key ? 'text-text-primary bg-surface-secondary' : 'text-text-muted hover:text-text-secondary'}`}>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-hidden px-5 py-4">
        {activeTab === 'links' && <LinksPage />}
        {activeTab === 'notes' && <NotesPage />}
        {activeTab === 'snippets' && <SnippetsPage />}
        {activeTab === 'clipboard' && <ClipboardPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className="px-4 py-2 bg-[#1A1A2E] text-white text-sm rounded-lg shadow-lg animate-[toast-in_0.2s_ease-out]">
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
