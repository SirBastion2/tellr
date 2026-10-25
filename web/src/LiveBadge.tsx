import type { Mode } from './types'

export function LiveBadge({ mode }: { mode: Mode | null }) {
  if (mode !== 'live') {
    return null
  }
  return (
    <p
      data-testid="live-badge"
      style={{
        margin: 0,
        whiteSpace: 'nowrap',
        flex: '0 0 auto',
        border: '1px solid var(--tc-accent, #1c1917)',
        color: 'var(--tc-text, #1c1917)',
        backgroundColor: 'var(--tc-input, transparent)',
        borderRadius: '999px',
        padding: '0 12px',
        minHeight: '48px',
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
      }}
    >
      LIVE — no scenario loaded
    </p>
  )
}
