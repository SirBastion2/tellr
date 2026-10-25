import { useState } from 'react'
import type { CSSProperties } from 'react'
import { controlStyle, inputFill, textColor } from '../theme/controls'
import type { AnswerChipId, AnswerPost, Library, QuestionView } from '../types'

const QUIET_OPACITY = 0.7

const tap: CSSProperties = {
  ...controlStyle,
  padding: '4px',
}

function chipLabel(library: Library | null, id: string): string {
  return library?.chips.find((chip) => chip.id === id)?.label ?? id
}

export function QuestionCard({
  library,
  question,
  quiet,
  hidePrompt = false,
  onAnswer,
}: {
  library: Library | null
  question: QuestionView
  quiet: boolean
  hidePrompt?: boolean
  onAnswer?: (answer: AnswerPost) => void
}) {
  const [purposeId, setPurposeId] = useState<string | null>(null)
  const opener = question.stage === 'opener'
  const slots: (AnswerChipId | null)[] = [0, 1, 2, 3, 4].map((index) => question.chips[index] ?? null)
  const waitingForPurpose = opener && purposeId === null

  function choose(chip: AnswerChipId) {
    if (!onAnswer || waitingForPurpose) {
      return
    }
    if (opener && purposeId) {
      onAnswer({ question_id: question.id, chip, purpose: purposeId })
      return
    }
    onAnswer({ question_id: question.id, chip })
  }

  return (
    <article
      data-testid="question-card"
      data-emphasis={quiet ? 'low' : 'normal'}
      style={{
        opacity: quiet ? QUIET_OPACITY : 1,
        display: 'grid',
        gap: '8px',
        alignContent: 'start',
        color: textColor,
      }}
    >
      {hidePrompt ? null : (
        <p data-testid="question-text" className="tc-text-lg" style={{ margin: 0 }}>
          {question.text}
        </p>
      )}
      {opener ? (
        <div
          data-testid="purpose-row"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            gap: '8px',
            overflowX: 'auto',
            height: '48px',
            minHeight: '48px',
          }}
        >
          {(library?.purposes ?? []).map((purpose) => {
            const selected = purposeId === purpose.id
            return (
              <button
                key={purpose.id}
                type="button"
                data-testid="purpose"
                data-selected={selected ? 'true' : 'false'}
                aria-pressed={selected}
                className="tc-text-sm"
                style={{
                  ...tap,
                  flex: '0 0 auto',
                  backgroundColor: selected ? inputFill : 'transparent',
                }}
                onClick={() => setPurposeId(purpose.id)}
              >
                {purpose.label}
              </button>
            )
          })}
        </div>
      ) : null}
      <div
        data-testid="chip-row"
        style={{
          height: '72px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '8px',
          overflow: 'hidden',
        }}
      >
        {slots.map((chip, index) =>
          chip ? (
            <button
              key={chip}
              type="button"
              data-testid="answer-chip"
              aria-disabled={waitingForPurpose ? 'true' : 'false'}
              className="tc-text-sm"
              style={{ ...tap, height: '100%', padding: '4px' }}
              onClick={() => choose(chip)}
            >
              {chipLabel(library, chip)}
            </button>
          ) : (
            <span key={`empty-${index}`} data-testid="chip-slot" aria-hidden="true" />
          ),
        )}
      </div>
      <p data-testid="question-why" className="tc-prose" style={{ margin: 0 }}>
        {question.why}
      </p>
    </article>
  )
}
