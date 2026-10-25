import { useEffect, useRef } from 'react'
import { controlStyle } from '../theme/controls'

const ROWS: readonly { keys: string; what: string }[] = [
  { keys: '?', what: 'Show or hide this list' },
  { keys: 'P', what: 'Play or pause the simulation' },
  { keys: 'N', what: 'Step one customer event' },
  { keys: 'R', what: 'Restart the simulation' },
  { keys: 'C', what: 'Confirm the latest signal' },
  { keys: 'D', what: 'Dismiss the latest signal' },
  { keys: 'E', what: 'Escalate to the supervisor' },
  { keys: '[ and ]', what: 'Switch simulated customer' },
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
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--tc-glass-fallback, #1e1b4b)',
          color: 'var(--tc-text, #fff)',
          borderRadius: 'var(--tc-radius-card, 16px)',
          padding: 16,
          maxWidth: 480,
          width: 'min(480px, 100%)',
          display: 'grid',
          gap: 12,
        }}
      >
        <h2 id="shortcut-title" style={{ margin: 0, fontSize: 20 }}>
          Keyboard shortcuts
        </h2>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {ROWS.map((row) => (
            <li key={row.keys}>
              <kbd>{row.keys}</kbd> {row.what}
            </li>
          ))}
        </ul>
        <p data-testid="shortcut-scope" style={{ margin: 0, fontSize: 14 }}>
          These keys work on every screen, including Customer file, Outcome, and Handoff.
          They do nothing while you type in a field, or while Ctrl, Alt, or Cmd is held.
        </p>
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
