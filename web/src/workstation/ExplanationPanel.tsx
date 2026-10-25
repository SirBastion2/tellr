import { useEffect, useState } from 'react'
import { apiSend } from '../api'
import { factorOrigin, latestActivityTs } from '../feed'
import { readHealth, type HealthReport } from '../screens/HealthScreen'
import { Fact, FactGrid, SectionHeading } from '../ui/facts'
import { LEVEL_WORD } from '../ui/LevelIcon'
import { levelLabel, notedAtLocal, patternValue, recommenderPhrase, suggestedLabel } from '../ui/plain'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from '../ui/urgencyScore'
import type { ActivityRow, Library, SessionState } from '../types'
import {
  groupFactors,
  responseWeightTotal,
  strengthShare,
  strengthWord,
  type LevelFactor,
} from './explain'

function FactorList({
  items,
  total,
  testId,
  empty,
  originFor,
}: {
  items: readonly LevelFactor[]
  total: number
  testId: string
  empty: string
  originFor: (item: LevelFactor) => 'Observed' | 'Teller confirmed' | null
}) {
  if (items.length === 0) {
    return (
      <p data-testid={testId} className="tc-prose" style={{ margin: 0 }}>
        {empty}
      </p>
    )
  }
  return (
    <ul className="tc-factor-list">
      {items.map((item) => {
        const share = item.weight == null ? null : strengthShare(item.weight, total)
        const word = item.weight == null ? null : strengthWord(item.weight, total)
        const origin = originFor(item)
        return (
          <li key={`${item.id}-${item.direction}`} data-testid={testId} data-direction={item.direction}>
            <div className="tc-factor-head">
              <strong>{item.label}</strong>
              {origin ? (
                <span data-testid="signal-origin" className="tc-badge">
                  {origin}
                </span>
              ) : null}
              {word ? (
                <span className="tc-factor-strength">
                  <span aria-hidden="true">{item.direction === 'raises' ? '↑' : '↓'}</span> {word}
                </span>
              ) : null}
            </div>
            {share != null && word ? (
              <span
                className="tc-meter"
                role="meter"
                aria-label={word}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(share * 100)}
              >
                <span style={{ width: `${Math.round(share * 100)}%` }} />
              </span>
            ) : null}
            {item.rationale ? <p className="tc-factor-why">{item.rationale}</p> : null}
          </li>
        )
      })}
    </ul>
  )
}

export function ExplanationPanel({
  library,
  session,
  postedChipIds,
  activity = null,
  idle = false,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds: readonly string[]
  activity?: readonly ActivityRow[] | null
  idle?: boolean
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

  if (!session || idle) {
    return null
  }

  const grouped = groupFactors(session, library)
  const factors = [...grouped.raises, ...grouped.lowers]
  const total = responseWeightTotal(factors)
  const debug = session.debug
  const noted = latestActivityTs(activity)
  const originFor = (item: LevelFactor) =>
    factorOrigin(library, item.id, item.label, postedChipIds, session.context_chips)
  const rawDiffers = session.risk.raw_level !== session.risk.level

  return (
    <section data-testid="explain-panel" aria-label="Why this level" className="tc-explain">
      <h2 className="tc-title">Why this level</h2>
      {noted ? (
        <p data-testid="noted-at" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Noted {notedAtLocal(noted)}
        </p>
      ) : null}
      <FactGrid label="Level summary">
        <Fact term="Level" testId="explain-level">
          {levelLabel(session.risk.level)}
        </Fact>
        {rawDiffers ? (
          <Fact term="Raw level (before display rules)" testId="explain-raw-level">
            {LEVEL_WORD[session.risk.raw_level]}
          </Fact>
        ) : null}
        <Fact term={URGENCY_SCORE_TERM} testId="explain-score">
          {formatUrgencyScore(session.risk.score)}
        </Fact>
        <Fact term="Pattern">{patternValue(session.risk.pattern_label)}</Fact>
        <Fact term="Suggested outcome">{suggestedLabel(session.suggested_outcome)}</Fact>
      </FactGrid>

      <SectionHeading>What raised it</SectionHeading>
      <FactorList
        items={grouped.raises}
        total={total}
        testId="explain-reason"
        empty="Nothing in this visit raised the level."
        originFor={originFor}
      />

      <SectionHeading>What would lower it</SectionHeading>
      <FactorList
        items={grouped.lowers}
        total={total}
        testId="explain-counter"
        empty="Nothing in this visit points toward it being safe."
        originFor={originFor}
      />

      <details className="tc-tech tc-block" data-testid="technical-details">
        <summary className="tc-kicker">Technical details</summary>
        <div className="tc-tech-body">
          <p data-testid="explain-recommender" className="tc-prose" style={{ margin: 0 }}>
            {debug
              ? `Decided by: ${recommenderPhrase(debug.recommender)}.`
              : 'Decided by: not included.'}
          </p>
          <p className="tc-prose" style={{ margin: 0 }}>
            {debug ? `Response time: ${debug.latency_ms} ms.` : 'Response time: not included.'}
          </p>
          <p className="tc-prose" style={{ margin: 0 }}>
            {debug ? `Rejected tries: ${debug.rejections}.` : 'Rejected tries: not included.'}
          </p>
          <p data-testid="explain-health" className="tc-prose" style={{ margin: 0 }}>
            {health
              ? `Across recent visits, agreement with the rules is ${health.agreement_rate ?? 'not included'} and the fallback rate is ${health.fallback_rate}. That is the whole service, not this decision.`
              : 'Service-wide rates are not loaded.'}
          </p>
          {grouped.explanation ? (
            <>
              <p data-testid="explain-confidence" className="tc-prose" style={{ margin: 0 }}>
                {grouped.explanation.confidence === null
                  ? 'Not applicable (rules engine).'
                  : `Model confidence: ${grouped.explanation.confidence}.`}
              </p>
              <p data-testid="explain-fallback" className="tc-prose" style={{ margin: 0 }}>
                {grouped.explanation.used_fallback
                  ? 'This decision used the fallback.'
                  : 'This decision did not use the fallback.'}
              </p>
              {factors.some((item) => item.weight != null) ? (
                <ul className="tc-prose">
                  {factors.map((item) => (
                    <li key={`tech-${item.id}-${item.direction}`} data-testid="explain-contribution">
                      {item.label}. Weight {item.weight}. {item.id}. {item.direction === 'raises' ? 'Raises' : 'Lowers'}.
                    </li>
                  ))}
                </ul>
              ) : (
                <p data-testid="explain-contribution" className="tc-prose" style={{ margin: 0 }}>
                  This response lists no contributions.
                </p>
              )}
            </>
          ) : (
            <p data-testid="explain-gap" className="tc-prose" style={{ margin: 0 }}>
              Per-signal weights, a confidence value, and a per-decision fallback flag are not in this response.
            </p>
          )}
        </div>
      </details>
    </section>
  )
}
