import { useEffect, useState } from 'react'
import { formatTimeOfDay, msUntilNextMinute } from './localTime'

export function LocalClock({
  now,
  timeZone,
}: {
  now?: Date
  timeZone?: string
}) {
  const [live, setLive] = useState(() => new Date())

  useEffect(() => {
    if (now) {
      return
    }
    const sync = () => setLive(new Date())
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
      {formatTimeOfDay(now ?? live, timeZone)}
    </p>
  )
}
