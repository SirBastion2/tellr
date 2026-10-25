import { DEFAULT_THEME_ID } from './tokens'

export function normalizeThemeId(value: string | null | undefined): string | null {
  if (value == null) {
    return null
  }
  const id = value.trim().toLowerCase()
  return id.length > 0 ? id : null
}

/**
 * `?theme=` wins when it names a registered bank. An unknown id falls back to the
 * stored choice, then to `tellr`. A missing query is always `tellr` so a leftover
 * `teller.theme` does not surprise the demo. Storage is still written when a valid
 * query or a T-cycle selects a bank.
 */
export function resolveThemeId(
  query: string | null,
  stored: string | null,
  known: readonly string[],
): string {
  const names = new Set(known)
  const fromQuery = normalizeThemeId(query)
  if (fromQuery && names.has(fromQuery)) {
    return fromQuery
  }
  if (fromQuery) {
    const fromStore = normalizeThemeId(stored)
    if (fromStore && names.has(fromStore)) {
      return fromStore
    }
  }
  return DEFAULT_THEME_ID
}
