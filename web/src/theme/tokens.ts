import { FONT_SIZE_ADJUST, TYPE_LINE_ROLE, TYPE_ROOT, TYPE_SIZE, TYPE_TRACKING, TYPE_WEIGHT } from './typeScale'

/** Shared copy and keys. Each bank theme stores these on its own object. */
export const DEFAULT_THEME_ID = 'tellr'

export const THEME_STORAGE_KEY = 'teller.theme'

export const THEME_QUERY = 'theme'

/** `light` | `dark` | `system`. Header toggle. System follows prefers-color-scheme. */
export const COLOR_STORAGE_KEY = 'teller.colorScheme'

/** Kept so older browsers do not error. The demo layout no longer reads this key. */
export const PRESENTER_STORAGE_KEY = 'teller.presenter'

/** Kept so older links do not error. `?present` is ignored. */
export const PRESENTER_QUERY = 'present'

export const UI_FONT = 'Poppins, "Segoe UI", system-ui, sans-serif'

export const FOOTER_TEXT = 'Made for HackPSU 2026 © By Team KotR'

/** Footer uses `--tc-text-xs`. Re-export so older tests can still import the token. */
export const FOOTER_FONT_SIZE = TYPE_SIZE.xs

export const PROGRESS_DOTS = 5

/** Demo layout root size. Applied on `html` so rem tokens scale once. */
export const DEMO_ROOT_FONT = TYPE_ROOT.demo

/**
 * Shared workstation density. `index.css` and `vars.ts` read these so type,
 * gaps, and cards scale in one place instead of per component.
 * `space1`–`space5` are the 4 / 8 / 12 / 16 / 24 rhythm.
 */
export const DENSITY = {
  typeTitle: TYPE_SIZE.xl,
  typeSection: TYPE_SIZE.base,
  typeHeader: TYPE_SIZE.lg,
  typeDisplay: TYPE_SIZE.xl,
  typeAmount: TYPE_SIZE['2xl'],
  typeLevel: TYPE_SIZE.lg,
  typeAction: TYPE_SIZE.xl,
  /** Fact-row line box. Type-scale length so Amount cannot add extra gap. */
  lineFact: TYPE_SIZE.base,
  spaceWorkstation: 'clamp(10px, 1.3vw, 20px)',
  spaceCard: 'clamp(10px, 1vw, 16px)',
  spaceStrip: 'clamp(10px, 1vw, 13px)',
  spaceFacts: 'clamp(5px, 0.5vw, 8px) clamp(10px, 1vw, 16px)',
  spaceExplain: 'clamp(6px, 0.8vw, 12px)',
  pagePadY: 'clamp(8px, 1.6vw, 20px)',
  pagePadX: 'clamp(8px, 1.6vw, 24px)',
  pagePadBottom: 'clamp(12px, 2vw, 28px)',
  cardPad: 'clamp(10px, 1vw, 16px)',
  /** Shared structure. Bank files no longer set radius, height, pad, or shadow. */
  radiusControl: '999px',
  radiusCard: '16px',
  controlHeight: '48px',
  headerControlHeight: '48px',
  headerMinHeight: '48px',
  headerRadius: '999px',
  borderWidth: '1px',
  borderStyle: 'solid',
  shadowCard: '0 16px 40px rgba(0, 0, 0, 0.28)',
  glassBlur: '20px',
  fontWeight: TYPE_WEIGHT.body,
  mediumWeight: TYPE_WEIGHT.medium,
  headingWeight: TYPE_WEIGHT.heading,
  strongWeight: TYPE_WEIGHT.strong,
  wordmarkWeight: TYPE_WEIGHT.heading,
  wordmarkLetterSpacing: TYPE_TRACKING.wordmark,
  typeLineBody: TYPE_LINE_ROLE.body,
  typeLineHeading: TYPE_LINE_ROLE.heading,
  typeLineUi: TYPE_LINE_ROLE.ui,
  /**
   * Arial x-height. Every theme root applies this as font-size-adjust so
   * Poppins and Segoe UI match Arial's rendered size.
   */
  fontSizeAdjust: FONT_SIZE_ADJUST,
  /**
   * Tellr wordmark is 155×61. Graphic height is the control box minus
   * the 4px pad on each side so the mark is not taller than other chrome.
   */
  wordmarkHeight: '40px',
  wordmarkAspect: '155 / 61',
  /** Shared 4 / 8 / 12 / 16 / 24 rhythm. Screens and chrome read these, not ad-hoc px. */
  space1: '4px',
  space2: '8px',
  space3: '12px',
  space4: '16px',
  space5: '24px',
  spaceHeader: '8px',
  spaceHeaderContent: '16px',
  spaceHeadingBody: '8px',
  spaceBodyControl: '12px',
  spaceControlPadY: '8px',
  spaceControlPadX: '12px',
  /** Header pills scale padding with the text, not a fixed rem width. */
  spaceControlPadInlineEm: '0.85em',
  /**
   * Header pill spacing that is not a 4/8/12/16/24 step.
   * End padding and the minimum gap between groups use `space4` (16px).
   * Block padding on the simulation pill and nav tabs uses `space2` (8px).
   */
  simPillPadInline: '18px',
  navTabPadInline: '14px',
  navTabGap: '26px',
  schemePadBlock: '7px',
  schemePadInline: '14px',
  schemeInset: '2px',
  helpSize: '34px',
  helpGap: '10px',
  /** Shared gap after per-bank 13/11/8/13 overrides were removed. */
  spaceGap: '12px',
  /** Simulation and connection pills share this size. */
  typePill: TYPE_SIZE.sm,
  /**
   * Safety cap only. Status pills use natural content width; ellipsis
   * kicks in when the row is tight (1024). No min/fixed rem width.
   */
  simPillMaxWidth: 'none',
  /** Wide enough for the Pause label plus icon so Play does not jump. */
  playMinWidth: '7.5rem',
  /** `m:ss` with room for `10:00`. */
  timerMinWidth: '5ch',
  speedMinWidth: '2.75rem',
  caseLinkMinWidth: '9.5rem',
  /** Room for a 2px outline + 2px offset + 3px ring outside the clip edge. */
  focusClip: '8px',
} as const
