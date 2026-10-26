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
  body?: string
  confirmLabel: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const description = body?.trim() ?? ''
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? 'confirm-body' : undefined}
      data-testid="confirm-dialog"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        display: 'grid',
        placeItems: 'center',
        zIndex: 20,
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--tc-glass-fill, rgba(255, 255, 255, 0.18))',
          border: '1px solid var(--tc-glass-border, rgba(255, 255, 255, 0.35))',
          backdropFilter: 'blur(var(--tc-glass-blur, 20px))',
          WebkitBackdropFilter: 'blur(var(--tc-glass-blur, 20px))',
          color: 'var(--tc-text, #fff)',
          borderRadius: 'var(--tc-radius-card, 16px)',
          padding: 16,
          maxWidth: 420,
          display: 'grid',
          gap: 12,
        }}
      >
        <h2 id="confirm-title" className="tc-title" style={{ margin: 0 }}>
          {title}
        </h2>
        {description ? (
          <p id="confirm-body" className="tc-prose" style={{ margin: 0 }}>
            {description}
          </p>
        ) : null}
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
