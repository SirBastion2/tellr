import {
  FONT_SIZE_ADJUST,
  TYPE_LINE_COMPACT,
  TYPE_LINE_ROLE,
  TYPE_LINE_ROLE_COMPACT,
  TYPE_LINE_ROLE_SHORT,
  TYPE_LINE_SHORT,
  TYPE_ROOT,
  TYPE_SIZE,
  TYPE_TRACKING,
  TYPE_WEIGHT,
} from './typeScale'

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

/**
 * Shared Home density when the viewport is short. Every bank reads the same
 * tokens. `space4` stays on `DENSITY` so the fact-grid column gap does not
 * change. Control heights stay at or above 32px. Body size stays at or
 * above 14px (`TYPE_ROOT.short` is 87.5%).
 */
export const VIEWPORT_FIT = {
  compactMaxHeight: '860px',
  shortMaxHeight: '760px',
  compact: {
    rootFont: TYPE_ROOT.compact,
    space1: '3px',
    space2: '6px',
    space3: '8px',
    space5: '12px',
    spaceHeader: '6px',
    spaceHeaderContent: '8px',
    spaceHeadingBody: '4px',
    spaceBodyControl: '8px',
    spaceControlPadY: '4px',
    spaceControlPadX: '10px',
    spaceGap: '8px',
    spaceWorkstation: '8px',
    spaceStrip: '6px',
    spaceCard: '8px',
    pagePadY: '8px',
    pagePadX: '12px',
    pagePadBottom: '8px',
    controlHeight: '40px',
    headerControlHeight: '40px',
    headerMinHeight: '40px',
    wordmarkHeight: '32px',
    helpSize: '32px',
    timelineGap: '8px',
    lineXs: TYPE_LINE_COMPACT.xs,
    lineSm: TYPE_LINE_COMPACT.sm,
    lineBase: TYPE_LINE_COMPACT.base,
    lineLg: TYPE_LINE_COMPACT.lg,
    lineXl: TYPE_LINE_COMPACT.xl,
    line2xl: TYPE_LINE_COMPACT['2xl'],
    lineBody: TYPE_LINE_ROLE_COMPACT.body,
    lineHeading: TYPE_LINE_ROLE_COMPACT.heading,
    lineUi: TYPE_LINE_ROLE_COMPACT.ui,
  },
  short: {
    rootFont: TYPE_ROOT.short,
    space1: '2px',
    space2: '4px',
    space3: '6px',
    space5: '8px',
    spaceHeader: '4px',
    spaceHeaderContent: '6px',
    spaceHeadingBody: '2px',
    spaceBodyControl: '6px',
    spaceControlPadY: '2px',
    spaceControlPadX: '8px',
    spaceGap: '6px',
    spaceWorkstation: '6px',
    spaceStrip: '4px',
    spaceCard: '6px',
    pagePadY: '6px',
    pagePadX: '10px',
    pagePadBottom: '6px',
    controlHeight: '36px',
    headerControlHeight: '36px',
    headerMinHeight: '36px',
    wordmarkHeight: '28px',
    helpSize: '32px',
    timelineGap: '6px',
    lineXs: TYPE_LINE_SHORT.xs,
    lineSm: TYPE_LINE_SHORT.sm,
    lineBase: TYPE_LINE_SHORT.base,
    lineLg: TYPE_LINE_SHORT.lg,
    lineXl: TYPE_LINE_SHORT.xl,
    line2xl: TYPE_LINE_SHORT['2xl'],
    lineBody: TYPE_LINE_ROLE_SHORT.body,
    lineHeading: TYPE_LINE_ROLE_SHORT.heading,
    lineUi: TYPE_LINE_ROLE_SHORT.ui,
  },
} as const
