import { useState, useEffect } from 'react'

const LABELS: Record<string, string> = {
  search: '搜索浮窗', links: '链接管理', notes: '笔记',
  snippets: '代码片段', clipboard: '剪切板', settings: '设置',
  screenshotTranslate: '截图翻译', translateInput: '输入翻译',
}

export default function SettingsPage() {
  const [autoStart, setAutoStart] = useState(false)
  const [clipboardEnabled, setClipboardEnabled] = useState(true)
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({})
  const [recording, setRecording] = useState<string | null>(null)
  const [dbPath, setDbPath] = useState('')
  const [appVersion, setAppVersion] = useState('')

  // Translation API config
  const [baiduAppId, setBaiduAppId] = useState('')
  const [baiduSecretKey, setBaiduSecretKey] = useState('')

  // OCR API config
  const [ocrApiKey, setOcrApiKey] = useState('')
  const [ocrSecretKey, setOcrSecretKey] = useState('')

  // Window size
  const [mainWinWidth, setMainWinWidth] = useState(1200)
  const [mainWinHeight, setMainWinHeight] = useState(900)

  useEffect(() => {
    (async () => {
      try {
        setAutoStart((await window.quickx.getSetting('autoStart')) === 'true')
        setClipboardEnabled((await window.quickx.getSetting('clipboardEnabled')) !== 'false')
        setShortcuts(await window.quickx.getShortcuts())
        setDbPath(await window.quickx.getDbPath())
        // Translation config
        setBaiduAppId((await window.quickx.getSetting('baiduAppId')) as string || '')
        setBaiduSecretKey((await window.quickx.getSetting('baiduSecretKey')) as string || '')
        // OCR config
        setOcrApiKey((await window.quickx.getSetting('ocrApiKey')) as string || '')
        setOcrSecretKey((await window.quickx.getSetting('ocrSecretKey')) as string || '')
        // Window size
        const w = await window.quickx.getSetting('mainWinWidth')
        const h = await window.quickx.getSetting('mainWinHeight')
        if (w) setMainWinWidth(Number(w))
        if (h) setMainWinHeight(Number(h))
        setAppVersion(await window.quickx.getAppVersion())
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!recording) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation()
      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      if (e.metaKey) parts.push('Meta')
      if (['Control','Alt','Shift','Meta'].includes(e.key)) return
      let key = e.key
      if (key.length === 1) key = key.toUpperCase()
      if (key === ' ') key = 'Space'
      parts.push(key)
      const combo = parts.join('+')
      setShortcuts(prev => ({ ...prev, [recording]: combo }))
      window.quickx.setShortcut(recording, combo)
      setRecording(null)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [recording])

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-xl mx-auto py-2 space-y-8">
        {/* Shortcuts */}
        <Group title="快捷键">
          {Object.entries(shortcuts).map(([action, key]) => (
            <Row key={action} label={LABELS[action] || action}>
              <button
                onClick={() => setRecording(recording === action ? null : action)}
                className={`px-3 py-1 text-xs font-mono rounded-md border transition-colors min-w-[90px] text-center
                  ${recording === action ? 'border-primary bg-primary-light text-primary' : 'border-surface-border text-text-secondary hover:border-primary/30'}`}>
                {recording === action ? '按下新键...' : key}
              </button>
            </Row>
          ))}
        </Group>

        {/* General */}
        <Group title="常规">
          <Row label="开机自启动" desc="系统启动时自动运行 QuickX">
            <Toggle value={autoStart} onChange={async (v) => { setAutoStart(v); await window.quickx.setSetting('autoStart', String(v)) }} />
          </Row>
          <Row label="窗口宽度" desc="主窗口默认宽度（像素）">
            <input type="number" value={mainWinWidth} onChange={(e) => setMainWinWidth(Number(e.target.value))}
              onBlur={() => window.quickx.setSetting('mainWinWidth', String(mainWinWidth))}
              className="text-xs px-2 py-1 rounded border border-surface-border bg-surface-secondary w-20 outline-none focus:border-primary" />
          </Row>
          <Row label="窗口高度" desc="主窗口默认高度（像素）">
            <input type="number" value={mainWinHeight} onChange={(e) => setMainWinHeight(Number(e.target.value))}
              onBlur={() => window.quickx.setSetting('mainWinHeight', String(mainWinHeight))}
              className="text-xs px-2 py-1 rounded border border-surface-border bg-surface-secondary w-20 outline-none focus:border-primary" />
          </Row>
          <Row label="重新启动" desc="修改窗口尺寸后需重启生效">
            <button onClick={async () => {
              if (!confirm('确定重新启动 QuickX？')) return
              await window.quickx.restartApp()
            }}
              className="text-xs px-3 py-1 rounded border border-primary/30 text-primary hover:bg-primary-light transition-colors font-medium">
              重新启动
            </button>
          </Row>
        </Group>

        {/* Clipboard */}
        <Group title="剪切板">
          <Row label="启用监听" desc="自动记录复制到剪切板的文本内容">
            <Toggle value={clipboardEnabled} onChange={async (v) => { setClipboardEnabled(v); await window.quickx.setSetting('clipboardEnabled', String(v)) }} />
          </Row>
          <Row label="历史上限">
            <span className="text-sm text-text-muted">200 条</span>
          </Row>
        </Group>

        {/* Translate: Baidu */}
        <Group title="翻译 API — 百度翻译">
          <Row label="APP ID" desc="百度翻译开放平台申请的 APP ID">
            <input type="password" value={baiduAppId} onChange={(e) => setBaiduAppId(e.target.value)}
              onBlur={() => window.quickx.setSetting('baiduAppId', baiduAppId)}
              placeholder="输入 APP ID" className="text-xs px-2 py-1 rounded border border-surface-border bg-surface-secondary w-40 outline-none focus:border-primary" />
          </Row>
          <Row label="密钥" desc="百度翻译开放平台申请的密钥">
            <input type="password" value={baiduSecretKey} onChange={(e) => setBaiduSecretKey(e.target.value)}
              onBlur={() => window.quickx.setSetting('baiduSecretKey', baiduSecretKey)}
              placeholder="输入密钥" className="text-xs px-2 py-1 rounded border border-surface-border bg-surface-secondary w-40 outline-none focus:border-primary" />
          </Row>
        </Group>

        {/* OCR — 百度 OCR */}
        <Group title="翻译 API — 截图 OCR">
          <Row label="API Key" desc="百度 AI 开放平台 OCR 应用的 API Key">
            <input type="password" value={ocrApiKey} onChange={(e) => setOcrApiKey(e.target.value)}
              onBlur={() => window.quickx.setSetting('ocrApiKey', ocrApiKey)}
              placeholder="输入 API Key" className="text-xs px-2 py-1 rounded border border-surface-border bg-surface-secondary w-40 outline-none focus:border-primary" />
          </Row>
          <Row label="Secret Key" desc="百度 AI 开放平台 OCR 应用的 Secret Key">
            <input type="password" value={ocrSecretKey} onChange={(e) => setOcrSecretKey(e.target.value)}
              onBlur={() => window.quickx.setSetting('ocrSecretKey', ocrSecretKey)}
              placeholder="输入 Secret Key" className="text-xs px-2 py-1 rounded border border-surface-border bg-surface-secondary w-40 outline-none focus:border-primary" />
          </Row>
          <Row label="免费额度" desc="通用文字识别，每天免费 500 次">
            <span className="text-xs text-green-600 font-medium">500 次/天</span>
          </Row>
        </Group>

        {/* Data */}
        <Group title="数据">
          <Row label="存储位置" desc={dbPath || '默认位置'}>
            <button onClick={async () => { const p = await window.quickx.selectDbPath(); if (p) setDbPath(p) }}
              className="text-xs text-primary hover:text-primary-hover transition-colors font-medium">更改</button>
          </Row>
          <Row label="导出备份" desc="导出全部数据为 .db 文件">
            <button onClick={async () => { const p = await window.quickx.exportDb(); if (p) (window as any).__toast('已导出') }}
              className="text-xs text-primary hover:text-primary-hover transition-colors font-medium">导出</button>
          </Row>
          <Row label="导入恢复" desc="从 .db 备份文件恢复数据">
            <button onClick={async () => {
              if (!confirm('导入将替换当前所有数据，确定继续？')) return
              const p = await window.quickx.importDb()
              if (p) { (window as any).__toast('已导入'); window.location.reload() }
            }} className="text-xs text-primary hover:text-primary-hover transition-colors font-medium">导入</button>
          </Row>
        </Group>

        {/* About */}
        <Group title="关于">
          <Row label="版本"><span className="text-sm text-text-muted">v{appVersion || '...'}</span></Row>
          <Row label="作者"><span className="text-sm text-text-muted">LJL</span></Row>
          <Row label="更新">
            <button onClick={async () => {
              (window as any).__toast('正在检查更新...')
              const r = await window.quickx.checkUpdate()
              if (r.error) (window as any).__toast('检查失败，请稍后重试')
              else if (r.available) (window as any).__toast('发现新版本 ' + r.version)
              else (window as any).__toast('已是最新版本')
            }}
              className="text-xs text-primary hover:text-primary-hover transition-colors font-medium">检查更新</button>
          </Row>
        </Group>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 ml-1">{title}</h3>
      <div className="border border-surface-border rounded-lg divide-y divide-surface-border">{children}</div>
    </section>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="mr-6 min-w-0">
        <span className="text-[13px] text-text-primary">{label}</span>
        {desc && <p className="text-[11px] text-text-muted mt-0.5 truncate">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors border
        ${value ? 'bg-primary border-primary' : 'bg-gray-200 border-gray-300'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full shadow transition-transform
        ${value ? 'translate-x-[18px] bg-white' : 'translate-x-[2px] bg-white'}`} />
    </button>
  )
}
