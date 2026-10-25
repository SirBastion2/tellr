import { Fact, FactGrid, SectionHeading } from '../ui/facts'
import { LevelIcon } from '../ui/LevelIcon'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from '../ui/urgencyScore'
import type { AnswerPost, Level, Library, SessionState } from '../types'
import { QuestionCard } from '../workstation/QuestionCard'

const LEVELS: readonly { id: Level; label: string; colour: string }[] = [
  { id: 'clear', label: 'Clear', colour: '#166534' },
  { id: 'caution', label: 'Caution', colour: '#b45309' },
  { id: 'high', label: 'High', colour: '#991b1b' },
]

const RECOMMENDED_STOP = 'You have enough to decide, or ask one more'

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
    <section data-testid="talk-track" className="space-y-2" style={{ maxWidth: '70ch' }}>
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
      <h2 className="tc-title">This visit</h2>
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
                borderRadius: 'var(--tc-radius-card, 16px)',
                padding: '12px',
              }}
            >
              <p
                data-testid="risk-level"
                data-level={level.id}
                data-position={String(level.position)}
                className="tc-text-2xl"
                style={{ color: level.colour, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}
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
              <p data-testid="pattern-label" className="tc-text-sm" style={{ margin: 0 }}>
                {session.risk.pattern_label}
              </p>
              <FactGrid>
                <Fact term={URGENCY_SCORE_TERM} testId="risk-score">
                  {formatUrgencyScore(session.risk.score)}
                </Fact>
              </FactGrid>
              {session.stated_purpose ? (
                <p data-testid="stated-purpose" style={{ margin: 0 }}>
                  {purposeLabel(library, session.stated_purpose)}
                </p>
              ) : null}
              {session.risk.reasons.length > 0 ? (
                <>
                <SectionHeading>Why it was flagged</SectionHeading>
                <ul data-testid="reason-list" style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {session.risk.reasons.map((reason) => (
                    <li key={reason.id} data-testid="reason">
                      <strong>{reason.label}</strong>
                    </li>
                  ))}
                </ul>
                </>
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
