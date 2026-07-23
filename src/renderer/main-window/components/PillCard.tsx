import { useState } from 'react'
import type { LinkRow } from '../../types'

interface Props {
  link: LinkRow
  onEdit: (link: LinkRow) => void
  onDelete: (id: number) => void
}

export default function PillCard({ link, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const tags: string[] = (() => {
    try { return JSON.parse(link.tags || '[]') } catch { return [] }
  })()

  return (
    <div
      className="relative bg-surface border border-surface-border rounded-lg p-3.5 cursor-pointer
                 hover:border-primary/30 hover:shadow-card transition-all duration-150"
      onClick={() => window.quickx.openLink(link.url)}
    >
      {/* Menu trigger — top-right corner */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors z-10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
          <div className="absolute top-8 right-0 z-30 bg-white rounded-lg shadow-popover border border-surface-border py-1 min-w-[110px] text-sm"
               onClick={(e) => e.stopPropagation()}>
            <button className="w-full text-left px-3 py-2 hover:bg-surface-secondary text-text-primary text-xs"
              onClick={() => { setMenuOpen(false); navigator.clipboard.writeText(link.url); (window as any).__toast?.('已复制网址') }}>
              复制网址
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-surface-secondary text-text-primary text-xs"
              onClick={() => { setMenuOpen(false); onEdit(link) }}>
              编辑
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-red-50 text-danger text-xs"
              onClick={() => { setMenuOpen(false); onDelete(link.id) }}>
              删除
            </button>
          </div>
        </>
      )}

      <div className="flex items-start gap-3 pr-6">
        <div className="w-9 h-9 rounded-md bg-surface-secondary flex items-center justify-center text-base shrink-0">
          🔗
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-[13px] text-text-primary leading-snug">{link.title}</h3>
          <p className="text-xs text-text-muted mt-0.5 break-all leading-relaxed">{link.url}</p>
          {link.remark && (
            <p className="text-xs text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">{link.remark}</p>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {tags.map((tag, i) => (
            <span key={i} className="text-[11px] text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
