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
  gap: number
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

/** True when brand + hugged status + nav + full scheme + help + gaps will not fit. */
export function schemeNeedsCompact(measure: HeaderFitMeasure): boolean {
  if (measure.available <= 0) {
    return false
  }
  const tools = measure.schemeFull + measure.help + measure.gap
  const needed = measure.brand + measure.status + measure.nav + tools + 3 * measure.gap
  return needed > measure.available
}

export function measureHeaderFit(header: HTMLElement): HeaderFitMeasure {
  const style = getComputedStyle(header)
  const padL = parseFloat(style.paddingLeft) || 0
  const padR = parseFloat(style.paddingRight) || 0
  const gap = parseFloat(style.columnGap || style.gap) || 0
  return {
    available: Math.max(0, header.clientWidth - padL - padR),
    brand: groupMinWidth(header.querySelector('[data-testid="header-brand"]'), gap),
    status: groupMinWidth(header.querySelector('[data-testid="header-status"]'), gap),
    nav: groupMinWidth(header.querySelector('[data-testid="app-nav"]'), gap),
    schemeFull: contentWidth(header.querySelector('[data-testid="color-scheme"]')),
    help: contentWidth(header.querySelector('[data-testid="shortcut-help-button"]')),
    gap,
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
