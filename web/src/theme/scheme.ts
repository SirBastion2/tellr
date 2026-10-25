import { useEffect, useState } from 'react'
import { HEADER_SCHEME_COLLAPSE_PX } from './tokens'

export type ColorChoice = 'light' | 'dark' | 'system'

export type ResolvedScheme = 'light' | 'dark'

const SCHEME_COMPACT_QUERY = `(max-width: ${HEADER_SCHEME_COLLAPSE_PX}px)`

/** Viewport or header container at or under 1280px uses the scheme menu. */
export function readSchemeCompact(header?: HTMLElement | null): boolean {
  try {
    if (window.matchMedia(SCHEME_COMPACT_QUERY).matches) {
      return true
    }
  } catch {
    // jsdom and older engines have no matchMedia.
  }
  const width = header?.clientWidth ?? 0
  return width > 0 && width <= HEADER_SCHEME_COLLAPSE_PX
}

/** Mount the scheme menu or the segment, never both. */
export function useSchemeCompact(header: HTMLElement | null): boolean {
  const [compact, setCompact] = useState(() => readSchemeCompact(null))

  useEffect(() => {
    const update = () => setCompact(readSchemeCompact(header))
    update()
    let media: MediaQueryList | null = null
    try {
      media = window.matchMedia(SCHEME_COMPACT_QUERY)
      media.addEventListener('change', update)
    } catch {
      // jsdom
    }
    const observer = header && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    if (header && observer) {
      observer.observe(header)
    }
    window.addEventListener('resize', update)
    return () => {
      media?.removeEventListener('change', update)
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [header])

  return compact
}

/** `prefers-color-scheme`, then neither (tests, older engines) stays dark. */
export function readSystemScheme(): ResolvedScheme {
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
  } catch {
    return 'dark'
  }
  return 'dark'
}

export function parseColorChoice(value: string | null): ColorChoice {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }
  return 'system'
}

export function resolveScheme(choice: ColorChoice, system: ResolvedScheme): ResolvedScheme {
  return choice === 'system' ? system : choice
}
