import type { Mode } from './types'

export function LiveBadge({ mode }: { mode: Mode | null }) {
  if (mode !== 'live') {
    return null
  }
  return (
    <p data-testid="live-badge" className="border border-stone-900 px-2 py-1 text-sm font-semibold">
      LIVE — no scenario loaded
    </p>
  )
}
