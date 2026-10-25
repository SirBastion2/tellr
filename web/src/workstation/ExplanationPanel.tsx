import { useEffect, useState } from 'react'
import { apiSend } from '../api'
import { readHealth, type HealthReport } from '../screens/HealthScreen'
import type { Library, SessionState } from '../types'

function chipForSignal(library: Library | null, signalId: string): string | null {
  const chip = library?.context_chips.find((item) => item.signal === signalId)
  return chip?.label ?? null
}

export function ExplanationPanel({
  library,
  session,
  postedChipIds,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds: readonly string[]
}) {
  const [health, setHealth] = useState<HealthReport | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await apiSend('GET', '/health')
        if (cancelled || result.status !== 200) {
          return
        }
        setHealth(readHealth(result.body))
      } catch {
        if (!cancelled) {
          setHealth(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!session) {
    return null
  }

  const debug = session.debug

  return (
    <section data-testid="explain-panel" aria-label="Why this level" className="tc-prose" style={{ display: 'grid', gap: 8, maxWidth: '70ch' }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Why this level</h2>
      <p style={{ margin: 0 }} data-testid="explain-level">
        Shown level {session.risk.level}. Raw level {session.risk.raw_level}. Score {session.risk.score}. Pattern{' '}
        {session.risk.pattern_label}. Suggested outcome {session.suggested_outcome}.
      </p>
      <h3 style={{ margin: 0, fontSize: 16 }}>What raised it</h3>
      {session.risk.reasons.length === 0 ? (
        <p data-testid="explain-reason" style={{ margin: 0 }}>
          The response lists no reasons for this level.
        </p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {session.risk.reasons.map((reason) => {
            const input = chipForSignal(library, reason.id)
            return (
              <li key={reason.id} data-testid="explain-reason">
                {reason.label}. {reason.rationale}
                {input ? ` Input: ${input}.` : ''}
              </li>
            )
          })}
        </ul>
      )}
      <h3 style={{ margin: 0, fontSize: 16 }}>What would lower it</h3>
      {session.risk.counterpoint ? (
        <p data-testid="explain-counter" style={{ margin: 0 }}>
          {session.risk.counterpoint.label}. {session.risk.counterpoint.rationale}
        </p>
      ) : (
        <p data-testid="explain-counter" style={{ margin: 0 }}>
          This response has no opposite-direction factor.
        </p>
      )}
      <h3 style={{ margin: 0, fontSize: 16 }}>Inputs sent</h3>
      {postedChipIds.length === 0 ? (
        <p style={{ margin: 0 }}>No context signals have been posted.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {postedChipIds.map((chipId) => {
            const chip = library?.context_chips.find((item) => item.id === chipId)
            return (
              <li key={chipId} data-testid="explain-input">
                {chip?.label ?? chipId}
                {chip?.signal ? ` (${chip.signal})` : ''}
              </li>
            )
          })}
        </ul>
      )}
      <p style={{ margin: 0 }} data-testid="explain-recommender">
        Recommender {debug?.recommender ?? 'not included'}. Rejections {debug?.rejections ?? 'not included'}. Latency{' '}
        {debug?.latency_ms ?? 'not included'} ms.
      </p>
      <p style={{ margin: 0 }} data-testid="explain-health">
        {health
          ? `Process-wide agreement ${health.agreement_rate ?? 'not included'}. Process-wide fallback rate ${health.fallback_rate}. These are not this decision.`
          : 'Process-wide agreement and fallback are not loaded.'}
      </p>
      <p data-testid="explain-gap" style={{ margin: 0 }}>
        Per-signal weights, a confidence value, and a per-decision fallback flag are not in this response.
      </p>
    </section>
  )
}
