import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalClock } from './LocalClock'
import {
  formatLocalDateTime,
  formatOffsetIso,
  formatTimeOfDay,
  parseTimestamp,
} from './localTime'
import { activityTime } from './plain'

describe('local time of day', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("UTC 05:17 on a UTC-4 client renders 1:17", () => {
    const utc = new Date('2026-10-25T05:17:00.000Z')
    expect(formatTimeOfDay(utc, 'America/New_York')).toBe('1:17 AM')
    expect(formatTimeOfDay(utc, 'America/New_York')).not.toMatch(/5:17/)

    render(<LocalClock now={utc} timeZone="America/New_York" />)
    expect(screen.getByTestId('local-clock').textContent).toBe('1:17 AM')
    expect(screen.getByTestId('local-clock').textContent).not.toMatch(/5:17/)
    expect(activityTime('2026-10-25T05:17:00Z', 'America/New_York')).toMatch(/1:17/)
    expect(activityTime('2026-10-25T05:17:00Z', 'America/New_York')).not.toMatch(/UTC/)
  })

  it('treats a naive API timestamp as UTC so Eastern still shows 1:17', () => {
    const date = parseTimestamp('2026-10-25T05:17:00')
    expect(date.toISOString()).toBe('2026-10-25T05:17:00.000Z')
    expect(formatTimeOfDay(date, 'America/New_York')).toBe('1:17 AM')
    expect(formatLocalDateTime('2026-10-25T05:17:00', 'America/New_York')).toMatch(/1:17/)
    expect(formatLocalDateTime('2026-10-25T05:17:00Z', 'America/New_York')).toMatch(/1:17/)
    expect(formatLocalDateTime('2026-10-25T01:17:00-04:00', 'America/New_York')).toMatch(/1:17/)
  })

  it('emits an ISO timestamp with the client offset, not a naive UTC string', () => {
    const utc = new Date('2026-10-25T05:17:00.000Z')
    const iso = formatOffsetIso(utc)
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
    expect(iso).not.toBe('2026-10-25T05:17:00')
    expect(parseTimestamp(iso).getTime()).toBe(utc.getTime())
  })

  it('ticks the live clock on the next minute', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-25T05:17:30.000Z'))
    render(<LocalClock timeZone="America/New_York" />)
    expect(screen.getByTestId('local-clock').textContent).toBe('1:17 AM')
    vi.advanceTimersByTime(30_000)
    expect(screen.getByTestId('local-clock').textContent).toBe('1:18 AM')
  })
})
