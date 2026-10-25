/**
 * Shared type scale. This is the only file that may contain raw font-size
 * values. Components and `index.css` read `--tc-text-*` (or a role alias).
 *
 * Themes may change font FAMILY and color. Size, line-height, weight,
 * tracking, and transform stay here so tellr / pnc / mtb / fnb match.
 *
 * `rem` is relative to `html`. Demo layout is always on, so `html` is 105%
 * (`TYPE_ROOT.demo`). Theme-root stays 100% so rem and inherited size do
 * not double-scale.
 *
 * `FONT_SIZE_ADJUST` is Arial's x-height. Every theme root applies it so
 * Poppins and Segoe UI render at the same apparent size as Arial.
 */
export const TYPE_STEPS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const

export type TypeStep = (typeof TYPE_STEPS)[number]

export const TYPE_SIZE: Record<TypeStep, string> = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
}

export const TYPE_LINE: Record<TypeStep, string> = {
  xs: '1.2',
  sm: '1.2',
  base: '1.5',
  lg: '1.25',
  xl: '1.2',
  '2xl': '1.2',
}

export const TYPE_STEP_WEIGHT: Record<TypeStep, string> = {
  xs: '700',
  sm: '600',
  base: '400',
  lg: '600',
  xl: '700',
  '2xl': '700',
}

export const TYPE_WEIGHT = {
  body: '400',
  medium: '500',
  heading: '600',
  strong: '700',
} as const

/**
 * Foreground tints mixed with `currentColor` / `--tc-text`.
 * Soft started at 0.68; that missed WCAG AA on mtb light page (4.45:1).
 * 0.69 is the lowest value that clears 4.5:1 on every bank surface.
 */
export const TYPE_FG = {
  soft: 0.69,
  body: 0.85,
  line: 0.18,
} as const

export const TYPE_FG_PCT = {
  soft: `${Math.round(TYPE_FG.soft * 100)}%`,
  body: `${Math.round(TYPE_FG.body * 100)}%`,
  line: `${Math.round(TYPE_FG.line * 100)}%`,
} as const

export const TYPE_LINE_ROLE = {
  body: '1.5',
  heading: '1.2',
  ui: '1.2',
} as const

export const TYPE_TRACKING = {
  none: 'normal',
  wordmark: '0.02em',
  kicker: '0.08em',
} as const

export const TYPE_TRANSFORM = {
  none: 'none',
  kicker: 'uppercase',
} as const

/** Arial aspect value. Applied on every bank, not only tellr. */
export const FONT_SIZE_ADJUST = '0.52'

/**
 * Demo is always on. `html` uses `demo`; the theme root uses `live`.
 * `compact` / `short` keep the same step ratios and only drop the root
 * when the viewport is short (`VIEWPORT_FIT` in tokens.ts). Both are
 * 87.5% of the 16px browser default, so body text stays at 14px.
 */
export const TYPE_ROOT = {
  demo: '105%',
  live: '100%',
  compact: '87.5%',
  short: '87.5%',
} as const

/** Line-heights when the viewport is at most 860px tall. Same steps, tighter leading. */
export const TYPE_LINE_COMPACT: Record<TypeStep, string> = {
  xs: '1.1',
  sm: '1.1',
  base: '1.25',
  lg: '1.1',
  xl: '1.1',
  '2xl': '1.05',
}

/** Line-heights when the viewport is at most 760px tall. */
export const TYPE_LINE_SHORT: Record<TypeStep, string> = {
  xs: '1.05',
  sm: '1.05',
  base: '1.2',
  lg: '1.05',
  xl: '1.05',
  '2xl': '1.05',
}

export const TYPE_LINE_ROLE_COMPACT = {
  body: TYPE_LINE_COMPACT.base,
  heading: TYPE_LINE_COMPACT.xl,
  ui: TYPE_LINE_COMPACT.sm,
} as const

export const TYPE_LINE_ROLE_SHORT = {
  body: TYPE_LINE_SHORT.base,
  heading: TYPE_LINE_SHORT.xl,
  ui: TYPE_LINE_SHORT.sm,
} as const

/**
 * Semantic roles → scale steps. Simulation bar, pills, answers, urgency,
 * signals, Handoff, Outcome, and buttons pick a role, not a raw size.
 */
