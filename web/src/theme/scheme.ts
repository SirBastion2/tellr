import { useEffect, useState, type RefObject } from 'react'

export type ColorChoice = 'light' | 'dark' | 'system'

export type ResolvedScheme = 'light' | 'dark'

export type HeaderFitMeasure = {
  available: number
  brand: number
  status: number
  nav: number
  schemeFull: number
  help: number
  /** Minimum gap between the four header groups. */
  gap: number
  /** Gap between the scheme control and help. Defaults to `gap` when omitted. */
  toolsGap?: number
}

function contentWidth(el: Element | null): number {
  if (!el || !(el instanceof HTMLElement)) {
    return 0
  }
  return Math.ceil(Math.max(el.scrollWidth, el.offsetWidth))
}

/** Sum in-flow children so a grown flex nav does not count leftover space. */
function groupMinWidth(el: Element | null, gap: number): number {
  if (!el || !(el instanceof HTMLElement)) {
    return 0
  }
  const kids = [...el.children].filter((child) => {
    if (!(child instanceof HTMLElement)) {
      return false
    }
    const style = getComputedStyle(child)
    return style.visibility !== 'hidden' && style.position !== 'fixed'
  })
  if (kids.length === 0) {
    return contentWidth(el)
  }
  const widths = kids.reduce((sum, child) => sum + contentWidth(child), 0)
  return widths + gap * Math.max(0, kids.length - 1)
}

function usedGap(el: Element | null, fallback: number): number {
  if (!el || !(el instanceof HTMLElement)) {
    return fallback
  }
  const style = getComputedStyle(el)
  const column = parseFloat(style.columnGap)
  const parsed = Number.isFinite(column) ? column : parseFloat(style.gap)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** True when brand + hugged status + nav + full scheme + help + gaps will not fit. */
export function schemeNeedsCompact(measure: HeaderFitMeasure): boolean {
  if (measure.available <= 0) {
    return false
  }
  const toolsGap = measure.toolsGap ?? measure.gap
  const tools = measure.schemeFull + measure.help + toolsGap
  const needed = measure.brand + measure.status + measure.nav + tools + 3 * measure.gap
  return needed > measure.available
}

export function measureHeaderFit(header: HTMLElement): HeaderFitMeasure {
  const style = getComputedStyle(header)
  const padL = parseFloat(style.paddingLeft) || 0
  const padR = parseFloat(style.paddingRight) || 0
  const gap = parseFloat(style.columnGap || style.gap) || 0
  const brandEl = header.querySelector('[data-testid="header-brand"]')
  const statusEl = header.querySelector('[data-testid="header-status"]')
  const navEl = header.querySelector('[data-testid="app-nav"]')
  const toolsEl = header.querySelector('[data-testid="header-tools"]')
  return {
    available: Math.max(0, header.clientWidth - padL - padR),
    brand: groupMinWidth(brandEl, usedGap(brandEl, gap)),
    status: groupMinWidth(statusEl, usedGap(statusEl, gap)),
    nav: groupMinWidth(navEl, usedGap(navEl, gap)),
    schemeFull: contentWidth(header.querySelector('[data-testid="color-scheme"]')),
    help: contentWidth(header.querySelector('[data-testid="shortcut-help-button"]')),
    gap,
    toolsGap: usedGap(toolsEl, gap),
  }
}

/** Collapse the scheme segment when the measured full row would overflow the header. */
export function readSchemeCompact(header?: HTMLElement | null): boolean {
  if (!header || header.clientWidth <= 0) {
    return false
  }
  return schemeNeedsCompact(measureHeaderFit(header))
}

/** Mount both scheme controls; hide one. Collapse from measured content, not a px breakpoint. */
export function useSchemeCompact(headerRef: RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = useState(() => readSchemeCompact(null))

  useEffect(() => {
    const update = () => setCompact(readSchemeCompact(headerRef.current))
    update()
    const header = headerRef.current
    const observer = header && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    if (header && observer) {
      observer.observe(header)
    }
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [headerRef])

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
