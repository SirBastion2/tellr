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
 * stored choice, then to `tellr`. A missing query uses storage, then `tellr`.
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
  const fromStore = normalizeThemeId(stored)
  if (fromStore && names.has(fromStore)) {
    return fromStore
  }
  return DEFAULT_THEME_ID
}
