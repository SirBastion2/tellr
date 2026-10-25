import { describe, expect, it } from 'vitest'
import { CUSTOMERS, SCRIPT_TARGETS_MS, scriptDurationMs } from './customers'
import { advanceSimulatedMs, formatElapsed, simulatedCapMs, timelineElapsedMs } from './clock'

describe('simulated customer time', () => {
  it('formats m:ss from milliseconds', () => {
    expect(formatElapsed(0)).toBe('0:00')
    expect(formatElapsed(4000)).toBe('0:04')
    expect(formatElapsed(15_000)).toBe('0:15')
    expect(formatElapsed(60_000)).toBe('1:00')
  })

  it('sums delayMs for timeline stamps and ignores speed', () => {
    const contractor = CUSTOMERS.find((item) => item.id === 'contractor-cash')
    if (!contractor) {
      throw new Error('missing contractor-cash')
    }
    expect(timelineElapsedMs(contractor.events, 1)).toBe(4000)
    expect(formatElapsed(timelineElapsedMs(contractor.events, 1))).toBe('0:04')
    expect(timelineElapsedMs(contractor.events, contractor.events.length)).toBe(60_000)
    expect(formatElapsed(timelineElapsedMs(contractor.events, contractor.events.length))).toBe('1:00')
    expect(simulatedCapMs(contractor.events, 0)).toBe(4000)
    expect(simulatedCapMs(contractor.events, contractor.events.length)).toBe(60_000)
  })

  it('keeps the clock on simulated time at 4× so it does not end at 0:15', () => {
    const contractor = CUSTOMERS.find((item) => item.id === 'contractor-cash')
    if (!contractor) {
      throw new Error('missing contractor-cash')
    }
    const target = SCRIPT_TARGETS_MS['contractor-cash']
    expect(target).toBe(60_000)
    expect(scriptDurationMs(contractor, 4)).toBe(15_000)
    const wallAt4x = scriptDurationMs(contractor, 4)
    expect(formatElapsed(wallAt4x)).toBe('0:15')
    const simulated = advanceSimulatedMs(0, wallAt4x, 4, simulatedCapMs(contractor.events, contractor.events.length))
    expect(simulated).toBe(60_000)
    expect(formatElapsed(simulated)).toBe(formatElapsed(timelineElapsedMs(contractor.events, contractor.events.length)))
    expect(formatElapsed(simulated)).toBe('1:00')
  })
})
