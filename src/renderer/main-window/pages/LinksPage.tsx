import { useState, useEffect, useCallback } from 'react'
import PillCard from '../components/PillCard'
import LinkForm from '../components/LinkForm'
import type { LinkRow } from '../../types'

export default function LinksPage() {
  const [links, setLinks] = useState<LinkRow[]>([])
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LinkRow | null>(null)

  const load = useCallback(async () => { try { setLinks((await window.quickx.getLinks()) as LinkRow[]) } catch {} }, [])
  useEffect(() => { load() }, [load])

  const handleSave = async (data: { title: string; url: string; remark: string; tags: string[] }) => {
    if (editing) { await window.quickx.updateLink(editing.id, data);(window as any).__toast('链接已更新') }
    else { await window.quickx.createLink(data);(window as any).__toast('链接已创建') }
    setFormOpen(false); setEditing(null); load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return; await window.quickx.deleteLink(id);(window as any).__toast('链接已删除');load()
  }

  const filtered = search.trim()
    ? links.filter(l => l.title.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase()) || (l.remark || '').toLowerCase().includes(search.toLowerCase()))
    : links

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => { setEditing(null); setFormOpen(true) }}
          className="h-8 px-3 bg-primary text-white text-[13px] font-medium rounded-lg hover:bg-primary-hover transition-colors shrink-0">+ 新增</button>

        <div className="flex-1 relative">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索链接..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-surface-secondary border border-surface-border text-sm transition-colors focus:border-primary" />
        </div>

        <span className="text-xs text-text-muted shrink-0">{filtered.length} 条</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2">
          <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center text-xl">🔗</div>
          <p className="text-sm">{search ? '没有匹配结果' : '还没有链接，点击上方按钮添加'}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
            {filtered.map(link => (
              <PillCard key={link.id} link={link} onEdit={(l) => {
                const tags = (() => { try { return JSON.parse(l.tags || '[]') } catch { return [] } })()
                setEditing({ ...l, tags: JSON.stringify(tags) } as LinkRow); setFormOpen(true)
              }} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      <LinkForm open={formOpen} initial={editing ? {
        id: editing.id, title: editing.title, url: editing.url, remark: editing.remark || '',
        tags: (() => { try { return JSON.parse(editing.tags || '[]') } catch { return [] } })(),
      } : undefined} onClose={() => { setFormOpen(false); setEditing(null) }} onSave={handleSave} />
    </div>
  )
}
