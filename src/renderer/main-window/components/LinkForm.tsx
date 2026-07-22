import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  initial?: { id?: number; title?: string; url?: string; remark?: string; tags?: string[] }
  onClose: () => void
  onSave: (data: { title: string; url: string; remark: string; tags: string[] }) => void
}

type Protocol = 'https' | 'http'

export default function LinkForm({ open, initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [rawUrl, setRawUrl] = useState('')
  const [protocol, setProtocol] = useState<Protocol>('https')
  const [remark, setRemark] = useState('')
  const [tagsStr, setTagsStr] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setRemark(initial?.remark ?? '')
    setTagsStr((initial?.tags ?? []).join(', '))

    const u = initial?.url ?? ''
    // Detect existing protocol
    const match = u.match(/^(https?):\/\//i)
    if (match) {
      setProtocol(match[1].toLowerCase() as Protocol)
      setRawUrl(u.slice(match[0].length)) // strip protocol
    } else if (u.startsWith('//')) {
      setRawUrl(u.slice(2))
    } else {
      setRawUrl(u)
    }
  }, [open, initial])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !rawUrl.trim()) return

    let finalUrl = rawUrl.trim()
    // Auto-prepend protocol if missing
    if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(finalUrl) && !finalUrl.startsWith('//')) {
      finalUrl = `${protocol}://${finalUrl}`
    }

    onSave({
      title: title.trim(),
      url: finalUrl,
      remark: remark.trim(),
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-popover w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border">
          <h2 className="text-[15px] font-semibold text-text-primary">{initial?.id ? '编辑链接' : '新增链接'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <Field label="名称" required>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="链接名称" autoFocus />
          </Field>

          {/* URL field with protocol switcher */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-text-primary">
                网址<span className="text-text-muted ml-0.5">*</span>
              </label>
              <div className="flex items-center bg-surface-secondary rounded-md p-0.5 gap-0.5">
                {(['https', 'http'] as Protocol[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProtocol(p)}
                    className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors
                      ${protocol === p
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary'
                      }`}
                  >
                    {p}://
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={rawUrl}
              onChange={e => setRawUrl(e.target.value)}
              placeholder="example.com"
              className="w-full h-9 px-3 rounded-lg bg-surface-secondary border border-surface-border text-sm transition-colors focus:border-primary"
            />
          </div>

          <Field label="备注">
            <textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="备注说明..." rows={2} />
          </Field>

          <Field label="标签">
            <input type="text" value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="逗号分隔" />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 px-5 rounded-lg border border-surface-border text-sm text-text-secondary hover:bg-surface-secondary transition-colors">取消</button>
            <button type="submit" className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors">保存</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-text-primary mb-1.5">
        {label}{required && <span className="text-text-muted ml-0.5">*</span>}
      </label>
      <div className="[&>input]:w-full [&>input]:h-9 [&>input]:px-3 [&>input]:rounded-lg [&>input]:bg-surface-secondary [&>input]:border [&>input]:border-surface-border [&>input]:text-sm [&>input]:transition-colors [&>input]:focus:border-primary
                      [&>textarea]:w-full [&>textarea]:px-3 [&>textarea]:py-2 [&>textarea]:rounded-lg [&>textarea]:bg-surface-secondary [&>textarea]:border [&>textarea]:border-surface-border [&>textarea]:text-sm [&>textarea]:transition-colors [&>textarea]:focus:border-primary [&>textarea]:resize-none">
        {children}
      </div>
    </div>
  )
}