export const TYPE_ROLE = {
  kicker: 'xs',
  badge: 'xs',
  footer: 'xs',
  updating: 'xs',
  pill: 'sm',
  nav: 'sm',
  kv: 'sm',
  label: 'sm',
  pattern: 'sm',
  chip: 'sm',
  body: 'base',
  section: 'base',
  tag: 'xs',
  caption: 'base',
  header: 'lg',
  level: 'lg',
  question: 'lg',
  title: 'xl',
  display: 'xl',
  dialog: 'xl',
  action: 'xl',
  amount: '2xl',
} as const

export type TypeRole = keyof typeof TYPE_ROLE

export function typeVar(step: TypeStep): string {
  return `var(--tc-text-${step})`
}

export function typeLineVar(step: TypeStep): string {
  return `var(--tc-text-${step}-lh)`
}

export function typeWeightVar(step: TypeStep): string {
  return `var(--tc-text-${step}-weight)`
}

export function roleVar(role: TypeRole): string {
  return typeVar(TYPE_ROLE[role])
}

/** CSS custom properties. `vars.ts` and `:root` both emit these. */
export const TYPE_VARS: Record<string, string> = {
  '--tc-text-xs': TYPE_SIZE.xs,
  '--tc-text-sm': TYPE_SIZE.sm,
  '--tc-text-base': TYPE_SIZE.base,
  '--tc-text-lg': TYPE_SIZE.lg,
  '--tc-text-xl': TYPE_SIZE.xl,
  '--tc-text-2xl': TYPE_SIZE['2xl'],
  '--tc-text-xs-lh': TYPE_LINE.xs,
  '--tc-text-sm-lh': TYPE_LINE.sm,
  '--tc-text-base-lh': TYPE_LINE.base,
  '--tc-text-lg-lh': TYPE_LINE.lg,
  '--tc-text-xl-lh': TYPE_LINE.xl,
  '--tc-text-2xl-lh': TYPE_LINE['2xl'],
  '--tc-text-xs-weight': TYPE_STEP_WEIGHT.xs,
  '--tc-text-sm-weight': TYPE_STEP_WEIGHT.sm,
  '--tc-text-base-weight': TYPE_STEP_WEIGHT.base,
  '--tc-text-lg-weight': TYPE_STEP_WEIGHT.lg,
  '--tc-text-xl-weight': TYPE_STEP_WEIGHT.xl,
  '--tc-text-2xl-weight': TYPE_STEP_WEIGHT['2xl'],
  '--tc-type-line-body': TYPE_LINE_ROLE.body,
  '--tc-type-line-heading': TYPE_LINE_ROLE.heading,
  '--tc-type-line-ui': TYPE_LINE_ROLE.ui,
  '--tc-font-weight': TYPE_WEIGHT.body,
  '--tc-weight-medium': TYPE_WEIGHT.medium,
  '--tc-heading-weight': TYPE_WEIGHT.heading,
  '--tc-strong-weight': TYPE_WEIGHT.strong,
  '--tc-fg-soft-pct': TYPE_FG_PCT.soft,
  '--tc-fg-body-pct': TYPE_FG_PCT.body,
  '--tc-fg-line-pct': TYPE_FG_PCT.line,
  '--tc-wordmark-weight': TYPE_WEIGHT.heading,
  '--tc-wordmark-tracking': TYPE_TRACKING.wordmark,
  '--tc-kicker-tracking': TYPE_TRACKING.kicker,
  '--tc-kicker-transform': TYPE_TRANSFORM.kicker,
  '--tc-font-size-adjust': FONT_SIZE_ADJUST,
  '--tc-root-font': TYPE_ROOT.demo,
  '--tc-root-live': TYPE_ROOT.live,
  /** Aliases so in-flight web PRs that still read `--tc-type-*` stay on the scale. */
  '--tc-type-title': TYPE_SIZE.xl,
  '--tc-type-section': TYPE_SIZE.base,
  '--tc-type-header': TYPE_SIZE.lg,
  '--tc-type-display': TYPE_SIZE.xl,
  '--tc-type-amount': TYPE_SIZE['2xl'],
  '--tc-type-level': TYPE_SIZE.lg,
  '--tc-type-action': TYPE_SIZE.xl,
  '--tc-type-pill': TYPE_SIZE.sm,
  /** Length line-height for Type / Amount / Memo and other fact rows. */
  '--tc-line-fact': TYPE_SIZE.base,
}

export const TYPE_TOKEN_KEYS = Object.keys(TYPE_VARS)
