import { useState, useEffect, useCallback, useRef } from 'react'
import { marked } from 'marked'
import type { NoteRow } from '../../types'

marked.setOptions({ breaks: true })

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [dirty, setDirty] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try { setNotes((await window.quickx.getNotes()) as NoteRow[]) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  // Auto-select first note on load
  useEffect(() => {
    if (notes.length > 0 && selectedId === null) {
      setSelectedId(notes[0].id)
    }
  }, [notes])

  const selected = notes.find(n => n.id === selectedId) || null

  // Load note content when selection changes
  useEffect(() => {
    if (selected) {
      setTitle(selected.title)
      setContent(selected.content || '')
      setTagsStr((() => { try { return JSON.parse(selected.tags || '[]') } catch { return [] } })().join(', '))
    }
    setDirty(false)
  }, [selectedId])

  // Auto-save before switching if dirty
  const selectNote = async (id: number | null) => {
    if (dirty && selectedId && title.trim()) {
      await doSave()
    }
    setSelectedId(id)
    setTimeout(() => titleRef.current?.focus(), 0)
  }

  const doSave = async () => {
    if (!title.trim()) return
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean)
    if (selectedId) {
      await window.quickx.updateNote(selectedId, { title, content, tags })
    } else {
      const created = await window.quickx.createNote({ title, content, tags });(window as any).__toast('笔记已保存')
      setSelectedId((created as NoteRow).id)
    }
    setDirty(false)
    await load()
  }

  const remove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('确定删除？')) return
    await window.quickx.deleteNote(id)
    if (selectedId === id) { setSelectedId(null); setTitle(''); setContent(''); setTagsStr('') }
    load()
  }

  const createNew = () => {
    if (dirty && selectedId && title.trim()) doSave()
    setSelectedId(null); setTitle(''); setContent(''); setTagsStr('')
    setDirty(false); setViewMode('edit')
    setTimeout(() => titleRef.current?.focus(), 0)
  }

  const strip = (md: string) => {
    const html = marked.parse(md) as string
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      doSave()
    }
  }

  const filtered = search.trim()
    ? notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        strip(n.content || '').toLowerCase().includes(search.toLowerCase())
      )
    : notes

  const html = content ? (marked.parse(content) as string) : ''

  return (
    <div className="flex h-full -mx-5 -my-4" onKeyDown={handleKeyDown}>
      {/* ── Left panel ──────────────────────────────── */}
      <div className="w-56 shrink-0 border-r border-surface-border flex flex-col">
        <div className="px-3 py-2.5 space-y-2 border-b border-surface-border">
          <button onClick={createNew} className="w-full h-7 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
            新建笔记
          </button>
          <div className="relative">
            <svg className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索笔记..."
              className="w-full h-7 pl-7 pr-2 rounded-md bg-surface-secondary border border-transparent text-xs focus:border-primary focus:bg-surface transition-colors outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-text-muted mt-8">暂无笔记</p>
          ) : (
            filtered.map(n => {
              const active = n.id === selectedId
              return (
                <div
                  key={n.id}
                  onClick={() => selectNote(n.id)}
                  className={`group relative px-3 py-2 cursor-pointer border-b border-surface-border/60 transition-colors
                    ${active ? 'bg-primary-light border-l-primary' : 'border-l-transparent hover:bg-surface-secondary/50'} border-l-[3px] pl-[9px]`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <h4 className={`text-[12px] leading-snug truncate font-medium ${active ? 'text-primary' : 'text-text-primary'}`}>
                      {n.title || '未命名'}
                    </h4>
                    <button
                      onClick={e => remove(e, n.id)}
                      className="w-4 h-4 flex items-center justify-center rounded text-text-muted/60 hover:text-danger opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                  {n.content && (
                    <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1 leading-relaxed">{strip(n.content).slice(0, 80)}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-border shrink-0">
          <div className="flex items-center bg-surface-secondary rounded-md p-0.5 gap-0.5 shrink-0">
            {(['edit', 'preview'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors
                  ${viewMode === m ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {m === 'edit' ? '编辑' : '预览'}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          {dirty && (
            <button onClick={doSave} className="h-7 px-3 bg-primary text-white text-[11px] font-medium rounded-md hover:bg-primary-hover transition-colors">
              保存
            </button>
          )}
        </div>

        {/* Title */}
        <div className="px-4 pt-4 pb-3 border-b border-surface-border">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setDirty(true) }}
            placeholder="笔记标题"
            className="w-full text-lg font-bold bg-transparent text-text-primary placeholder-text-muted/40 outline-none focus:ring-0 focus:shadow-none"
          />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'edit' ? (
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); setDirty(true) }}
              onKeyDown={e => {
                if (e.key === 'Tab') { e.preventDefault(); const s = e.currentTarget; const v = s.value; const p = s.selectionStart; s.value = v.slice(0, p) + '  ' + v.slice(s.selectionEnd); s.selectionStart = s.selectionEnd = p + 2; setContent(s.value); setDirty(true) }
              }}
              placeholder="开始写作..."
              spellCheck={false}
              className="w-full h-full px-4 py-2 bg-transparent text-sm font-mono focus:outline-none resize-none leading-relaxed text-text-primary placeholder-text-muted"
            />
          ) : (
            <div
              className="w-full h-full overflow-auto px-4 py-2 text-sm leading-relaxed
                         prose prose-slate prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html || '<p class="text-text-muted text-sm">暂无内容</p>' }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-surface-border shrink-0">
          <input
            type="text"
            value={tagsStr}
            onChange={e => { setTagsStr(e.target.value); setDirty(true) }}
            placeholder="添加标签..."
            className="flex-1 text-xs text-text-secondary bg-transparent outline-none placeholder-text-muted"
          />
          <span className="text-[10px] text-text-muted/70">{dirty ? '未保存' : '已保存'}</span>
        </div>
      </div>
    </div>
  )
}
