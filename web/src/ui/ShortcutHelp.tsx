import { Fragment, useEffect, useRef } from 'react'
import { controlStyle } from '../theme/controls'

const ROWS: readonly { keys: readonly string[]; what: string }[] = [
  { keys: ['?'], what: 'Show or hide this list' },
  { keys: ['P'], what: 'Play or pause the simulation' },
  { keys: ['N'], what: 'Step one customer event' },
  { keys: ['R'], what: 'Restart the simulation' },
  { keys: ['C'], what: 'Confirm the latest signal' },
  { keys: ['D'], what: 'Dismiss the latest signal' },
  { keys: ['E'], what: 'Escalate to the supervisor' },
  { keys: ['[', ']'], what: 'Switch simulated customer' },
  { keys: ['T'], what: 'Switch bank theme' },
]

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-title"
      data-testid="shortcut-help"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 20,
        padding: 'var(--tc-space-4)',
      }}
    >
      <div
        style={{
          background: 'var(--tc-glass-fallback, #1e1b4b)',
          color: 'var(--tc-text, #fff)',
          borderRadius: 'var(--tc-radius-card, 16px)',
          padding: 'var(--tc-space-4)',
          maxWidth: 480,
          width: 'min(480px, 100%)',
          display: 'grid',
          gap: 'var(--tc-space-3)',
        }}
      >
        <h2 id="shortcut-title" className="tc-title">
          Keyboard shortcuts
        </h2>
        <dl className="tc-facts" data-testid="shortcut-list" aria-label="Keyboard shortcuts">
          {ROWS.map((row) => (
            <Fragment key={row.keys.join('-')}>
              <dt className="tc-fact-term" data-testid="shortcut-row">
                {row.keys.map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 ? ' and ' : null}
                    <kbd>{key}</kbd>
                  </Fragment>
                ))}{' '}
              </dt>
              <dd className="tc-fact-value">{row.what}</dd>
            </Fragment>
          ))}
        </dl>
        <button
          ref={closeRef}
          type="button"
          className="tc-btn"
          data-variant="primary"
          data-testid="shortcut-close"
          style={controlStyle}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}
