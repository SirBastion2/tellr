import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { OutcomeId, SessionState } from '../types'

const OUTCOME_LABEL: Record<OutcomeId, string> = {
  proceed: 'Proceed',
  slow_down: 'Slow down',
  escalate: 'Escalate',
  report: 'Report',
}

const HIGHLIGHT = '#fef3c7'
const INK = '#1c1917'

const tap: CSSProperties = {
  minHeight: '48px',
  minWidth: '48px',
  boxSizing: 'border-box',
  color: INK,
  border: `1px solid ${INK}`,
  backgroundColor: 'transparent',
  padding: '0 12px',
}

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
    <section data-testid="outcome-screen" className="space-y-4">
      {session ? (
        <>
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
                    style={{ ...tap, backgroundColor: highlighted ? HIGHLIGHT : 'transparent' }}
                  >
                    {OUTCOME_LABEL[outcome]}
                  </button>
                </li>
              )
            })}
          </ul>
          <label className="block">
            Actor
            <input
              data-testid="actor"
              value={actor}
              onChange={(event) => {
                setActor(event.target.value)
              }}
              style={{ ...tap, marginLeft: '8px', backgroundColor: '#ffffff' }}
            />
          </label>
          <button
            type="button"
            data-testid="outcome-submit"
            disabled={!ready}
            onClick={submit}
            style={tap}
          >
            Submit
          </button>
        </>
      ) : null}
    </section>
  )
}
