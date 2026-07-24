import { useState, useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    quickx: {
      translateText: (q: string, from: string, to: string) => Promise<{ from: string; to: string; src: string; dst: string }[]>
      close: () => void
      minimize: () => void
    }
  }
}

const LANGS: { code: string; label: string }[] = [
  { code: 'auto', label: '自动检测' },
  { code: 'zh', label: '中文' },
  { code: 'en', label: '英文' },
  { code: 'jp', label: '日文' },
  { code: 'kor', label: '韩文' },
  { code: 'fra', label: '法文' },
  { code: 'de', label: '德文' },
  { code: 'ru', label: '俄文' },
]

export default function App() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [from, setFrom] = useState('auto')
  const [to, setTo] = useState('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const userChoseTo = useRef(false)
  // Prevent concurrent translate calls (Baidu free tier: 1 QPS)
  const translatingRef = useRef(false)

  // Focus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // When user picks from != auto, auto-set sensible to
  useEffect(() => {
    if (from !== 'auto' && !userChoseTo.current) {
      setTo(from === 'zh' ? 'en' : 'zh')
    }
  }, [from])

  /** Resolve actual source language for API call */
  const resolveFrom = useCallback((text: string, f: string) => {
    if (f !== 'auto') return f
    if (!text.trim()) return 'en'
    return /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/.test(text) ? 'zh' : 'en'
  }, [])

  const doTranslate = useCallback(async (text: string, f: string, t: string) => {
    if (!text.trim()) { setOutput(''); return }
    // Skip if already translating (rate limit guard)
    if (translatingRef.current) return
    const actualFrom = resolveFrom(text, f)
    translatingRef.current = true
    setLoading(true)
    setError('')
    try {
      const r = await window.quickx.translateText(text, actualFrom, t)
      setOutput(r.map((item) => item.dst).join('\n'))
    } catch (e) {
      setError((e as Error).message || '翻译失败')
    } finally {
      setLoading(false)
      translatingRef.current = false
    }
  }, [resolveFrom])

  /** Schedule translate with debounce (shared timer for input + lang switch) */
  const scheduleTranslate = useCallback((text: string, f: string, t: string) => {
    clearTimeout(timerRef.current)
    if (!text.trim()) { setOutput(''); return }
    timerRef.current = setTimeout(() => doTranslate(text, f, t), 700)
  }, [doTranslate])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)
    if (val.trim()) {
      scheduleTranslate(val, from, to)
    } else {
      clearTimeout(timerRef.current)
      setOutput('')
    }
  }

  const handleSwap = () => {
    if (from === 'auto') return
    const newFrom = to
    const newTo = from
    setFrom(newFrom)
    setTo(newTo)
    userChoseTo.current = true
    setInput(output)
    setOutput('')
    if (output) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => doTranslate(output, newFrom, newTo), 300)
    }
  }

  const handleFromChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFrom = e.target.value
    setFrom(newFrom)
    if (input) scheduleTranslate(input, newFrom, to)
  }

  const handleToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTo = e.target.value
    setTo(newTo)
    userChoseTo.current = true
    if (input) scheduleTranslate(input, from, newTo)
  }

  // Display label for status bar
  const displayFrom = from === 'auto' ? (input ? resolveFrom(input, from) : 'auto') : from

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface-border shrink-0 drag">
        <span className="text-xs font-semibold text-text-muted">QuickX 翻译</span>
        <div className="flex items-center gap-0.5 no-drag">
          <button onClick={() => window.quickx.close()}
            className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Language bar */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-surface-border shrink-0">
        <select
          value={from}
          onChange={handleFromChange}
          className="text-xs px-2 py-1 rounded border border-surface-border bg-surface-secondary text-text-primary outline-none focus:border-primary cursor-pointer"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <button
          onClick={handleSwap}
          disabled={from === 'auto'}
          className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-primary hover:bg-primary-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="交换语言"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        </button>

        <select
          value={to}
          onChange={handleToChange}
          className="text-xs px-2 py-1 rounded border border-surface-border bg-surface-secondary text-text-primary outline-none focus:border-primary cursor-pointer"
        >
          {LANGS.filter((l) => l.code !== 'auto').map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Main area: split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input */}
        <div className="flex-1 flex flex-col border-r border-surface-border">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            placeholder="输入要翻译的文字..."
            spellCheck={false}
            className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder-text-muted outline-none p-3 leading-relaxed"
          />
        </div>

        {/* Output */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-3">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                翻译中...
              </div>
            )}
            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}
            {!loading && !error && output && (
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{output}</p>
            )}
            {!loading && !error && !output && (
              <p className="text-xs text-text-muted italic">译文将显示在这里</p>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-surface-border shrink-0">
            <span className="text-[10px] text-text-muted">
              {displayFrom === 'auto' ? '自动检测' : LANGS.find((l) => l.code === displayFrom)?.label} → {LANGS.find((l) => l.code === to)?.label}
            </span>
            <div className="flex items-center gap-2">
              {output && (
                <button
                  onClick={handleCopy}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-border/50'
                  }`}
                >
                  {copied ? '已复制 ✓' : '复制译文'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
