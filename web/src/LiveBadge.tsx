import type { Mode } from './types'

export function liveBadgeText(mode: Mode | null, simulationTitle: string | null): string | null {
  if (simulationTitle) {
    return `Simulation: ${simulationTitle}`
  }
  if (mode === 'live') {
    return 'LIVE — no scenario loaded'
  }
  return null
}

export function LiveBadge({ mode, simulationTitle = null }: { mode: Mode | null; simulationTitle?: string | null }) {
  const label = liveBadgeText(mode, simulationTitle)
  if (!label) {
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
        backgroundColor: 'var(--tc-glass-fallback, transparent)',
        borderRadius: '999px',
        padding: '0 12px',
        minHeight: '32px',
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
        fontSize: '0.875rem',
      }}
    >
      {label}
    </p>
  )
}
