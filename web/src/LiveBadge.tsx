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
    <p data-testid="live-badge" className="tc-live-badge" title={label}>
      <span className="tc-live-badge-label">{label}</span>
    </p>
  )
}
