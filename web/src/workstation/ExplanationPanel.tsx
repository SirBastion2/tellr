import { useEffect, useState } from 'react'
import { apiSend } from '../api'
import { latestActivityTs, mergeSignalRows, type MergedSignalRow } from '../feed'
import { readHealth, type HealthReport } from '../screens/HealthScreen'
import { controlStyle, primaryStyle, secondaryStyle } from '../theme/controls'
import { Fact, FactGrid, SectionHeading } from '../ui/facts'
import { CheckIcon, DismissIcon } from '../ui/icons'
import { LEVEL_WORD } from '../ui/LevelIcon'
import { levelLabel, notedAtLocal, patternValue, recommenderPhrase, suggestedLabel } from '../ui/plain'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from '../ui/urgencyScore'
import type { ActivityRow, Library, SessionState } from '../types'
import { groupFactors, responseWeightTotal, strengthShare, strengthWord } from './explain'

const primary = { ...controlStyle, ...primaryStyle }
const iconButton = {
  ...controlStyle,
  ...secondaryStyle,
  width: 48,
  padding: 0,
}

function FactorList({
  items,
  total,
  testId,
  empty,
  closed,
  pending = false,
  onConfirm,
  onDismiss,
  onRestore,
}: {
  items: readonly MergedSignalRow[]
  total: number
  testId: string
  empty: string
  closed: boolean
  pending?: boolean
  onConfirm?: (chipId: string) => void
  onDismiss?: (chipId: string) => void
  onRestore?: (chipId: string) => void
}) {
  if (items.length === 0) {
    return (
      <p data-testid={testId} style={{ margin: 0, fontWeight: 400 }}>
        {empty}
      </p>
    )
  }
  return (
    <ul className="tc-factor-list" aria-label="Signals">
      {items.map((item) => {
        const share = item.weight == null ? null : strengthShare(item.weight, total)
        const word = item.weight == null ? null : strengthWord(item.weight, total)
        const actions = Boolean(item.chipId && !closed && onConfirm && onDismiss)
        return (
          <li
            key={`${item.id}-${item.direction}-${item.chipId ?? 'factor'}`}
            data-testid={testId}
            data-direction={item.direction}
            style={{ display: 'grid', gap: 6, alignItems: 'start' }}
          >
            <div data-testid="signal-row" data-state={item.state} className="tc-signal-row" style={{ display: 'grid', gap: 6 }}>
              <div className="tc-signal-meta">
                <div className="tc-factor-head">
                  <strong>{item.label}</strong>
                  {item.origin ? (
                    <span data-testid="signal-origin" className="tc-badge">
                      {item.origin}
                    </span>
                  ) : null}
                  {word ? (
                    <span className="tc-factor-strength">
                      <span aria-hidden="true">{item.direction === 'raises' ? '↑' : '↓'}</span> {word}
                    </span>
                  ) : null}
                </div>
                {actions ? (
                  <span className="tc-signal-actions">
                    {item.state === 'dismissed' ? (
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="secondary"
                      data-testid="signal-restore"
                      aria-label={`Restore ${item.label}`}
                      title="Restore signal"
                      style={{ ...controlStyle, ...secondaryStyle }}
                      disabled={pending}
                      onClick={() => item.chipId && onRestore?.(item.chipId)}
                    >
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="tc-btn"
                          data-variant="primary"
                          data-testid="signal-confirm"
                          aria-label={`Confirm ${item.label}`}
                        title="Confirm signal (C)"
                        style={primary}
                        disabled={pending}
                        onClick={() => item.chipId && onConfirm?.(item.chipId)}
                      >
                        <CheckIcon />
                      </button>
                      <button
                        type="button"
                        className="tc-btn"
                        data-variant="dismiss"
                        data-testid="signal-dismiss"
                        aria-label={`Dismiss ${item.label}`}
                        title="Dismiss signal (D)"
                        style={iconButton}
                        disabled={pending}
                        onClick={() => item.chipId && onDismiss?.(item.chipId)}
                      >
                          <DismissIcon />
                        </button>
                      </>
                    )}
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
            </div>
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
  confirmed = [],
  dismissed = [],
  activity = null,
  idle = false,
  closed = false,
  pending = false,
  onConfirm,
  onDismiss,
  onRestore,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds: readonly string[]
  confirmed?: readonly string[]
  dismissed?: readonly string[]
  activity?: readonly ActivityRow[] | null
  idle?: boolean
  closed?: boolean
  pending?: boolean
  onConfirm?: (chipId: string) => void
  onDismiss?: (chipId: string) => void
  onRestore?: (chipId: string) => void
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
  const merged = mergeSignalRows(library, session, postedChipIds, confirmed, dismissed)
  const factors = [...grouped.raises, ...grouped.lowers]
  const total = responseWeightTotal(factors)
  const debug = session.debug
  const noted = latestActivityTs(activity)

  return (
    <section data-testid="explain-panel" aria-label="Why this level" className="tc-explain">
      <h2 className="tc-title">Why this level</h2>
      {noted ? (
        <p data-testid="noted-at" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Noted {notedAtLocal(noted)}
        </p>
      ) : null}
      <FactGrid label="Level summary">
        <Fact term="Shown level" testId="explain-level">
          {levelLabel(session.risk.level)}
        </Fact>
        <Fact term="Raw level">{LEVEL_WORD[session.risk.raw_level]}</Fact>
        <Fact term={URGENCY_SCORE_TERM} testId="explain-score">
          {formatUrgencyScore(session.risk.score)}
        </Fact>
        <Fact term="Pattern">{patternValue(session.risk.pattern_label)}</Fact>
        <Fact term="Suggested outcome">{suggestedLabel(session.suggested_outcome)}</Fact>
      </FactGrid>

      <SectionHeading>What raised it</SectionHeading>
      <FactorList
        items={merged.raises}
        total={total}
        testId="explain-reason"
        empty="Nothing in this visit raised the level."
        closed={closed}
        pending={pending}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        onRestore={onRestore}
      />

      <SectionHeading>What would lower it</SectionHeading>
      <FactorList
        items={merged.lowers}
        total={total}
        testId="explain-counter"
        empty="Nothing in this visit points toward it being safe."
        closed={closed}
        pending={pending}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        onRestore={onRestore}
      />

      <details className="tc-tech" data-testid="technical-details">
        <summary>Technical details</summary>
        <div className="tc-tech-body">
          <p data-testid="explain-recommender" style={{ margin: 0 }}>
            {debug
              ? `Decided by: ${recommenderPhrase(debug.recommender)}.`
              : 'Decided by: not included.'}
          </p>
          <p style={{ margin: 0 }}>
            {debug ? `Response time: ${debug.latency_ms} ms.` : 'Response time: not included.'}
          </p>
          <p style={{ margin: 0 }}>
            {debug ? `Rejected tries: ${debug.rejections}.` : 'Rejected tries: not included.'}
          </p>
          <p data-testid="explain-health" style={{ margin: 0 }}>
            {health
              ? `Across recent visits, agreement with the rules is ${health.agreement_rate ?? 'not included'} and the fallback rate is ${health.fallback_rate}. That is the whole service, not this decision.`
              : 'Service-wide rates are not loaded.'}
          </p>
          {grouped.explanation ? (
            <>
              <p data-testid="explain-confidence" style={{ margin: 0 }}>
                {grouped.explanation.confidence === null
                  ? 'Not applicable (rules engine).'
                  : `Model confidence: ${grouped.explanation.confidence}.`}
              </p>
              <p data-testid="explain-fallback" style={{ margin: 0 }}>
                {grouped.explanation.used_fallback
                  ? 'This decision used the fallback.'
                  : 'This decision did not use the fallback.'}
              </p>
              {factors.some((item) => item.weight != null) ? (
                <ul>
                  {factors.map((item) => (
                    <li key={`tech-${item.id}-${item.direction}`} data-testid="explain-contribution">
                      {item.label}. Weight {item.weight}. {item.id}. {item.direction === 'raises' ? 'Raises' : 'Lowers'}.
                    </li>
                  ))}
                </ul>
              ) : (
                <p data-testid="explain-contribution" style={{ margin: 0 }}>
                  This response lists no contributions.
                </p>
              )}
            </>
          ) : (
            <p data-testid="explain-gap" style={{ margin: 0 }}>
              Per-signal weights, a confidence value, and a per-decision fallback flag are not in this response.
            </p>
          )}
        </div>
      </details>
    </section>
  )
}
