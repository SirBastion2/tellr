import { Fragment, useEffect, useRef } from 'react'
import { controlStyle } from '../theme/controls'

const ROWS: readonly { keys: readonly string[]; what: string }[] = [
  { keys: ['?'], what: 'Show or hide this list' },
  { keys: ['P'], what: 'Play or pause the simulation' },
  { keys: ['Right'], what: 'Speed playback up: 1×, then 2×, then 4×' },
  { keys: ['Left'], what: 'Slow playback down. Works above 1×' },
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
        background: 'transparent',
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
          padding: 24,
          maxWidth: 520,
          width: 'min(520px, 100%)',
          display: 'grid',
          gap: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        }}
      >
        <h2 id="shortcut-title" className="tc-title">
          Keyboard shortcuts
        </h2>
        <dl
          data-testid="shortcut-list"
          aria-label="Keyboard shortcuts"
          style={{
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'max-content 1fr',
            columnGap: 16,
            rowGap: 12,
            alignItems: 'center',
            fontSize: 20,
            lineHeight: 1.4,
            fontWeight: 400,
          }}
        >
          {ROWS.map((row) => (
            <Fragment key={row.keys.join('-')}>
              <dt
                data-testid="shortcut-row"
                style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, fontWeight: 400 }}
              >
                {row.keys.map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 ? <span style={{ opacity: 0.7 }}>and</span> : null}
                    <kbd
                      style={{
                        minWidth: 34,
                        padding: '2px 8px',
                        textAlign: 'center',
                        borderRadius: 7,
                        border: '1px solid color-mix(in srgb, currentColor 45%, transparent)',
                        background: 'color-mix(in srgb, currentColor 10%, transparent)',
                        fontFamily: 'inherit',
                        fontSize: 20,
                        fontWeight: 600, lineHeight: 1.3,
                      }}
                    >
                      {key}
                    </kbd>
                  </Fragment>
                ))}
              </dt>
              <dd style={{ margin: 0, fontWeight: 400 }}>{row.what}</dd>
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
