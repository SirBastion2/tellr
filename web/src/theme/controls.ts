import type { CSSProperties } from 'react'
import { DENSITY } from './tokens'

/** Shared control surface. Colors come from the active theme's tokens, with a light fallback. */
export const controlStyle: CSSProperties = {
  minHeight: DENSITY.controlHeight,
  minWidth: DENSITY.controlHeight,
  boxSizing: 'border-box',
  color: 'var(--tc-text, #1c1917)',
  backgroundColor: 'transparent',
  border: 'var(--tc-border-width, 1px) var(--tc-border-style, solid) var(--tc-accent, #1c1917)',
  borderRadius: 'var(--tc-radius-control, 999px)',
  fontFamily: 'inherit',
  fontWeight: 'var(--tc-font-weight, 400)' as CSSProperties['fontWeight'],
  padding: 'var(--tc-space-control-pad-y, 8px) var(--tc-space-control-pad-x, 12px)',
}

/** Header chrome. Shared height and pill radius; colors stay on the active theme. */
export const headerControlStyle: CSSProperties = {
  ...controlStyle,
  height: DENSITY.headerControlHeight,
  minHeight: DENSITY.headerControlHeight,
  minWidth: DENSITY.headerControlHeight,
  borderRadius: 'var(--tc-header-radius, 999px)',
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

/** Filled secondary. Text does not inherit a risk-panel color. */
export const secondaryStyle: CSSProperties = {
  backgroundColor: 'var(--tc-secondary-bg, #f8fafc)',
  color: 'var(--tc-secondary-fg, #1c1917)',
  borderColor: 'var(--tc-secondary-border, #1c1917)',
}

export const linkStyle: CSSProperties = {
  ...controlStyle,
  backgroundColor: 'transparent',
  color: 'var(--tc-link, #1c1917)',
  borderColor: 'transparent',
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
}
