// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'
import './index.css'
import { THEME_IDS } from './theme/registry'
import { DENSITY } from './theme/tokens'
import { TYPE_SIZE } from './theme/typeScale'

const css = () => readFileSync('src/index.css', 'utf8')

const HEADER_WIDTHS = [1024, 1180, 1280] as const
const NAV_LABELS = ['Home', 'Customer file', 'Outcome', 'Handoff'] as const

function headerRule(source: string, selector: string): string {
  const match = source.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))
  if (!match?.[1]) {
    throw new Error(`missing ${selector} rule`)
  }
  return match[1]
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  window.dispatchEvent(new Event('resize'))
}

function clipsLabel(element: HTMLElement): boolean {
  const style = getComputedStyle(element)
  const hidden = style.overflow === 'hidden' || style.overflowX === 'hidden'
  return hidden && (style.textOverflow === 'ellipsis' || style.whiteSpace === 'nowrap')
}

describe('header labels and spacing rhythm', () => {
  afterEach(() => {
    window.localStorage.clear()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  })

  it('exposes the 4/8/12/16/24 scale and uses it for header and text rhythm', () => {
    const source = css()
    expect(DENSITY.space1).toBe('4px')
    expect(DENSITY.space2).toBe('8px')
    expect(DENSITY.space3).toBe('12px')
    expect(DENSITY.space4).toBe('16px')
    expect(DENSITY.space5).toBe('24px')
    expect(DENSITY.spaceHeader).toBe(DENSITY.space2)
    expect(DENSITY.spaceHeaderContent).toBe(DENSITY.space4)
    expect(DENSITY.spaceHeadingBody).toBe(DENSITY.space2)
    expect(DENSITY.spaceBodyControl).toBe(DENSITY.space3)
    expect(DENSITY.spaceControlPadY).toBe(DENSITY.space2)
    expect(DENSITY.spaceControlPadX).toBe(DENSITY.space3)

    expect(source).toContain(`--tc-space-1: ${DENSITY.space1}`)
    expect(source).toContain(`--tc-space-2: ${DENSITY.space2}`)
    expect(source).toContain(`--tc-space-3: ${DENSITY.space3}`)
    expect(source).toContain(`--tc-space-4: ${DENSITY.space4}`)
    expect(source).toContain(`--tc-space-5: ${DENSITY.space5}`)
    expect(source).toContain(`--tc-space-header: ${DENSITY.spaceHeader}`)
    expect(source).toContain(`--tc-space-header-content: ${DENSITY.spaceHeaderContent}`)
    expect(source).toContain(`--tc-space-heading-body: ${DENSITY.spaceHeadingBody}`)
    expect(source).toContain(`--tc-space-body-control: ${DENSITY.spaceBodyControl}`)

    expect(headerRule(source, '.tc-header')).toMatch(/gap:\s*var\(--tc-space-header/)
    expect(headerRule(source, '.tc-shell')).toMatch(/gap:\s*var\(--tc-space-header-content/)
    expect(headerRule(source, '.tc-stack-heading')).toMatch(/gap:\s*var\(--tc-space-heading-body/)
    expect(headerRule(source, '.tc-screen')).toMatch(/gap:\s*var\(--tc-space-body-control/)
    expect(headerRule(source, '.tc-card')).toMatch(/gap:\s*var\(--tc-space-body-control/)
    expect(source).toMatch(/\.tc-live-badge[\s\S]*padding-inline:\s*var\(--tc-control-pad-inline/)
    expect(source).toMatch(/\.tc-connection[\s\S]*padding-inline:\s*var\(--tc-control-pad-inline/)
    expect(DENSITY.spaceControlPadInlineEm).toMatch(/em$/)
  })

  it('uses the same two-column fact grid and line-height token on kv lists', () => {
    const source = css()
    expect(DENSITY.lineFact).toBe(TYPE_SIZE.base)
    expect(source).toMatch(/--tc-line-fact:\s*var\(--tc-text-base\)/)

    for (const selector of ['.tc-kv', '.tc-facts'] as const) {
      const rule = headerRule(source, selector)
      expect(rule, selector).toMatch(/display:\s*grid/)
      expect(rule, selector).toMatch(/grid-template-columns:\s*max-content\s+minmax\(0,\s*1fr\)/)
      expect(rule, selector).toMatch(/column-gap:\s*var\(--tc-space-4/)
      expect(rule, selector).toMatch(/row-gap:\s*var\(--tc-space-2/)
      expect(rule, selector).toMatch(/align-items:\s*center/)
    }

    expect(headerRule(source, '.tc-kv dt')).toMatch(/line-height:\s*var\(--tc-line-fact/)
    expect(headerRule(source, '.tc-kv dd')).toMatch(/line-height:\s*var\(--tc-line-fact/)
    expect(headerRule(source, '.tc-kv dd')).toMatch(/min-width:\s*0/)
    expect(headerRule(source, '.tc-kv dd')).toMatch(/overflow-wrap:\s*break-word/)
    expect(source).toMatch(/\.tc-facts dt[\s\S]*?line-height:\s*var\(--tc-line-fact/)
    expect(source).toMatch(/\.tc-facts dd[\s\S]*?line-height:\s*var\(--tc-line-fact/)
    expect(source).toMatch(/\.tc-facts dd[\s\S]*?overflow-wrap:\s*break-word/)
    expect(headerRule(source, '.tc-amount')).toMatch(/display:\s*block/)
    expect(headerRule(source, '.tc-amount')).toMatch(/line-height:\s*var\(--tc-text-2xl-lh/)
    expect(headerRule(source, '.tc-amount')).toMatch(/font-size:\s*var\(--tc-text-2xl/)
  })

  it('keeps the header on one row with content-sized tabs and hugging status pills', () => {
    const source = css()
    const headerCss = headerRule(source, '.tc-header')
    const navCss = headerRule(source, '.tc-header-nav')
    const badge = headerRule(source, '.tc-live-badge')
    const connection = headerRule(source, '.tc-connection')
    expect(headerCss).toMatch(/flex-wrap:\s*nowrap/)
    expect(headerCss).not.toMatch(/flex-wrap:\s*wrap/)
    expect(source).not.toMatch(/@media \(max-width:\s*(1023|1024|1180|1280)px\)[\s\S]{0,200}\.tc-header[^{]*\{[^}]*flex-wrap:\s*wrap/)
    expect(headerCss).toMatch(/overflow:\s*visible/)
    expect(navCss).toMatch(/flex-wrap:\s*nowrap/)
    expect(navCss).toMatch(/overflow:\s*visible/)
    expect(navCss).toMatch(/flex:\s*1 1 auto/)
    expect(navCss).toMatch(/margin-inline:\s*auto/)
    expect(navCss).toMatch(/justify-content:\s*center/)
    expect(navCss).toMatch(/gap:\s*var\(--tc-space-header/)
    expect(navCss).not.toMatch(/overflow-x:\s*auto/)
    expect(navCss).not.toMatch(/overflow:\s*hidden/)
    expect(source).toMatch(/\.tc-header-nav a[\s\S]*flex:\s*0 0 auto/)
    expect(source).toMatch(/\.tc-header-nav a[\s\S]*width:\s*max-content/)
    expect(source).not.toMatch(/\.tc-header-nav a[\s\S]*flex:\s*1 1 0/)
    expect(source).toMatch(/\.tc-header-nav a[\s\S]*text-align:\s*center/)
    expect(source).toMatch(/\.tc-header-nav a[\s\S]*min-width:\s*min-content/)
    expect(source).toMatch(/\.tc-header-nav a[\s\S]*border-radius:\s*var\(--tc-header-radius/)
    expect(headerRule(source, '.tc-header-title')).not.toMatch(/overflow:\s*hidden/)
    expect(headerRule(source, '.tc-header-title')).not.toMatch(/text-overflow:\s*ellipsis/)
    expect(badge).toMatch(/text-overflow:\s*ellipsis/)
    expect(badge).toMatch(/flex:\s*0 0 auto/)
    expect(badge).toMatch(/width:\s*max-content/)
    expect(badge).not.toMatch(/min-width:/)
    expect(badge).not.toMatch(/22rem|14rem/)
    expect(connection).toMatch(/flex:\s*0 0 auto/)
    expect(connection).toMatch(/width:\s*max-content/)
    expect(connection).not.toMatch(/min-width:/)
    expect(connection).not.toMatch(/22rem|14rem/)
    expect(source).not.toMatch(/--tc-sim-pill-min/)
    expect(source).not.toMatch(/--tc-conn-pill-min/)
    expect(source).toMatch(/\.tc-header-nav[\s\S]*font-size:\s*var\(--tc-text-sm/)
    expect(headerRule(source, '.tc-local-clock')).toMatch(/height:\s*var\(--tc-header-control-h/)
    expect(headerRule(source, '.tc-local-clock-slot')).toMatch(/font-variant-numeric:\s*tabular-nums/)
    expect(headerRule(source, '.tc-local-clock-slot')).toMatch(/min-width:\s*var\(--tc-clock-min/)
  })

  it('centers the tellr logo in its pill with flex, equal padding, and object-fit', () => {
    const source = css()
    expect(headerRule(source, '.tc-wordmark')).toMatch(/display:\s*flex/)
    expect(headerRule(source, '.tc-wordmark')).toMatch(/align-items:\s*center/)
    expect(headerRule(source, '.tc-wordmark')).toMatch(/justify-content:\s*center/)
    expect(headerRule(source, '.tc-wordmark')).toMatch(/line-height:\s*0/)
    expect(DENSITY.wordmarkAspect).toBe('155 / 61')
    expect(DENSITY.wordmarkHeight).toBe('40px')
    expect(DENSITY.wordmarkHeight).not.toBe(DENSITY.headerControlHeight)
    expect(source).toMatch(/\.tc-wordmark\[data-mark='logo'\][\s\S]*padding:\s*var\(--tc-space-1/)
    expect(source).toMatch(/\.tc-wordmark\[data-mark='logo'\][\s\S]*width:\s*auto/)
    expect(source).toMatch(/\.tc-wordmark\[data-mark='logo'\][\s\S]*border-radius:\s*var\(--tc-radius-control/)
    expect(source).not.toMatch(/--tc-wordmark-w/)
    expect(headerRule(source, '.tc-wordmark-logo')).toMatch(/display:\s*flex/)
    expect(headerRule(source, '.tc-wordmark-logo')).toMatch(/align-items:\s*center/)
    expect(headerRule(source, '.tc-wordmark-logo')).toMatch(/justify-content:\s*center/)
    expect(headerRule(source, '.tc-wordmark-logo')).toMatch(/line-height:\s*0/)
    expect(headerRule(source, '.tc-wordmark-logo')).toMatch(/height:\s*var\(--tc-wordmark-h/)
    expect(headerRule(source, '.tc-wordmark-logo')).toMatch(/width:\s*auto/)
    expect(headerRule(source, '.tc-wordmark-logo')).toMatch(/aspect-ratio:\s*var\(--tc-wordmark-aspect/)
    expect(headerRule(source, '.tc-wordmark-logo')).toMatch(/mask-position:\s*center/)
    expect(headerRule(source, '.tc-wordmark-logo')).toMatch(/object-fit:\s*contain/)
    expect(headerRule(source, '.tc-wordmark-img')).toMatch(/object-fit:\s*contain/)
    expect(headerRule(source, '.tc-wordmark-img')).toMatch(/width:\s*auto/)
    expect(headerRule(source, '.tc-wordmark-img')).toMatch(/aspect-ratio:\s*var\(--tc-wordmark-aspect/)
    expect(headerRule(source, '.tc-wordmark-img')).toMatch(/line-height:\s*0/)

    window.localStorage.clear()
    render(<App />)
    expect(screen.getByTestId('theme-root').getAttribute('data-theme')).toBe('tellr')
    const mark = screen.getByTestId('theme-wordmark')
    const logo = screen.getByTestId('theme-logo')
    const img = logo.querySelector('img')
    expect(mark.className).toContain('tc-wordmark')
    expect(mark.getAttribute('data-mark')).toBe('logo')
    expect(logo.className).toContain('tc-wordmark-logo')
    expect(img).toBeTruthy()
    expect(img?.className).toContain('tc-wordmark-img')
    expect(getComputedStyle(mark).justifyContent).toBe('center')
    expect(getComputedStyle(logo).alignItems).toBe('center')
    expect(getComputedStyle(img!).objectFit).toBe('contain')
  })

  it('renders every nav label un-truncated at 1024, 1180, and 1280 for each bank theme', () => {
    window.localStorage.clear()
    render(<App />)
    const header = screen.getByTestId('app-header')
    const nav = screen.getByTestId('app-nav')
    const root = screen.getByTestId('theme-root')

    expect(getComputedStyle(header).flexWrap).toBe('nowrap')
    expect(getComputedStyle(header).overflow).toBe('visible')
    expect(getComputedStyle(nav).flexWrap).toBe('nowrap')
    expect(getComputedStyle(nav).overflow).toBe('visible')
    expect(getComputedStyle(nav).overflowX).not.toBe('auto')
    expect(getComputedStyle(nav).flexGrow).toBe('1')
    expect(getComputedStyle(nav).flexShrink).toBe('1')
    expect(screen.getByTestId('header-brand')).toBeTruthy()
    expect(screen.getByTestId('header-status')).toBeTruthy()
    expect(screen.getByTestId('header-tools')).toBeTruthy()
    expect(screen.getByTestId('local-clock')).toBeTruthy()
    expect(header.className).toContain('tc-header')
    expect(screen.getByTestId('app-shell').className).toContain('tc-shell')

    for (const width of HEADER_WIDTHS) {
      setViewportWidth(width)
      for (const themeId of THEME_IDS) {
        expect(root.getAttribute('data-theme'), `${themeId} @ ${width}`).toBe(themeId)
        for (const label of NAV_LABELS) {
          const tab = within(nav).getByText(label)
          expect(tab.textContent, `${label} @ ${width} ${themeId}`).toBe(label)
          expect(tab.textContent, `${label} @ ${width} ${themeId}`).not.toMatch(/…|\.\.\./)
          expect(clipsLabel(tab), `${label} overflow @ ${width} ${themeId}`).toBe(false)
          expect(tab.getAttribute('style') ?? '', label).not.toMatch(/overflow:\s*hidden/)
          expect(tab.getAttribute('style') ?? '', label).not.toMatch(/text-overflow:\s*ellipsis/)
          expect(tab.className, `${label} class @ ${width} ${themeId}`).toContain('tc-nav-tab')
          expect(getComputedStyle(tab).flexGrow, `${label} grow @ ${width} ${themeId}`).toBe('0')
          expect(getComputedStyle(tab).flexShrink, `${label} shrink @ ${width} ${themeId}`).toBe('0')
          expect(getComputedStyle(tab).flexBasis, `${label} basis @ ${width} ${themeId}`).toBe('auto')
          expect(getComputedStyle(tab).justifyContent, `${label} justify @ ${width} ${themeId}`).toBe('center')
          expect(getComputedStyle(tab).textAlign, `${label} align @ ${width} ${themeId}`).toBe('center')
        }
        const title = within(header).getByRole('heading', { name: 'Teller Copilot' })
        expect(title.textContent).toBe('Teller Copilot')
        expect(clipsLabel(title)).toBe(false)
        expect(clipsLabel(nav)).toBe(false)
        for (const child of Array.from(header.children)) {
          if (!(child instanceof HTMLElement)) {
            continue
          }
          if (child === nav || nav.contains(child) || child.classList.contains('tc-header-title')) {
            expect(clipsLabel(child), child.className || child.tagName).toBe(false)
          }
        }
        fireEvent.keyDown(window, { key: 'T' })
      }
    }
  })
})
