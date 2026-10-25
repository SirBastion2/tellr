import { useState } from 'react'
import type { CSSProperties } from 'react'
import { buttonFill, buttonText, controlStyle, inputFill } from '../theme/controls'
import { useTheme } from '../theme/ThemeProvider'
import { Fact, FactGrid, PageTitle, SectionHeading } from '../ui/facts'
import { outcomeLabel, suggestedLabel } from '../ui/plain'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from '../ui/urgencyScore'
import type { OutcomeId, SessionState } from '../types'
import type { RecordedDecision } from '../teller'

const OUTCOME_LABEL: Record<OutcomeId, string> = {
  proceed: 'Proceed',
  slow_down: 'Slow down',
  escalate: 'Escalate',
  report: 'Report',
}

const tap: CSSProperties = controlStyle

export function OutcomeScreen({
  session,
  closed = false,
  recorded = null,
  onSubmit,
  onStartNew,
}: {
  session: SessionState | null
  closed?: boolean
  recorded?: RecordedDecision | null
  onSubmit?: (body: { outcome: OutcomeId; actor: string }) => void
  onStartNew?: () => void
}) {
  const theme = useTheme()
  const [actor, setActor] = useState('')
  const [chosen, setChosen] = useState<OutcomeId | null>(null)
  const ready = actor.trim().length > 0 && chosen !== null

  function submit() {
    if (!ready || chosen === null || !onSubmit) {
      return
    }
    onSubmit({ outcome: chosen, actor: actor.trim() })
  }

  return (
    <section data-testid="outcome-screen" className="tc-card tc-screen">
      <PageTitle>Outcome</PageTitle>
      {session && closed ? (
        <>
          <p data-testid="visit-closed" style={{ margin: 0 }}>
            This visit is closed. Start a new customer to record another decision.
          </p>
          {recorded ? (
            <FactGrid label="Recorded decision">
              <Fact term="Teller's decision">{outcomeLabel(recorded.outcome)}</Fact>
              <Fact term="Teller name">{recorded.actor}</Fact>
            </FactGrid>
          ) : null}
          <button
            type="button"
            className="tc-btn"
            data-variant="primary"
            data-testid="start-new-customer"
            style={{ ...tap, backgroundColor: buttonFill, color: buttonText, borderColor: 'transparent' }}
            onClick={() => onStartNew?.()}
          >
            Start new customer
          </button>
        </>
      ) : session ? (
        <>
          <FactGrid label="Suggested outcome">
            <Fact term="Suggested outcome">{suggestedLabel(session.suggested_outcome)}</Fact>
            <Fact term={URGENCY_SCORE_TERM} testId="outcome-score">
              {formatUrgencyScore(session.risk.score)}
            </Fact>
            <Fact term="Questions answered">{session.answers}</Fact>
          </FactGrid>
          <SectionHeading>Teller's decision</SectionHeading>
          <p style={{ margin: 0 }}>All four choices stay available. The highlighted one is only a suggestion.</p>
          <ul className="flex flex-wrap gap-2">
            {session.available_outcomes.map((outcome) => {
              const highlighted = outcome !== 'report' && outcome === session.suggested_outcome
              return (
                <li key={outcome}>
                  <button
                    type="button"
                    disabled={false}
                    data-testid={`outcome-${outcome}`}
                    data-suggested={highlighted ? 'true' : 'false'}
                    data-highlighted={highlighted ? 'true' : 'false'}
                    data-selected={chosen === outcome ? 'true' : 'false'}
                    onClick={() => {
                      setChosen(outcome)
                    }}
                    aria-pressed={chosen === outcome}
                    style={{
                      ...tap,
                      backgroundColor: highlighted ? theme.highlightBg : 'transparent',
                      color: highlighted ? theme.highlightFg : tap.color,
                      borderColor: highlighted ? theme.highlightFg : undefined,
                    }}
                  >
                    {OUTCOME_LABEL[outcome]}
                  </button>
                </li>
              )
            })}
          </ul>
          <label className="tc-stack-heading block" htmlFor="outcome-actor" style={{ fontWeight: 700 }}>
            Teller name
            <input
              id="outcome-actor"
              data-testid="actor"
              value={actor}
              onChange={(event) => {
                setActor(event.target.value)
              }}
              style={{ ...tap, backgroundColor: inputFill }}
            />
          </label>
          <button
            type="button"
            data-testid="outcome-submit"
            disabled={!ready}
            onClick={submit}
            style={{ ...tap, backgroundColor: buttonFill, color: buttonText, borderColor: 'transparent' }}
          >
            Record decision
          </button>
        </>
      ) : null}
    </section>
  )
}
