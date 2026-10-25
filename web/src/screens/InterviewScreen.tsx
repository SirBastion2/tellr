import { useState } from 'react'
import type { CSSProperties } from 'react'
import { controlStyle, inputFill, mutedColor, textColor } from '../theme/controls'
import { LevelIcon } from '../ui/LevelIcon'
import type { AnswerChipId, AnswerPost, Level, Library, QuestionView, SessionState } from '../types'

const LEVELS: readonly { id: Level; label: string; colour: string }[] = [
  { id: 'clear', label: 'Clear', colour: '#166534' },
  { id: 'caution', label: 'Caution', colour: '#b45309' },
  { id: 'high', label: 'High', colour: '#991b1b' },
]

const RECOMMENDED_STOP = 'You have enough to decide, or ask one more'
const QUIET_OPACITY = 0.7

const tap: CSSProperties = {
  ...controlStyle,
  padding: '4px',
}

function chipLabel(library: Library | null, id: string): string {
  return library?.chips.find((chip) => chip.id === id)?.label ?? id
}

function purposeLabel(library: Library | null, id: string): string {
  return library?.purposes.find((purpose) => purpose.id === id)?.label ?? id
}

function shownLevel(level: Level): { id: Level; label: string; colour: string; position: number } {
  const position = LEVELS.findIndex((item) => item.id === level)
  const item = LEVELS[position]
  if (!item || position < 0) {
    return { id: level, label: level, colour: '#44403c', position: 0 }
  }
  return { ...item, position }
}

function counterpointPrefix(level: Level): string {
  return level === 'clear' ? 'Still noted:' : 'In their favor:'
}

function TalkTrack({ library, session }: { library: Library | null; session: SessionState }) {
  const stage = library?.talk_tracks.find((track) => track.id === session.talk_track.stage)
  const patternDisplayed = session.risk.pattern?.kind === 'pattern'
  const patternTrack =
    patternDisplayed && session.talk_track.pattern
      ? library?.talk_tracks.find((track) => track.id === session.talk_track.pattern)
      : undefined
  const stageLines = stage?.lines ?? session.talk_track.lines
  const patternLines = stage && patternTrack ? patternTrack.lines : []
  const avoid = stage?.avoid ?? session.talk_track.avoid

  return (
    <section data-testid="talk-track" className="space-y-2">
      <ul data-testid="talk-stage-lines">
        {stageLines.map((line, index) => (
          <li key={`stage-${index}`} data-testid="talk-stage-line">
            {line}
          </li>
        ))}
      </ul>
      {patternLines.length > 0 ? (
        <ul data-testid="talk-pattern-lines">
          {patternLines.map((line, index) => (
            <li key={`pattern-${index}`} data-testid="talk-pattern-line">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      <ul data-testid="talk-avoid">
        {avoid.map((phrase, index) => (
          <li key={`avoid-${index}`} data-testid="avoid-phrase">
            {phrase}
          </li>
        ))}
      </ul>
    </section>
  )
}

function QuestionCard({
  library,
  question,
  quiet,
  onAnswer,
}: {
  library: Library | null
  question: QuestionView
  quiet: boolean
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
      <p data-testid="question-text" style={{ margin: 0, fontSize: '18px', lineHeight: 1.3 }}>
        {question.text}
      </p>
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
              style={{ ...tap, height: '100%', padding: '4px', fontSize: '14px', lineHeight: 1.2 }}
              onClick={() => choose(chip)}
            >
              {chipLabel(library, chip)}
            </button>
          ) : (
            <span key={`empty-${index}`} data-testid="chip-slot" aria-hidden="true" />
          ),
        )}
      </div>
      <p data-testid="question-why" style={{ margin: 0, color: mutedColor }}>
        {question.why}
      </p>
    </article>
  )
}

export function InterviewScreen({
  library,
  session,
  onAnswer,
}: {
  library: Library | null
  session: SessionState | null
  onAnswer?: (answer: AnswerPost) => void
}) {
  const level = session ? shownLevel(session.risk.level) : null

  return (
    <section data-testid="interview-screen" style={{ display: 'grid', gap: '12px' }}>
      <h2 className="tc-sr">Session</h2>
      {session && level ? (
        <>
          <div
            data-testid="counter-fold"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 260px) minmax(0, 1fr)',
              columnGap: '16px',
              alignItems: 'start',
            }}
          >
            <div
              style={{
                display: 'grid',
                gap: '8px',
                alignContent: 'start',
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                color: '#1c1917',
                borderRadius: '16px',
                padding: '12px',
              }}
            >
              <p
                data-testid="risk-level"
                data-level={level.id}
                data-position={String(level.position)}
                style={{ color: level.colour, fontSize: '28px', margin: 0, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <LevelIcon level={level.id} />{level.label}
              </p>
              <ol
                data-testid="level-scale"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', margin: 0 }}
              >
                {LEVELS.map((item, position) => {
                  const active = item.id === session.risk.level
                  return (
                    <li
                      key={item.id}
                      data-testid="level-slot"
                      data-level={item.id}
                      data-position={String(position)}
                      data-active={active ? 'true' : 'false'}
                      aria-current={active ? 'step' : undefined}
                      style={{
                        backgroundColor: active ? item.colour : 'transparent',
                        color: active ? '#ffffff' : item.colour,
                        border: `2px solid ${item.colour}`,
                        minHeight: '48px',
                        textAlign: 'center',
                      }}
                    >
                      {item.label}
                    </li>
                  )
                })}
              </ol>
              <p data-testid="pattern-label" style={{ fontSize: '14px', margin: 0 }}>
                {session.risk.pattern_label}
              </p>
              <p style={{ margin: 0 }}>
                Score <span data-testid="risk-score">{session.risk.score}</span>
              </p>
              {session.stated_purpose ? (
                <p data-testid="stated-purpose" style={{ margin: 0 }}>
                  {purposeLabel(library, session.stated_purpose)}
                </p>
              ) : null}
              {session.risk.reasons.length > 0 ? (
                <ul data-testid="reason-list" style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {session.risk.reasons.map((reason) => (
                    <li key={reason.id} data-testid="reason">
                      {reason.label}
                    </li>
                  ))}
                </ul>
              ) : null}
              {session.risk.counterpoint ? (
                <p data-testid="counterpoint" style={{ margin: 0 }}>
                  {counterpointPrefix(session.risk.level)} {session.risk.counterpoint.label}
                </p>
              ) : null}
            </div>
            <div style={{ display: 'grid', gap: '8px', alignContent: 'start' }}>
              {session.stop?.kind === 'recommended' ? (
                <p data-testid="recommended-stop" data-reason={session.stop.reason} style={{ margin: 0 }}>
                  {RECOMMENDED_STOP}
                </p>
              ) : null}
              {session.stop?.kind === 'hard' ? (
                <p data-testid="hard-stop" data-reason={session.stop.reason} style={{ margin: 0 }}>
                  {session.stop.reason}
                </p>
              ) : null}
              {session.question ? (
                <QuestionCard
                  key={session.question.id}
                  library={library}
                  question={session.question}
                  quiet={session.stop?.kind === 'recommended'}
                  onAnswer={onAnswer}
                />
              ) : null}
            </div>
          </div>
          <TalkTrack library={library} session={session} />
        </>
      ) : null}
    </section>
  )
}
