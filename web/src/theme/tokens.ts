/** Shared copy and keys. Each bank theme stores these on its own object. */
export const DEFAULT_THEME_ID = 'tellr'

export const THEME_STORAGE_KEY = 'teller.theme'

export const THEME_QUERY = 'theme'

/** `light` | `dark` | `system`. Header toggle. System follows prefers-color-scheme. */
export const COLOR_STORAGE_KEY = 'teller.colorScheme'

/** `1` when presenter mode is on. `?present=1` wins over this key. */
export const PRESENTER_STORAGE_KEY = 'teller.presenter'

export const PRESENTER_QUERY = 'present'

export const UI_FONT = 'Poppins, "Segoe UI", system-ui, sans-serif'

export const FOOTER_TEXT = 'Made for HackPSU 2026 © By Team KotR'

export const PROGRESS_DOTS = 5
