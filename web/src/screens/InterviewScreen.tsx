import { useState } from 'react'
import type { AnswerChipId, AnswerPost, Level, Library, QuestionView, SessionState } from '../types'

const LEVELS: readonly { id: Level; label: string; colour: string }[] = [
  { id: 'clear', label: 'Clear', colour: '#166534' },
  { id: 'caution', label: 'Caution', colour: '#b45309' },
  { id: 'high', label: 'High', colour: '#991b1b' },
]

const RECOMMENDED_STOP = 'You have enough to decide, or ask one more'

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

  function choose(chip: AnswerChipId) {
    if (!onAnswer) {
      return
    }
    if (opener) {
      if (!purposeId) {
        return
      }
      onAnswer({ question_id: question.id, chip, purpose: purposeId })
      return
    }
    onAnswer({ question_id: question.id, chip })
  }

  return (
    <article
      data-testid="question-card"
      data-emphasis={quiet ? 'low' : 'normal'}
      className="space-y-3"
      style={{ opacity: quiet ? 0.55 : 1 }}
    >
      <p data-testid="question-text" className="text-lg">
        {question.text}
      </p>
      <p data-testid="question-why">{question.why}</p>
      {opener ? (
        <div data-testid="purpose-row" className="flex flex-wrap gap-2">
          {(library?.purposes ?? []).map((purpose) => {
            const selected = purposeId === purpose.id
            return (
              <button
                key={purpose.id}
                type="button"
                data-testid="purpose"
                data-selected={selected ? 'true' : 'false'}
                aria-pressed={selected}
                className="min-h-12 border border-stone-900 px-3"
                style={{ backgroundColor: selected ? '#e7e5e4' : 'transparent' }}
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
        className="grid gap-2 overflow-hidden"
        style={{
          height: '72px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        }}
      >
        {slots.map((chip, index) =>
          chip ? (
            <button
              key={chip}
              type="button"
              data-testid="answer-chip"
              className="h-full border border-stone-900 px-2 text-sm"
              disabled={opener && purposeId === null}
              onClick={() => choose(chip)}
            >
              {chipLabel(library, chip)}
            </button>
          ) : (
            <span key={`empty-${index}`} data-testid="chip-slot" aria-hidden="true" />
          ),
        )}
      </div>
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
    <section data-testid="interview-screen" className="space-y-4">
      {session && level ? (
        <>
          <p
            data-testid="risk-level"
            data-level={level.id}
            data-position={String(level.position)}
            style={{ color: level.colour, fontSize: '28px' }}
          >
            {level.label}
          </p>
          <p>
            Score <span data-testid="risk-score">{session.risk.score}</span>
          </p>
          <ol
            data-testid="level-scale"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}
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
          <p data-testid="pattern-label" style={{ fontSize: '14px' }}>
            {session.risk.pattern_label}
          </p>
          {session.stated_purpose ? (
            <p data-testid="stated-purpose">{purposeLabel(library, session.stated_purpose)}</p>
          ) : null}
          {session.risk.reasons.length > 0 ? (
            <ul data-testid="reason-list" className="list-disc pl-5">
              {session.risk.reasons.map((reason) => (
                <li key={reason.id} data-testid="reason">
                  {reason.label}
                </li>
              ))}
            </ul>
          ) : null}
          {session.risk.counterpoint ? (
            <p data-testid="counterpoint">
              {counterpointPrefix(session.risk.level)} {session.risk.counterpoint.label}
            </p>
          ) : null}
          <TalkTrack library={library} session={session} />
          {session.stop?.kind === 'recommended' ? (
            <p data-testid="recommended-stop" data-reason={session.stop.reason}>
              {RECOMMENDED_STOP}
            </p>
          ) : null}
          {session.stop?.kind === 'hard' ? (
            <p data-testid="hard-stop" data-reason={session.stop.reason}>
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
        </>
      ) : null}
    </section>
  )
}
