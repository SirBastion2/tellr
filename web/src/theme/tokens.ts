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

/** Readable footer size. Absolute so the 105% demo root does not shrink it. */
export const FOOTER_FONT_SIZE = '13px'

export const PROGRESS_DOTS = 5

/** Demo layout root size. ~16% below the old 125% so a 1280×720 laptop can see the fold. */
export const DEMO_ROOT_FONT = '105%'

/** Header Light/Dark/System segment collapses at this container and viewport width. */
export const HEADER_SCHEME_COLLAPSE_PX = 1280

/**
 * Shared workstation density. `index.css` and `vars.ts` read these so type,
 * gaps, and cards scale in one place instead of per component.
 * `space1`–`space5` are the 4 / 8 / 12 / 16 / 24 rhythm.
 */
export const DENSITY = {
  typeTitle: 'clamp(1.1rem, 0.8vw + 0.82rem, 1.45rem)',
  typeSection: 'clamp(0.9rem, 0.28vw + 0.78rem, 0.98rem)',
  typeHeader: 'clamp(0.88rem, 0.45vw + 0.72rem, 1.05rem)',
  typeDisplay: 'clamp(1.1rem, 1.1vw, 1.5rem)',
  typeAmount: 'clamp(1.22rem, 1.3vw, 1.5rem)',
  typeLevel: 'clamp(0.95rem, 0.48vw + 0.82rem, 1.15rem)',
  typeAction: 'clamp(1.1rem, 1.1vw, 1.5rem)',
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
  fontWeight: '400',
  headingWeight: '600',
  strongWeight: '700',
  wordmarkWeight: '600',
  wordmarkLetterSpacing: '0.02em',
  typeLineBody: '1.5',
  typeLineHeading: '1.2',
  typeLineUi: '1.2',
  /**
   * Arial / Segoe x-height. Poppins is taller at the same rem; tellr applies
   * this as font-size-adjust so the rendered size matches the other banks.
   */
  fontSizeAdjust: '0.52',
  /** Tellr wordmark is 155×61. Height matches the shared control box. */
  wordmarkHeight: '48px',
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
  /** Shared gap after per-bank 13/11/8/13 overrides were removed. */
  spaceGap: '12px',
  /** Simulation and connection pills share this size. */
  typePill: '0.875rem',
  /** Room for a 2px outline + 2px offset + 3px ring outside the clip edge. */
  focusClip: '8px',
} as const
