import type { BankTheme } from './types'
import { DEFAULT_THEME_ID } from './tokens'

type ThemeModule = { theme: BankTheme }

/** Themes are discovered from `./themes`. Adding a bank means adding one file there. */
const loaded = import.meta.glob('./themes/*.ts', { eager: true }) as Record<string, ThemeModule>

function collect(): BankTheme[] {
  const themes: BankTheme[] = []
  for (const mod of Object.values(loaded)) {
    if (typeof mod.theme?.id === 'string' && mod.theme.id.length > 0) {
      themes.push(mod.theme)
    }
  }
  themes.sort((a, b) => a.id.localeCompare(b.id))
  return themes
}

export const THEME_LIST: readonly BankTheme[] = collect()

export const THEMES: Readonly<Record<string, BankTheme>> = Object.fromEntries(
  THEME_LIST.map((theme) => [theme.id, theme]),
)

export const THEME_IDS: readonly string[] = THEME_LIST.map((theme) => theme.id)

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
