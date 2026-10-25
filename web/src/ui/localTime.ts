/** Client-local clock helpers. Display only; no risk or question logic. */

const NAIVE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?$/

/** Parse a session timestamp. Naive ISO (no Z/offset) is UTC, never local. */
export function parseTimestamp(ts: string): Date {
  const trimmed = ts.trim()
  if (trimmed.length === 0) {
    return new Date(Number.NaN)
  }
  if (NAIVE_ISO.test(trimmed)) {
    return new Date(`${trimmed}Z`)
  }
  return new Date(trimmed)
}

export function clientTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** ISO-8601 local instant WITH offset, e.g. 2026-10-25T01:17:00-04:00. */
export function formatOffsetIso(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const offsetMin = -date.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${hours}:${minutes}`
}

export function formatTimeOfDay(date: Date, timeZone?: string): string {
  if (Number.isNaN(date.getTime())) {
    return 'Time on file'
  }
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(date)
}

export function formatLocalDateTime(ts: string, timeZone?: string): string {
  const date = parseTimestamp(ts)
  if (Number.isNaN(date.getTime())) {
    return 'Time on file'
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(date)
}

export function msUntilNextMinute(nowMs = Date.now()): number {
  return 60_000 - (nowMs % 60_000)
}
