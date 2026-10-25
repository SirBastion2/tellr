/**
 * Light-mode solid pairs. Nested action, quote, chip, and secondary
 * surfaces paint their own background so labels stay readable.
 */
export const SOLID_CONTROLS = {
  secondaryBg: '#F8FAFC',
  secondaryFg: '#1C1917',
  secondaryBorder: '#1C1917',
  chipBg: '#111827',
  chipFg: '#F9FAFB',
  actionBg: '#FFFFFF',
  actionFg: '#1C1917',
  quoteBg: '#FFFBEB',
  quoteFg: '#1C1917',
  quoteBorder: '#92400E',
  focus: '#1C1917',
} as const

/**
 * Dark-mode solid pairs. Same roles as SOLID_CONTROLS, tuned for a
 * dark surface so the copilot card follows Light/Dark instead of a
 * beige caution panel.
 */
export const DARK_CONTROLS = {
  secondaryBg: '#1C1917',
  secondaryFg: '#F8FAFC',
  secondaryBorder: '#E7E5E4',
  chipBg: '#111827',
  chipFg: '#F9FAFB',
  actionBg: '#111827',
  actionFg: '#F8FAFC',
  quoteBg: '#422006',
  quoteFg: '#FFEDD5',
  quoteBorder: '#FBBF24',
  focus: '#E7E5E4',
} as const

/** Caution and High on a dark surface. Clear is bank-tinted per theme. */
export const DARK_RISK = {
  cautionBg: '#9A3412',
  cautionFg: '#FFEDD5',
  highBg: '#7F1D1D',
  highFg: '#FFFFFF',
} as const
