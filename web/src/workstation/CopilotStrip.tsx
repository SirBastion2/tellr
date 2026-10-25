import type { CSSProperties } from 'react'
import { listedChipIds, notesOnlyChip, originText, sourceForChip } from '../feed'
import { controlStyle, primaryStyle, secondaryStyle } from '../theme/controls'
import { CheckIcon, DismissIcon } from '../ui/icons'
import { LEVEL_WORD, LevelIcon } from '../ui/LevelIcon'
import type { Library, SessionState } from '../types'
import { Fact, FactGrid } from '../ui/facts'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from '../ui/urgencyScore'

const primary = { ...controlStyle, ...primaryStyle }
const iconButton: CSSProperties = {
  ...controlStyle,
  ...secondaryStyle,
  width: 48,
  padding: 0,
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

function rowState(confirmed: boolean, dismissed: boolean, teller: boolean): 'dismissed' | 'confirmed' | 'auto' {
  if (dismissed) {
    return 'dismissed'
  }
  if (confirmed || teller) {
    return 'confirmed'
  }
  return 'auto'
}

export function CopilotStrip({
  library,
  session,
  postedChipIds,
  confirmed = [],
  dismissed = [],
  chipOrder = [],
  pending,
  idle = false,
  onConfirm,
  onDismiss,
  onRestore,
  onEscalate,
  onUndo,
  closed = false,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds: readonly string[]
  confirmed?: readonly string[]
  dismissed?: readonly string[]
  chipOrder?: readonly string[]
  pending: boolean
  idle?: boolean
  onConfirm?: (chipId: string) => void
  onDismiss?: (chipId: string) => void
  onRestore?: (chipId: string) => void
  onEscalate: () => void
  onUndo?: () => void
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
  const tellerChips = listedChipIds(postedChipIds, session.context_chips, dismissed, chipOrder).filter(
    (chipId) => !notesOnlyChip(library, chipId),
  )

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
          <p data-testid="copilot-level" className="tc-level-badge" data-level={level} style={{ margin: 0 }}>
            {LEVEL_WORD[level]}
          </p>
          <FactGrid label={URGENCY_SCORE_TERM}>
            <Fact term={URGENCY_SCORE_TERM}>
              <span data-testid="copilot-score" title={URGENCY_SCORE_TERM}>
                {formatUrgencyScore(session.risk.score)}
              </span>
            </Fact>
          </FactGrid>
          <p data-testid="copilot-reason" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
            {reason}
          </p>
        </div>
      </div>
      <div
        className="tc-block"
        style={{
          background: 'var(--tc-action-bg)',
          color: 'var(--tc-action-fg)',
          borderRadius: 'var(--tc-radius-card, 16px)',
          padding: 12,
          display: 'grid',
          gap: 6,
        }}
      >
        <p className="tc-kicker">Suggested action</p>
        <p data-testid="copilot-action" className="tc-prose tc-action-copy" style={{ margin: 0, maxWidth: '70ch' }}>
          {action}
        </p>
      </div>
      <details
        open
        className="tc-block"
        data-testid="read-aloud-block"
        style={{
          background: 'var(--tc-quote-bg)',
          color: 'var(--tc-quote-fg)',
          borderLeft: '4px solid var(--tc-quote-border)',
          borderRadius: 'var(--tc-radius-card, 16px)',
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
        {tellerChips.map((chipId) => {
          const source = sourceForChip(session.context_chips, chipId)
          const wasDismissed = dismissed.includes(chipId)
          const state = rowState(confirmed.includes(chipId), wasDismissed, source === 'teller')
          const label = chipLabel(library, chipId)
          const origin = originText(source, confirmed.includes(chipId))
          const actions = Boolean(!closed && onConfirm && onDismiss)
          return (
            <li
              key={chipId}
              data-testid="signal-row"
              data-chip={chipId}
              data-state={state}
              className="tc-signal-row"
            >
              <span className="tc-signal-meta">
                <span>{label}</span>
                <span data-testid="signal-origin" className="tc-badge">
                  {origin}
                </span>
              </span>
              {actions ? (
                wasDismissed ? (
                  <span className="tc-signal-actions">
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="secondary"
                      data-testid="signal-restore"
                      aria-label={`Restore ${label}`}
                      title="Restore signal"
                      style={{ ...controlStyle, ...secondaryStyle }}
                      disabled={pending}
                      onClick={() => onRestore?.(chipId)}
                    >
                      Restore
                    </button>
                  </span>
                ) : (
                  <span className="tc-signal-actions">
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="primary"
                      data-testid="signal-confirm"
                      aria-label={`Confirm ${label}`}
                      title="Confirm signal (C)"
                      style={primary}
                      disabled={pending}
                      onClick={() => onConfirm?.(chipId)}
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
                      disabled={pending}
                      onClick={() => onDismiss?.(chipId)}
                    >
                      <DismissIcon />
                    </button>
                  </span>
                )
              ) : null}
            </li>
          )
        })}
      </ul>
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
