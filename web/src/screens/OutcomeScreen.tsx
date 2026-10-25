import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { buttonFill, buttonText, controlStyle, inputFill } from '../theme/controls'
import { useTheme } from '../theme/ThemeProvider'
import type { BankTheme } from '../theme/types'
import { Fact, FactGrid, PageTitle } from '../ui/facts'
import { ArrowRightIcon, CheckIcon } from '../ui/icons'
import { outcomeLabel } from '../ui/plain'
import type { Level, OutcomeId, SessionState } from '../types'
import type { RecordedDecision } from '../teller'

const OUTCOME_LABEL: Record<OutcomeId, string> = {
  proceed: 'Proceed',
  slow_down: 'Slow Down',
  escalate: 'Escalate',
  report: 'Report',
}

const RECOMMENDATION = "Copilot's recommendation"
const CHOICE_RADIUS = '28px'

const tap: CSSProperties = controlStyle

function levelFill(theme: BankTheme, level: Level): string {
  if (level === 'clear') {
    return theme.risk.clearBg
  }
  if (level === 'caution') {
    return theme.risk.cautionBg
  }
  return theme.risk.highBg
}

function outcomePaint(
  theme: BankTheme,
  selected: boolean,
  suggested: boolean,
): Pick<CSSProperties, 'backgroundColor' | 'color' | 'border'> {
  if (selected) {
    return {
      backgroundColor: theme.button,
      color: theme.buttonText,
      border: '2px solid transparent',
    }
  }
  if (suggested) {
    return {
      backgroundColor: theme.surface,
      color: theme.text,
      border: `2px solid ${theme.highlightBg}`,
    }
  }
  return {
    backgroundColor: theme.surface,
    color: theme.text,
    border: `2px solid ${theme.glass.border}`,
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
    <section data-testid="outcome-screen" className="tc-card tc-screen tc-outcome">
      {session && closed ? (
        <>
          <PageTitle>Outcome</PageTitle>
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
        <div className="tc-outcome-card">
          <div className="tc-outcome-body">
            <PageTitle>Outcome</PageTitle>
            <div className="tc-outcome-pills">
              <span className="tc-outcome-pill" data-testid="outcome-score">
                <span
                  className="tc-outcome-dot"
                  data-level={session.risk.level}
                  style={{ backgroundColor: levelFill(theme, session.risk.level) }}
                  aria-hidden="true"
                />
                <span>Urgency</span> <strong>{session.risk.score}%</strong>
              </span>
              <span className="tc-outcome-pill" data-testid="outcome-answers">
                {session.answers} Questions Answered
              </span>
            </div>
            <label className="tc-outcome-actor" htmlFor="outcome-actor">
              <span className="tc-fact-term">Teller's Decision</span>
              <input
                id="outcome-actor"
                data-testid="actor"
                placeholder="Type your Name here..."
                value={actor}
                onChange={(event) => {
                  setActor(event.target.value)
                }}
                style={{ ...tap, backgroundColor: inputFill, borderRadius: '999px', width: '100%' }}
              />
            </label>
            <ul className="tc-outcome-choices">
              {session.available_outcomes.map((outcome) => {
                const suggested = outcome !== 'report' && outcome === session.suggested_outcome
                const selected = selectedId === outcome
                return (
                  <li key={outcome}>
                    <button
                      type="button"
                      disabled={false}
                      className="tc-outcome-choice"
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
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        width: '100%',
                        minHeight: '148px',
                        padding: '16px 12px',
                        boxSizing: 'border-box',
                        borderRadius: CHOICE_RADIUS,
                        font: 'inherit',
                        cursor: 'pointer',
                        ...outcomePaint(theme, selected, suggested),
                      }}
                    >
                      <span>{OUTCOME_LABEL[outcome]}</span>
                      {suggested ? <span className="tc-text-xs">{RECOMMENDATION}</span> : null}
                      {selected ? (
                        <span data-testid="outcome-check" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <CheckIcon />
                          Selected
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <button
            type="button"
            className="tc-btn tc-outcome-go"
            data-testid="outcome-submit"
            aria-label="Record decision"
            disabled={!ready}
            onClick={submit}
            style={{ ...tap, backgroundColor: buttonFill, color: buttonText, borderColor: 'transparent', borderRadius: '999px', width: '48px', height: '48px', minWidth: '48px', padding: 0 }}
          >
            <ArrowRightIcon />
          </button>
        </div>
      ) : null}
    </section>
  )
}
