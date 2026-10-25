import type { HandoffProjection, Level, Library, OutcomeId, SuggestedOutcome } from '../types'

const LEVEL_TEXT: Record<Level, string> = {
  clear: 'Clear',
  caution: 'Caution',
  high: 'High',
}

const SUGGESTED_TEXT: Record<SuggestedOutcome, string> = {
  proceed: 'Proceed',
  slow_down: 'Slow down',
  escalate: 'Escalate',
}

const OUTCOME_TEXT: Record<OutcomeId, string> = {
  proceed: 'Proceed',
  slow_down: 'Slow down',
  escalate: 'Escalate',
  report: 'Report',
}

function purposeLabel(library: Library | null, id: string): string {
  return library?.purposes.find((purpose) => purpose.id === id)?.label ?? id
}

export function HandoffScreen({
  library,
  projection,
}: {
  library: Library | null
  projection: HandoffProjection | null
}) {
  return (
    <section data-testid="handoff-screen" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>Handoff</h2>
      {projection ? (
        <>
          <p>
            Session <span data-testid="handoff-session">{projection.session_id}</span>
          </p>
          <p>
            Mode <span data-testid="handoff-mode">{projection.mode}</span>
          </p>
          <p>
            Answers <span data-testid="handoff-answers">{projection.answers}</span>
          </p>
          <p>
            Level <span data-testid="handoff-level" data-level={projection.risk.level}>{LEVEL_TEXT[projection.risk.level]}</span>
          </p>
          <p>
            Score <span data-testid="handoff-score">{projection.risk.score}</span>
          </p>
          <p>
            Pattern <span data-testid="handoff-pattern">{projection.risk.pattern_label}</span>
          </p>
          {projection.stated_purpose ? (
            <p>
              Purpose <span data-testid="handoff-purpose">{purposeLabel(library, projection.stated_purpose)}</span>
            </p>
          ) : null}
          {projection.risk.reasons.length > 0 ? (
            <ul>
              {projection.risk.reasons.map((reason) => (
                <li key={reason.id} data-testid="handoff-reason">
                  {reason.label}
                </li>
              ))}
            </ul>
          ) : null}
          {projection.risk.counterpoint ? (
            <p data-testid="handoff-counterpoint">
              {projection.risk.level === 'clear' ? 'Still noted:' : 'In their favor:'} {projection.risk.counterpoint.label}
            </p>
          ) : null}
          <p>
            Suggested outcome <span data-testid="handoff-suggested" data-outcome={projection.suggested_outcome}>{SUGGESTED_TEXT[projection.suggested_outcome]}</span>
          </p>
          {projection.stop ? (
            <p>
              Stop <span data-testid="handoff-stop" data-kind={projection.stop.kind}>{projection.stop.reason}</span>
            </p>
          ) : null}
          <p data-testid="handoff-outcome" data-recorded={projection.outcome === null ? 'false' : 'true'}>
            Outcome: {projection.outcome === null ? 'not recorded yet' : OUTCOME_TEXT[projection.outcome]}
          </p>
          <p data-testid="handoff-actor" data-recorded={projection.actor === null ? 'false' : 'true'}>
            Actor: {projection.actor === null ? 'not recorded yet' : projection.actor}
          </p>
        </>
      ) : null}
    </section>
  )
}
