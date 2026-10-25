import type { CSSProperties } from 'react'

/** Shared control surface. Colors come from the active theme's tokens, with a light fallback. */
export const controlStyle: CSSProperties = {
  minHeight: '48px',
  minWidth: '48px',
  boxSizing: 'border-box',
  color: 'var(--tc-text, #1c1917)',
  backgroundColor: 'transparent',
  border: 'var(--tc-border-width, 1px) var(--tc-border-style, solid) var(--tc-accent, #1c1917)',
  borderRadius: 'var(--tc-radius-control, 999px)',
  fontFamily: 'inherit',
  fontWeight: 'var(--tc-font-weight, 500)' as CSSProperties['fontWeight'],
  padding: '0 12px',
}

export const inputFill = 'var(--tc-input, #e7e5e4)'

export const textColor = 'var(--tc-text, #1c1917)'

export const mutedColor = 'var(--tc-muted, #44403c)'

export const buttonFill = 'var(--tc-button, transparent)'

export const buttonText = 'var(--tc-button-text, #1c1917)'

export const primaryStyle: CSSProperties = {
  backgroundColor: buttonFill,
  color: buttonText,
  borderColor: 'transparent',
}
