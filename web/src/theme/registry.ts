import type { BankTheme } from './types'
import { DEFAULT_THEME_ID } from './tokens'

type ThemeModule = { theme: BankTheme }

/** T-cycle order. `tellr` stays first so the demo default is the next wrap target. */
const CYCLE_RANK: Readonly<Record<string, number>> = {
  tellr: 0,
  pnc: 1,
  mtb: 2,
  fnb: 3,
}

/** Themes are discovered from `./themes`. Adding a bank means adding one file there. */
const loaded = import.meta.glob('./themes/*.ts', { eager: true }) as Record<string, ThemeModule>

function collect(): BankTheme[] {
  const themes: BankTheme[] = []
  for (const mod of Object.values(loaded)) {
    if (typeof mod.theme?.id === 'string' && mod.theme.id.length > 0) {
      themes.push(mod.theme)
    }
  }
  themes.sort((a, b) => {
    const left = CYCLE_RANK[a.id] ?? Number.POSITIVE_INFINITY
    const right = CYCLE_RANK[b.id] ?? Number.POSITIVE_INFINITY
    if (left !== right) {
      return left - right
    }
    return a.id.localeCompare(b.id)
  })
  return themes
}

export const THEME_LIST: readonly BankTheme[] = collect()

export const THEMES: Readonly<Record<string, BankTheme>> = Object.fromEntries(
  THEME_LIST.map((theme) => [theme.id, theme]),
)

export const THEME_IDS: readonly string[] = THEME_LIST.map((theme) => theme.id)

/** Next bank in THEME_IDS. Unknown current ids start at `tellr`. */
export function cycleThemeId(current: string | null | undefined): string {
  if (THEME_IDS.length === 0) {
    return DEFAULT_THEME_ID
  }
  const at = current ? THEME_IDS.indexOf(current) : -1
  return THEME_IDS[(at + 1) % THEME_IDS.length] ?? DEFAULT_THEME_ID
}

export function themeById(id: string | null | undefined): BankTheme | null {
  if (!id) {
    return null
  }
  return THEMES[id] ?? null
}

export function requireTheme(id: string): BankTheme {
  const found = THEMES[id] ?? THEMES[DEFAULT_THEME_ID]
  if (!found) {
    throw new Error(`theme ${DEFAULT_THEME_ID} is not registered`)
  }
  return found
}
