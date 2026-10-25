import type { CSSProperties } from 'react'
import { controlStyle, primaryStyle, secondaryStyle } from '../theme/controls'
import { CheckIcon, DismissIcon } from '../ui/icons'
import { LEVEL_WORD, LevelIcon } from '../ui/LevelIcon'
import { listedChipIds, originText, sourceForChip } from '../feed'
import type { AnswerPost, Library, SessionState } from '../types'
import { QuestionCard } from './QuestionCard'

const primary = { ...controlStyle, ...primaryStyle }
const iconButton: CSSProperties = {
  ...controlStyle,
  ...secondaryStyle,
  width: 48,
  padding: 0,
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'start',
  minHeight: 24,
  padding: '0 8px',
  borderRadius: 999,
  background: 'var(--tc-chip-bg)',
  color: 'var(--tc-chip-fg)',
  fontSize: '0.75rem',
  fontWeight: 700,
}

function chipLabel(library: Library | null, id: string): string {
  return library?.context_chips.find((chip) => chip.id === id)?.label ?? id
}

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
  postedChipIds,
  confirmed,
  pending,
  onConfirm,
  onDismiss,
  onEscalate,
  onUndo,
  onAnswer,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds: readonly string[]
  confirmed: readonly string[]
  pending: boolean
  onConfirm: (chipId: string) => void
  onDismiss: (chipId: string) => void
  onEscalate: () => void
  onUndo?: () => void
  onAnswer?: (answer: AnswerPost) => void
}) {
  const level = session?.risk.level ?? 'clear'
  const reason =
    session?.risk.reasons[0]?.label ?? session?.risk.counterpoint?.label ?? 'No concern flagged'
  const action = session ? suggestedAction(session) : ''
  const script = session ? readAloud(session) : ''

  return (
    <aside aria-label="Copilot" data-testid="copilot-strip" className="tc-strip" data-level={level}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
        <LevelIcon level={level} />
        <div style={{ minWidth: 0 }}>
          <p data-testid="copilot-level" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>
            {LEVEL_WORD[level]}
          </p>
          <p data-testid="copilot-reason" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
            {reason}
          </p>
        </div>
      </div>
      {session ? (
        <>
          <div
            style={{
              background: 'var(--tc-action-bg)',
              color: 'var(--tc-action-fg)',
              borderRadius: 12,
              padding: 16,
              display: 'grid',
              gap: 8,
            }}
          >
            <p className="tc-kicker">Suggested action</p>
            <p data-testid="copilot-action" className="tc-prose" style={{ margin: 0, fontSize: 'clamp(1.35rem, 1.4vw, 1.85rem)', lineHeight: 1.25, fontWeight: 700, maxWidth: '70ch' }}>
              {action}
            </p>
            {session.question ? (
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
          <ul aria-label="Signals" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {listedChipIds(postedChipIds, session.context_chips).map((chipId) => {
              const source = sourceForChip(session.context_chips, chipId)
              const state = confirmed.includes(chipId) || source === 'teller' ? 'confirmed' : 'auto'
              const label = chipLabel(library, chipId)
              const origin = originText(source, confirmed.includes(chipId))
              return (
                <li
                  key={chipId}
                  data-testid="signal-row"
                  data-state={state}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                    <span>{label}</span>
                    <span data-testid="signal-origin" className="tc-badge" style={badgeStyle}>
                      {origin}
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="primary"
                      data-testid="signal-confirm"
                      aria-label={`Confirm ${label}`}
                      title="Confirm signal (C)"
                      style={primary}
                      onClick={() => onConfirm(chipId)}
                    >
                      <CheckIcon />
                    </button>
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="dismiss"
                      data-testid="signal-dismiss"
                      aria-label={`Dismiss ${label}`}
                      title="Dismiss signal (D)"
                      style={iconButton}
                      onClick={() => onDismiss(chipId)}
                    >
                      <DismissIcon />
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {onUndo ? (
              <button
                type="button"
                className="tc-btn"
                data-variant="secondary"
                data-testid="undo"
                title="Undo the last signal"
                style={{ ...controlStyle, ...secondaryStyle }}
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
        </>
      ) : (
        <p className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Press play to start.
        </p>
      )}
    </aside>
  )
}
