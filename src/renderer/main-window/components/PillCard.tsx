import type { LinkRow } from '../../types'

interface Props {
  link: LinkRow
  onEdit: (link: LinkRow) => void
  onDelete: (id: number) => void
}

export default function PillCard({ link, onEdit, onDelete }: Props) {
  const tags: string[] = (() => {
    try { return JSON.parse(link.tags || '[]') } catch { return [] }
  })()

  const action = (e: React.MouseEvent, fn: () => void) => {
    e.stopPropagation()
    fn()
  }

  return (
    <div
      className="group bg-surface border border-surface-border rounded-lg p-3.5 cursor-pointer
                 hover:border-primary/30 hover:shadow-card transition-all duration-150"
      onClick={() => window.quickx.openLink(link.url)}
    >
      <div className="flex items-start gap-3">
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

      {/* Tags + actions row */}
      <div className="flex items-end justify-between mt-2.5">
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, i) => (
            <span key={i} className="text-[11px] text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded">{tag}</span>
          ))}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
          <button onClick={(e) => action(e, () => navigator.clipboard.writeText(link.url))}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-primary transition-colors" title="复制网址">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button onClick={(e) => action(e, () => onEdit(link))}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-primary transition-colors" title="编辑">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={(e) => action(e, () => onDelete(link.id))}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-danger transition-colors" title="删除">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
