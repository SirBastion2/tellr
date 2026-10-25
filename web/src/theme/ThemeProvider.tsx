import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { requireTheme, THEME_IDS } from './registry'
import { normalizeThemeId, resolveThemeId } from './resolve'
import { DEFAULT_THEME_ID, THEME_QUERY, THEME_STORAGE_KEY } from './tokens'
import type { BankTheme } from './types'

const ThemeContext = createContext<BankTheme | null>(null)

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

function choice(): { id: string; persist: boolean } {
  const query = readThemeQuery()
  const id = resolveThemeId(query, readStoredTheme(), THEME_IDS)
  const normalized = normalizeThemeId(query)
  return { id, persist: normalized !== null && THEME_IDS.includes(normalized) }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id] = useState(() => choice().id)

  useEffect(() => {
    const next = choice()
    if (next.persist) {
      window.localStorage.setItem(THEME_STORAGE_KEY, next.id)
    }
  }, [])

  return <ThemeContext.Provider value={requireTheme(id)}>{children}</ThemeContext.Provider>
}

export function useTheme(): BankTheme {
  return useContext(ThemeContext) ?? requireTheme(DEFAULT_THEME_ID)
}
