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
        border: '1px solid #1c1917',
        color: '#1c1917',
        padding: '0 8px',
        fontWeight: 600,
      }}
    >
      LIVE — no scenario loaded
    </p>
  )
}
