export type DelaySource = { readonly delayMs: number }

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** Simulated customer time after `count` events: the sum of their `delayMs`. */
export function timelineElapsedMs(events: readonly DelaySource[], count: number): number {
  const n = Math.max(0, Math.min(count, events.length))
  let sum = 0
  for (let i = 0; i < n; i += 1) {
    sum += events[i]?.delayMs ?? 0
  }
  return sum
}

/** Cap the ticking clock at the next beat, or at the script total when finished. */
export function simulatedCapMs(events: readonly DelaySource[], fired: number): number {
  if (fired >= events.length) {
    return timelineElapsedMs(events, events.length)
  }
  return timelineElapsedMs(events, fired + 1)
}

/** Convert a wall-clock slice into simulated customer time. Speed 4× advances four times as fast. */
export function advanceSimulatedMs(
  current: number,
  wallDeltaMs: number,
  speed: number,
  capMs: number,
): number {
  const next = current + Math.max(0, wallDeltaMs) * Math.max(0, speed)
  return Math.min(capMs, Math.max(0, next))
}
