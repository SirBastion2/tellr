import { controlStyle, secondaryStyle } from '../theme/controls'
import { LEVEL_WORD, LevelIcon } from '../ui/LevelIcon'
import type { AnswerPost, Library, SessionState } from '../types'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from '../ui/urgencyScore'
import { QuestionCard } from './QuestionCard'

export function suggestedAction(session: SessionState): string {
  if (session.question?.text) {
    return session.question.text
  }
  return session.talk_track.lines[0] ?? ''
}

export function readAloud(session: SessionState): string {
  return session.talk_track.lines.join(' ')
}

export function CopilotStrip({
  library,
  session,
  pending,
  idle = false,
  onEscalate,
  onUndo,
  onAnswer,
  closed = false,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds: readonly string[]
  confirmed?: readonly string[]
  dismissed?: readonly string[]
  pending: boolean
  idle?: boolean
  onConfirm?: (chipId: string) => void
  onDismiss?: (chipId: string) => void
  onRestore?: (chipId: string) => void
  onEscalate: () => void
  onUndo?: () => void
  onAnswer?: (answer: AnswerPost) => void
  closed?: boolean
}) {
  if (idle) {
    return (
      <aside aria-label="Copilot" data-testid="copilot-strip" className="tc-strip" data-idle="true">
        <p data-testid="copilot-idle" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Press play to start the simulation.
        </p>
      </aside>
    )
  }

  if (!session) {
    return (
      <aside
        aria-label="Copilot"
        data-testid="copilot-strip"
        className="tc-strip"
        aria-busy={pending}
        data-updating={pending ? 'true' : undefined}
      >
        <p data-testid="copilot-updating" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Updating copilot…
        </p>
      </aside>
    )
  }

  const level = session.risk.level
  const reason = session.risk.reasons[0]?.label ?? session.risk.counterpoint?.label ?? 'No concern flagged'
  const action = suggestedAction(session)
  const script = readAloud(session)

  return (
    <aside
      aria-label="Copilot"
      data-testid="copilot-strip"
      className="tc-strip"
      data-level={level}
      aria-busy={pending}
      data-updating={pending ? 'true' : undefined}
    >
      {pending ? (
        <p data-testid="copilot-updating" className="tc-strip-updating">
          <span className="tc-inline-spinner" aria-hidden="true" />
          Updating copilot…
        </p>
      ) : null}
      <div className="tc-strip-body" data-dimmed={pending ? 'true' : 'false'}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
        <LevelIcon level={level} />
        <div style={{ minWidth: 0 }}>
          <p data-testid="copilot-level" className="tc-level-badge" data-level={level} style={{ margin: 0, lineHeight: 1.2 }}>
            {LEVEL_WORD[level]}
          </p>
          <p className="tc-prose" style={{ margin: 0, lineHeight: 1.2 }}>
            <span className="tc-kicker">{URGENCY_SCORE_TERM}</span>{' '}
            <span data-testid="copilot-score" title={URGENCY_SCORE_TERM}>
              {formatUrgencyScore(session.risk.score)}
            </span>
          </p>
          <p data-testid="copilot-reason" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
            {reason}
          </p>
        </div>
      </div>
      <div
        style={{
          background: 'var(--tc-action-bg)',
          color: 'var(--tc-action-fg)',
          borderRadius: 12,
          padding: 12,
          display: 'grid',
          gap: 6,
        }}
      >
        <p className="tc-kicker">Suggested action</p>
        <p data-testid="copilot-action" className="tc-prose tc-action-copy" style={{ margin: 0, lineHeight: 1.25, fontWeight: 700, maxWidth: '70ch' }}>
          {action}
        </p>
        {session.question && !closed ? (
          <div data-testid="answer-panel" style={{ display: 'grid', gap: 8 }}>
            <p className="tc-kicker">How did they answer?</p>
            <QuestionCard
              key={session.question.id}
              library={library}
              question={session.question}
              quiet={session.stop?.kind === 'recommended'}
              hidePrompt
              onAnswer={onAnswer}
            />
          </div>
        ) : null}
      </div>
      <details
        open
        data-testid="read-aloud-block"
        style={{
          background: 'var(--tc-quote-bg)',
          color: 'var(--tc-quote-fg)',
          borderLeft: '4px solid var(--tc-quote-border)',
          borderRadius: 8,
          padding: '8px 12px',
        }}
      >
        <summary style={{ cursor: 'pointer', minHeight: 48, display: 'flex', alignItems: 'center' }}>
          <span className="tc-kicker">Read-aloud script</span>
        </summary>
        <blockquote data-testid="read-aloud" className="tc-prose" style={{ margin: '8px 0 0', maxWidth: '70ch' }}>
          {script}
        </blockquote>
      </details>
      {closed ? (
        <p className="tc-prose" style={{ margin: 0 }}>
          This visit is closed.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {onUndo ? (
            <button
              type="button"
              className="tc-btn"
              data-variant="secondary"
              data-testid="undo"
              title="Undo the last signal"
              style={{ ...controlStyle, ...secondaryStyle }}
              disabled={pending}
              onClick={() => onUndo()}
            >
              Undo
            </button>
          ) : null}
          <button
            type="button"
            className="tc-btn"
            data-variant="danger"
            data-testid="escalate"
            title="Escalate to supervisor (E)"
            data-loading={pending ? 'true' : 'false'}
            aria-busy={pending}
            disabled={pending}
            style={{
              ...controlStyle,
              backgroundColor: 'var(--tc-risk-high-bg)',
              color: 'var(--tc-risk-high-fg)',
              borderColor: 'transparent',
              flex: '1 1 12rem',
            }}
            onClick={onEscalate}
          >
            Escalate to supervisor
          </button>
        </div>
      )}
      </div>
    </aside>
  )
}
