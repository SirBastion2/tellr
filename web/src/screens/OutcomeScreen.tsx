import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { buttonFill, buttonText, controlStyle, inputFill } from '../theme/controls'
import { useTheme } from '../theme/ThemeProvider'
import type { BankTheme } from '../theme/types'
import { Fact, FactGrid, PageTitle, SectionHeading } from '../ui/facts'
import { CheckIcon } from '../ui/icons'
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

const RECOMMENDATION = "Copilot's recommendation"

const tap: CSSProperties = controlStyle

function outcomePaint(
  theme: BankTheme,
  selected: boolean,
  suggested: boolean,
): Pick<CSSProperties, 'backgroundColor' | 'color' | 'border'> {
  if (selected) {
    return {
      backgroundColor: theme.button,
      color: theme.buttonText,
      border: 'var(--tc-border-width, 1px) var(--tc-border-style, solid) transparent',
    }
  }
  if (suggested) {
    return {
      backgroundColor: theme.highlightBg,
      color: theme.highlightFg,
      border: `var(--tc-border-width, 1px) var(--tc-border-style, solid) ${theme.highlightFg}`,
    }
  }
  return {
    backgroundColor: 'transparent',
    color: tap.color,
    border: tap.border,
  }
}

export function OutcomeScreen({
  session,
  closed = false,
  recorded = null,
  recordedOutcome = null,
  onSubmit,
  onStartNew,
}: {
  session: SessionState | null
  closed?: boolean
  recorded?: RecordedDecision | null
  /** Outcome already on the handoff projection, or posted through `POST /outcome`. */
  recordedOutcome?: OutcomeId | null
  onSubmit?: (body: { outcome: OutcomeId; actor: string }) => void
  onStartNew?: () => void
}) {
  const theme = useTheme()
  const [actor, setActor] = useState('')
  const [chosen, setChosen] = useState<OutcomeId | null>(null)
  const posted = recorded?.outcome ?? recordedOutcome ?? null
  const selectedId = posted ?? chosen
  const ready = actor.trim().length > 0 && chosen !== null

  function choose(outcome: OutcomeId) {
    if (posted !== null) {
      return
    }
    setChosen(outcome)
  }

  function onOutcomeKey(event: KeyboardEvent<HTMLButtonElement>, outcome: OutcomeId) {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
      return
    }
    event.preventDefault()
    choose(outcome)
  }

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
          <p data-testid="visit-closed" className="tc-prose" style={{ margin: 0 }}>
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
          <p className="tc-prose" data-testid="outcome-help" style={{ margin: 0 }}>
            All four choices stay available. The one marked is the copilot's recommendation; you decide.
          </p>
          <ul className="flex flex-wrap gap-2">
            {session.available_outcomes.map((outcome) => {
              const suggested = outcome !== 'report' && outcome === session.suggested_outcome
              const selected = selectedId === outcome
              return (
                <li key={outcome}>
                  <button
                    type="button"
                    disabled={false}
                    data-testid={`outcome-${outcome}`}
                    data-suggested={suggested ? 'true' : 'false'}
                    data-highlighted={suggested ? 'true' : 'false'}
                    data-selected={selected ? 'true' : 'false'}
                    aria-pressed={selected}
                    title={suggested ? RECOMMENDATION : undefined}
                    onClick={() => {
                      choose(outcome)
                    }}
                    onKeyDown={(event) => {
                      onOutcomeKey(event, outcome)
                    }}
                    style={{
                      ...tap,
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--tc-space-1, 4px)',
                      borderRadius: 'var(--tc-radius-control, 999px)',
                      ...outcomePaint(theme, selected, suggested),
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--tc-space-2, 8px)' }}>
                      {selected ? (
                        <span data-testid="outcome-check" aria-hidden="true">
                          <CheckIcon />
                        </span>
                      ) : null}
                      {OUTCOME_LABEL[outcome]}
                    </span>
                    {suggested ? <span className="tc-text-xs">{RECOMMENDATION}</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
          <label className="tc-stack-heading block" htmlFor="outcome-actor">
            <span className="tc-fact-term">Teller name</span>
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
