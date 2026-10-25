import { useEffect, useState } from 'react'
import { formatTimeOfDay, msUntilNextMinute } from './localTime'

export function LocalClock({
  now,
  timeZone,
}: {
  now?: Date
  timeZone?: string
}) {
  const [current, setCurrent] = useState(() => now ?? new Date())

  useEffect(() => {
    if (now) {
      setCurrent(now)
      return
    }
    const sync = () => setCurrent(new Date())
    sync()
    let interval = 0
    const timeout = window.setTimeout(() => {
      sync()
      interval = window.setInterval(sync, 60_000)
    }, msUntilNextMinute())
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [now])

  return (
    <p data-testid="local-clock" aria-label="Local time of day" className="tc-timer">
      {formatTimeOfDay(current, timeZone)}
    </p>
  )
}
