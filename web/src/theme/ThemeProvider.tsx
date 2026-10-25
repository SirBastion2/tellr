import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { themeForScheme } from './palette'
import { cycleThemeId, requireTheme, THEME_IDS } from './registry'
import { normalizeThemeId, resolveThemeId } from './resolve'
import { parseColorChoice, readSystemScheme, resolveScheme, type ColorChoice, type ResolvedScheme } from './scheme'
import { COLOR_STORAGE_KEY, DEFAULT_THEME_ID, THEME_QUERY, THEME_STORAGE_KEY } from './tokens'
import type { BankTheme } from './types'

const ThemeContext = createContext<BankTheme | null>(null)

type ThemeActions = {
  themeId: string
  setThemeId: (id: string) => void
  cycleTheme: () => void
}

const ThemeActionsContext = createContext<ThemeActions>({
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => undefined,
  cycleTheme: () => undefined,
})

type SchemeController = {
  choice: ColorChoice
  scheme: ResolvedScheme
  setChoice: (choice: ColorChoice) => void
}

const SchemeContext = createContext<SchemeController>({
  choice: 'system',
  scheme: 'dark',
  setChoice: () => undefined,
})

export function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

export function readThemeQuery(): string | null {
  return new URLSearchParams(window.location.search).get(THEME_QUERY)
}

function readStoredChoice(): ColorChoice {
  try {
    return parseColorChoice(window.localStorage.getItem(COLOR_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

function choice(): { id: string; persist: boolean } {
  const query = readThemeQuery()
  const id = resolveThemeId(query, readStoredTheme(), THEME_IDS)
  const normalized = normalizeThemeId(query)
  return { id, persist: normalized !== null && THEME_IDS.includes(normalized) }
}

function persistThemeId(id: string) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    /* private mode */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState(() => choice().id)
  const [colorChoice, setColorChoice] = useState<ColorChoice>(() => readStoredChoice())
  const [system, setSystem] = useState<ResolvedScheme>(() => readSystemScheme())

  const setThemeId = useCallback((next: string) => {
    const known = THEME_IDS.includes(next) ? next : DEFAULT_THEME_ID
    setId(known)
    persistThemeId(known)
  }, [])

  const cycleTheme = useCallback(() => {
    setId((current) => {
      const next = cycleThemeId(current)
      persistThemeId(next)
      return next
    })
  }, [])

  useEffect(() => {
    const next = choice()
    if (next.persist) {
      window.localStorage.setItem(THEME_STORAGE_KEY, next.id)
    }
  }, [])

  useEffect(() => {
    let media: MediaQueryList | null = null
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }
    const apply = () => setSystem(readSystemScheme())
    media.addEventListener('change', apply)
    return () => media?.removeEventListener('change', apply)
  }, [])

  const scheme = resolveScheme(colorChoice, system)

  useEffect(() => {
    try {
      window.localStorage.setItem(COLOR_STORAGE_KEY, colorChoice)
    } catch {
      /* private mode */
    }
    document.documentElement.style.colorScheme = scheme
    document.documentElement.setAttribute('data-color-scheme', scheme)
  }, [colorChoice, scheme])

  const theme = themeForScheme(requireTheme(id), scheme)

  return (
    <SchemeContext.Provider value={{ choice: colorChoice, scheme, setChoice: setColorChoice }}>
      <ThemeActionsContext.Provider value={{ themeId: id, setThemeId, cycleTheme }}>
        <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
      </ThemeActionsContext.Provider>
    </SchemeContext.Provider>
  )
}

export function useTheme(): BankTheme {
  return useContext(ThemeContext) ?? requireTheme(DEFAULT_THEME_ID)
}

export function useThemeActions(): ThemeActions {
  return useContext(ThemeActionsContext)
}

export function useColorScheme(): SchemeController {
  return useContext(SchemeContext)
}
