import { useState, useEffect, useCallback } from 'react'
import type { ClipboardRow } from '../../types'

export default function ClipboardPage() {
  const [items, setItems] = useState<ClipboardRow[]>([])
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    try { setItems((await window.quickx.getClipboardHistory(200, 0)) as ClipboardRow[]) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  // Real-time update from main process
  useEffect(() => {
    window.quickx.onClipboardUpdated(() => load())
  }, [load])

  const clear = async () => {
    if (!confirm('确定清空所有剪切板历史？')) return
    await window.quickx.clearClipboardHistory();(window as any).__toast('剪切板已清空');setItems([])
  }

  const filtered = search.trim()
    ? items.filter(i => i.content.toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索剪切板历史..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-surface-secondary border border-surface-border text-sm focus:border-primary transition-colors" />
        </div>
        <button onClick={clear} className="h-8 px-3 text-xs text-text-muted border border-surface-border rounded-lg hover:bg-surface-secondary transition-colors shrink-0">清空</button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2">
          <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center text-xl">📋</div>
          <p className="text-sm">暂无剪切板历史</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-1.5">
          {filtered.map(item => (
            <div key={item.id} onClick={() => { window.quickx.copyToClipboard(item.content);(window as any).__toast('已复制到剪切板') }}
              className="group p-3 rounded-lg border border-surface-border cursor-pointer hover:border-primary/30 hover:bg-surface-secondary/50 transition-all duration-150">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary whitespace-pre-wrap line-clamp-3 leading-relaxed">{item.content}</p>
                  <span className="text-xs text-text-muted mt-1.5 block">{item.copied_at?.replace('T',' ').slice(0,19)}</span>
                </div>
                <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0">复制</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
