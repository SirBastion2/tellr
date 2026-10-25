import { useState } from 'react'
import type { CSSProperties } from 'react'
import { buttonFill, buttonText, controlStyle, inputFill } from '../theme/controls'
import { Fact, FactGrid, PageTitle, SectionHeading } from '../ui/facts'
import { suggestedLabel } from '../ui/plain'
import type { OutcomeId, SessionState } from '../types'

const OUTCOME_LABEL: Record<OutcomeId, string> = {
  proceed: 'Proceed',
  slow_down: 'Slow down',
  escalate: 'Escalate',
  report: 'Report',
}

const HIGHLIGHT = '#fef3c7'
const SUGGESTED_INK = '#1c1917'

const tap: CSSProperties = controlStyle

export function OutcomeScreen({
  session,
  onSubmit,
}: {
  session: SessionState | null
  onSubmit?: (body: { outcome: OutcomeId; actor: string }) => void
}) {
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
    <section data-testid="outcome-screen" className="tc-card">
      <PageTitle>Outcome</PageTitle>
      {session ? (
        <>
          <FactGrid label="Suggested outcome">
            <Fact term="Suggested outcome">{suggestedLabel(session.suggested_outcome)}</Fact>
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
                      backgroundColor: highlighted ? HIGHLIGHT : 'transparent',
                      color: highlighted ? SUGGESTED_INK : tap.color,
                      borderColor: highlighted ? SUGGESTED_INK : undefined,
                    }}
                  >
                    {OUTCOME_LABEL[outcome]}
                  </button>
                </li>
              )
            })}
          </ul>
          <label className="block" htmlFor="outcome-actor" style={{ display: 'grid', gap: 4, fontWeight: 700 }}>
            Teller name
            <input
              id="outcome-actor"
              data-testid="actor"
              value={actor}
              onChange={(event) => {
                setActor(event.target.value)
              }}
              style={{ ...tap, marginLeft: '8px', backgroundColor: inputFill }}
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
