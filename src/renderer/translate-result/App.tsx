import { useState, useEffect } from 'react'

declare global {
  interface Window {
    quickx: {
      copyText: (text: string) => void
      close: () => void
      onResult: (cb: (data: { original: string; translated: string }) => void) => void
      requestTranslate: (text: string) => Promise<string>
    }
  }
}

type Status = 'loading' | 'ocr-done' | 'translating' | 'done' | 'error'

export default function App() {
  const [original, setOriginal] = useState('')
  const [translated, setTranslated] = useState('')
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'original' | 'translated' | null>(null)

  useEffect(() => {
    window.quickx.onResult((data) => {
      setOriginal(data.original)
      setTranslated(data.translated)
      // Determine status from the data
      if (!data.original && !data.translated) {
        setStatus('loading')
      } else if (data.translated && data.translated.startsWith('正在')) {
        // Main process sends status messages like "正在 OCR 识别..."
        setStatus('loading')
      } else if (data.original && !data.translated) {
        setStatus('ocr-done')
      } else if (data.original && data.translated) {
        setStatus('done')
      }
    })
  }, [])

  const handleTranslate = async () => {
    if (!original || original === '未识别到文字') return
    setStatus('translating')
    setError('')
    try {
      const result = await window.quickx.requestTranslate(original)
      setTranslated(result)
      setStatus('done')
    } catch (e) {
      setError((e as Error).message || '翻译失败')
      setStatus('ocr-done') // fall back so user can retry
    }
  }

  const handleCopy = (text: string, type: 'original' | 'translated') => {
    window.quickx.copyText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 1500)
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
        <span className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">正在 OCR 识别...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border shrink-0 drag">
        <span className="text-xs font-semibold text-text-muted">OCR 结果</span>
        <button onClick={() => window.quickx.close()}
          className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors no-drag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Original text */}
        {original && (
          <Section
            label="原文"
            text={original}
            copied={copied === 'original'}
            onCopy={() => handleCopy(original, 'original')}
          />
        )}

        {/* Translate button or loading */}
        {(status === 'ocr-done' || status === 'error') && original && original !== '未识别到文字' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleTranslate}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
            >
              翻译
            </button>
            {error && (
              <span className="text-xs text-red-500">{error}</span>
            )}
          </div>
        )}

        {status === 'translating' && (
          <div className="flex items-center gap-2 text-sm text-text-muted py-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            翻译中...
          </div>
        )}

        {/* Translated text */}
        {translated && status === 'done' && (
          <Section
            label="译文"
            text={translated}
            copied={copied === 'translated'}
            onCopy={() => handleCopy(translated, 'translated')}
            highlight
          />
        )}
      </div>
    </div>
  )
}

function Section({
  label, text, copied, onCopy, highlight,
}: {
  label: string; text: string; copied: boolean; onCopy: () => void; highlight?: boolean
}) {
  return (
    <div className={`rounded-lg border ${highlight ? 'border-primary/30 bg-primary-light/30' : 'border-surface-border bg-surface-secondary/50'} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${highlight ? 'text-primary' : 'text-text-muted'}`}>
          {label}
        </span>
        <button onClick={onCopy}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${
            copied ? 'bg-green-100 text-green-700' : 'text-text-muted hover:text-text-primary hover:bg-surface-border/50'
          }`}>
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${highlight ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
        {text}
      </p>
    </div>
  )
}
