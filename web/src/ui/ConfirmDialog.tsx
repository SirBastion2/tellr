import { useEffect, useRef } from 'react'
import { controlStyle } from '../theme/controls'

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      data-testid="confirm-dialog"
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
          maxWidth: 420,
          display: 'grid',
          gap: 12,
        }}
      >
        <h2 id="confirm-title" style={{ margin: 0, fontSize: 20 }}>
          {title}
        </h2>
        <p id="confirm-body" style={{ margin: 0 }}>
          {body}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="tc-btn"
            data-variant="danger"
            data-testid="confirm-accept"
            data-loading={pending ? 'true' : 'false'}
            aria-busy={pending}
            style={{ ...controlStyle, backgroundColor: 'var(--tc-risk-high-bg)', color: 'var(--tc-risk-high-fg)' }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            className="tc-btn"
            data-variant="secondary"
            data-testid="confirm-cancel"
            style={controlStyle}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
