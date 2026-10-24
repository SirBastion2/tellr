import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { apiSend } from '../api'
import type { Mode } from '../types'

const tap: CSSProperties = {
  minHeight: '48px',
  minWidth: '48px',
  boxSizing: 'border-box',
  color: '#1c1917',
  border: '1px solid #1c1917',
  backgroundColor: 'transparent',
  padding: '0 12px',
}

export type HistorySession = {
  session_id: string
  mode: Mode
  opened_at: string
  closed_at: string | null
  library_version: string
}

type HistoryLoad =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'invalid' }
  | { kind: 'ready'; sessions: HistorySession[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readHistory(body: unknown): HistorySession[] | null {
  if (!isRecord(body) || !Array.isArray(body.sessions)) {
    return null
  }
  const sessions: HistorySession[] = []
  for (const item of body.sessions) {
    if (!isRecord(item)) {
      return null
    }
    if (typeof item.session_id !== 'string' || item.session_id.length === 0) {
      return null
    }
    if (item.mode !== 'live' && item.mode !== 'practice') {
      return null
    }
    if (typeof item.opened_at !== 'string') {
      return null
    }
    if (item.closed_at !== null && typeof item.closed_at !== 'string') {
      return null
    }
    if (typeof item.library_version !== 'string') {
      return null
    }
    sessions.push({
      session_id: item.session_id,
      mode: item.mode,
      opened_at: item.opened_at,
      closed_at: item.closed_at,
      library_version: item.library_version,
    })
  }
  return sessions
}

export function HistoryScreen() {
  const [showPractice, setShowPractice] = useState(false)
  const [load, setLoad] = useState<HistoryLoad>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    const path = showPractice ? '/sessions?mode=practice' : '/sessions'
    void (async () => {
      try {
        const result = await apiSend('GET', path)
        if (cancelled) {
          return
        }
        if (result.status !== 200) {
          setLoad({ kind: 'unavailable' })
          return
        }
        const sessions = readHistory(result.body)
        setLoad(sessions === null ? { kind: 'invalid' } : { kind: 'ready', sessions })
      } catch {
        if (!cancelled) {
          setLoad({ kind: 'unavailable' })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showPractice])

  function choose(practice: boolean) {
    if (practice === showPractice) {
      return
    }
    setShowPractice(practice)
    setLoad({ kind: 'loading' })
  }

  const visible =
    load.kind === 'ready'
      ? load.sessions.filter((session) => (showPractice ? session.mode === 'practice' : session.mode === 'live'))
      : []

  return (
    <section data-testid="history-screen" className="space-y-3">
      <div className="flex gap-2" data-testid="history-filter">
        <button
          type="button"
          data-testid="history-live"
          aria-pressed={!showPractice}
          style={{ ...tap, backgroundColor: showPractice ? 'transparent' : '#e7e5e4' }}
          onClick={() => choose(false)}
        >
          Live
        </button>
        <button
          type="button"
          data-testid="history-practice"
          aria-pressed={showPractice}
          style={{ ...tap, backgroundColor: showPractice ? '#e7e5e4' : 'transparent' }}
          onClick={() => choose(true)}
        >
          Practice
        </button>
      </div>
      {load.kind === 'unavailable' ? <p data-testid="history-unavailable">History is unavailable.</p> : null}
      {load.kind === 'invalid' ? <p data-testid="history-invalid">History response could not be read.</p> : null}
      <ul data-testid="history-list" className="space-y-2">
        {visible.map((session) => (
          <li key={session.session_id} data-testid="history-row" data-mode={session.mode}>
            <p data-testid="history-session-id">{session.session_id}</p>
            <p data-testid="history-mode">{session.mode}</p>
            <p data-testid="history-opened">{session.opened_at}</p>
            <p data-testid="history-closed">{session.closed_at ?? ''}</p>
            <p data-testid="history-library">{session.library_version}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
