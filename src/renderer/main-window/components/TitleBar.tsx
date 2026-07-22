export default function TitleBar() {
  return (
    <div
      className="flex items-center h-9 bg-surface-secondary border-b border-surface-border select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' as any }}
    >
      <div className="flex-1 pl-4 text-xs text-text-muted font-medium tracking-wide">QuickX</div>

      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' as any }}>
        <button
          onClick={() => window.quickx.minimize()}
          className="w-10 h-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-border/50 transition-colors"
        >
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" rx="0.5" fill="currentColor" /></svg>
        </button>
        <button
          onClick={() => window.quickx.maximize()}
          className="w-10 h-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-border/50 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
        <button
          onClick={() => window.quickx.close()}
          className="w-10 h-full flex items-center justify-center text-text-muted hover:text-white hover:bg-danger transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  )
}
