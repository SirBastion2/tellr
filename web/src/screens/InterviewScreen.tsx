import type { Library, SessionState } from '../types'

function chipLabel(library: Library | null, id: string): string {
  return library?.chips.find((chip) => chip.id === id)?.label ?? id
}

function purposeLabel(library: Library | null, id: string): string {
  return library?.purposes.find((purpose) => purpose.id === id)?.label ?? id
}

export function InterviewScreen({
  library,
  session,
}: {
  library: Library | null
  session: SessionState | null
}) {
  return (
    <section data-testid="interview-screen" className="space-y-3">
      {session ? (
        <>
          <p data-testid="risk-level" className="text-lg">
            {session.risk.level}
          </p>
          <p data-testid="risk-raw-level">{session.risk.raw_level}</p>
          <p data-testid="risk-score">{session.risk.score}</p>
          <p data-testid="pattern-label" className="text-sm">
            {session.risk.pattern_label}
          </p>
          <ul>
            {session.risk.reasons.map((reason) => (
              <li key={reason.id} data-testid="reason">
                {reason.label}
              </li>
            ))}
          </ul>
          {session.risk.counterpoint ? (
            <p data-testid="counterpoint">{session.risk.counterpoint.label}</p>
          ) : null}
          {session.question ? (
            <>
              <p data-testid="question-text">{session.question.text}</p>
              <p data-testid="question-why">{session.question.why}</p>
              <ul className="flex flex-wrap gap-2">
                {session.question.chips.map((id) => (
                  <li key={id} data-testid="answer-chip" className="min-h-12 border px-3">
                    {chipLabel(library, id)}
                  </li>
                ))}
              </ul>
              {session.question.stage === 'opener' && library ? (
                <ul className="flex flex-wrap gap-2">
                  {library.purposes.map((purpose) => (
                    <li key={purpose.id} data-testid="purpose">
                      {purpose.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
          {session.stated_purpose ? (
            <p data-testid="stated-purpose">{purposeLabel(library, session.stated_purpose)}</p>
          ) : null}
          {session.stop ? (
            <p data-testid="stop">
              {session.stop.kind} {session.stop.reason}
            </p>
          ) : null}
          <p data-testid="suggested-outcome">{session.suggested_outcome}</p>
        </>
      ) : null}
    </section>
  )
}
