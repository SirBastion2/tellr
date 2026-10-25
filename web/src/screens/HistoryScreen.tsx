import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { apiSend } from '../api'
import { controlStyle, inputFill } from '../theme/controls'
import type { Mode } from '../types'

const tap: CSSProperties = controlStyle

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
    <section data-testid="history-screen" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>History</h2>
      <div className="flex gap-2" data-testid="history-filter">
        <button
          type="button"
          data-testid="history-live"
          aria-pressed={!showPractice}
          style={{ ...tap, backgroundColor: showPractice ? 'transparent' : inputFill }}
          onClick={() => choose(false)}
        >
          Live
        </button>
        <button
          type="button"
          data-testid="history-practice"
          aria-pressed={showPractice}
          style={{ ...tap, backgroundColor: showPractice ? inputFill : 'transparent' }}
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
            <p>
              Session <span data-testid="history-session-id">{session.session_id}</span>
            </p>
            <p>
              Mode <span data-testid="history-mode">{session.mode}</span>
            </p>
            <p>
              Opened <span data-testid="history-opened">{session.opened_at}</span>
            </p>
            <p>
              Closed <span data-testid="history-closed">{session.closed_at ?? ''}</span>
            </p>
            <p>
              Library <span data-testid="history-library">{session.library_version}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
