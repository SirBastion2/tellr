import { controlStyle, primaryStyle } from '../theme/controls'
import { LEVEL_WORD, LevelIcon } from '../ui/LevelIcon'
import type { Library, SessionState } from '../types'

const primary = { ...controlStyle, ...primaryStyle }

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
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds: readonly string[]
  confirmed: readonly string[]
  pending: boolean
  onConfirm: (chipId: string) => void
  onDismiss: (chipId: string) => void
  onEscalate: () => void
}) {
  const level = session?.risk.level ?? 'clear'
  const reason = session?.risk.reasons[0]?.label ?? 'No concern flagged'
  const action = session ? suggestedAction(session) : ''
  const script = session ? readAloud(session) : ''

  return (
    <aside aria-label="Copilot" data-testid="copilot-strip" className="tc-strip" data-level={level}>
      <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        <LevelIcon level={level} />
        <span data-testid="copilot-level">{LEVEL_WORD[level]}</span>
      </h2>
      <p data-testid="copilot-reason" style={{ margin: 0 }}>
        {reason}
      </p>
      {session ? (
        <>
          <p style={{ margin: 0 }}>
            Suggested next action{' '}
            <span data-testid="copilot-action">{action}</span>
          </p>
          <p style={{ margin: 0 }}>
            Read-aloud script <span data-testid="read-aloud">{script}</span>
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {postedChipIds.map((chipId) => {
              const state = confirmed.includes(chipId) ? 'confirmed' : 'auto'
              return (
                <li key={chipId} data-testid="signal-row" data-state={state} style={{ display: 'grid', gap: 6 }}>
                  <span>
                    {chipLabel(library, chipId)}{' '}
                    <span data-testid="signal-origin">{state === 'confirmed' ? 'Teller confirmed' : 'Auto-detected'}</span>
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="primary"
                      data-testid="signal-confirm"
                      title="Confirm signal (C)"
                      style={primary}
                      onClick={() => onConfirm(chipId)}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="secondary"
                      data-testid="signal-dismiss"
                      title="Dismiss signal (D)"
                      style={{ ...controlStyle, color: 'inherit' }}
                      onClick={() => onDismiss(chipId)}
                    >
                      Dismiss
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            className="tc-btn"
            data-variant="danger"
            data-testid="escalate"
            title="Escalate to supervisor (E)"
            data-loading={pending ? 'true' : 'false'}
            aria-busy={pending}
            style={{ ...controlStyle, backgroundColor: 'var(--tc-risk-high-bg)', color: 'var(--tc-risk-high-fg)' }}
            onClick={onEscalate}
          >
            Escalate to supervisor
          </button>
        </>
      ) : (
        <p style={{ margin: 0 }}>Start a simulated customer to see the copilot.</p>
      )}
    </aside>
  )
}
