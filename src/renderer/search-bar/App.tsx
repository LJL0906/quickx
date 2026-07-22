import { useState, useRef, useEffect, useCallback } from 'react'

declare global {
  interface Window {
    quickx: {
      searchLinks: (keyword: string) => Promise<{ id: number; title: string; url: string; remark: string }[]>
      openLink: (url: string) => Promise<void>
      openMainWindow: () => void
      hide: () => void
      onFocusInput: (cb: () => void) => void
      resizeSearchBar: (height: number) => void
    }
  }
}

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: number; title: string; url: string; remark: string }[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        window.quickx.resizeSearchBar(containerRef.current.getBoundingClientRect().height)
      }
    })
  }, [results, query])

  useEffect(() => {
    window.quickx.onFocusInput(() => {
      setQuery(''); setResults([]); setSelectedIndex(0)
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 50)
    })
  }, [])

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) { setResults([]); return }
    try { setResults(await window.quickx.searchLinks(keyword)); setSelectedIndex(0) } catch { setResults([]) }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; setQuery(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 150)
  }

  const hasBaidu = query.trim().length > 0
  const totalOptions = results.length + (hasBaidu ? 1 : 0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setSelectedIndex(i => totalOptions > 0 ? Math.min(i + 1, totalOptions - 1) : 0); break
      case 'ArrowUp': e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); break
      case 'Enter':
        e.preventDefault()
        if (!query.trim()) return
        if (results.length > 0 && selectedIndex < results.length) window.quickx.openLink(results[selectedIndex].url)
        else if (hasBaidu) window.quickx.openLink(`https://www.baidu.com/s?wd=${encodeURIComponent(query.trim())}`)
        break
      case 'Escape': window.quickx.hide(); break
    }
  }

  return (
    <div
      ref={containerRef}
      className={`bg-surface border border-[#D4D4DC] overflow-hidden transition-shadow duration-200
        ${totalOptions > 0
          ? 'shadow-[0_2px_6px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.16)]'
          : 'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.08)]'
        }`}>
      <div className="flex items-center h-14 px-1">
        <div className="pl-3 pr-2 text-text-muted">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <input
          ref={inputRef} type="text" value={query} onChange={handleInput} onKeyDown={handleKeyDown}
          placeholder="搜索链接..." spellCheck={false}
          className="flex-1 h-14 bg-transparent text-[15px] text-text-primary placeholder-text-muted outline-none"
        />
        <button onClick={() => window.quickx.openMainWindow()}
          className="w-9 h-9 flex items-center justify-center rounded-md text-text-muted hover:text-primary hover:bg-primary-light transition-colors mr-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </button>
      </div>

      {totalOptions > 0 && (
        <div className="border-t border-surface-border">
          {results.map((item, i) => (
            <div key={item.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-surface-border last:border-b-0 transition-colors
                ${i === selectedIndex ? 'bg-primary-light' : 'hover:bg-surface-secondary'}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => window.quickx.openLink(item.url)}>
              <span className="text-sm shrink-0 opacity-50">📎</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">{item.title}</div>
                <div className="text-xs text-text-muted truncate mt-0.5">{item.url}</div>
              </div>
            </div>
          ))}

          {hasBaidu && (
            <div
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                ${selectedIndex === results.length ? 'bg-primary-light' : 'hover:bg-surface-secondary'}`}
              onMouseEnter={() => setSelectedIndex(results.length)}
              onClick={() => window.quickx.openLink(`https://www.baidu.com/s?wd=${encodeURIComponent(query.trim())}`)}>
              <span className="text-sm shrink-0 opacity-50">🌐</span>
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">百度搜索 "<span className="font-medium">{query.trim()}</span>"</div>
                <div className="text-xs text-text-muted mt-0.5">在浏览器中打开百度搜索</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
