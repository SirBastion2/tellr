// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App, AppShell } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { liveBadgeText } from './LiveBadge'
import './index.css'
import { THEMES } from './theme/registry'
import { DEMO_ROOT_FONT, DENSITY, FOOTER_FONT_SIZE, HEADER_SCHEME_COLLAPSE_PX } from './theme/tokens'

const css = () => readFileSync('src/index.css', 'utf8')

/** CSS pixels for the laptop widths and zooms the header must survive. */
const HEADER_FIT_CSS_PX = [1280, 1440, 1512, 1024, 1152, 960] as const

function demoView(customerId: string): DemoView {
  return {
    customers: CUSTOMERS,
    customerId,
    index: 0,
    playing: false,
    speed: 1,
    pending: false,
    showCase: false,
    confirmed: [],
    presenter: false,
    elapsedMs: 0,
    onSelectCustomer: () => undefined,
    onPlay: () => undefined,
    onPause: () => undefined,
    onStep: () => undefined,
    onRestart: () => undefined,
    onSpeed: () => undefined,
    onToggleCase: () => undefined,
    onConfirmSignal: () => undefined,
    onDismissSignal: () => undefined,
    onEscalate: () => undefined,
  }
}

function headerRule(source: string, selector: string): string {
  const match = source.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))
  if (!match?.[1]) {
    throw new Error(`missing ${selector} rule`)
  }
  return match[1]
}

describe('workstation laptop fit', () => {
  it('keeps 3fr/2fr from 1280px and stacks below 900px', () => {
    const source = css()
    const stacked = source.slice(0, source.indexOf('@media (min-width: 900px)'))
    expect(stacked).toMatch(/\.tc-workstation[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(source).toMatch(/@media \(min-width:\s*900px\)/)
    expect(source).toMatch(/@media \(min-width:\s*1280px\)[\s\S]*minmax\(0,\s*3fr\)\s+minmax\(280px,\s*2fr\)/)
    expect(source).toMatch(/@media \(min-width:\s*1024px\)/)
  })

  it('wraps the header instead of clipping title or tabs at laptop zoom', () => {
    const source = css()
    const titleRule = headerRule(source, '.tc-header-title')
    const badgeRule = headerRule(source, '.tc-live-badge')
    const headerCss = headerRule(source, '.tc-header')
    expect(HEADER_SCHEME_COLLAPSE_PX).toBe(1280)
    expect(source).not.toMatch(/1120px/)
    expect(source).toMatch(new RegExp(`@container header \\(max-width:\\s*${HEADER_SCHEME_COLLAPSE_PX}px\\)`))
    expect(source).toMatch(new RegExp(`@media \\(max-width:\\s*${HEADER_SCHEME_COLLAPSE_PX}px\\)`))
    expect(headerCss).toMatch(/flex-wrap:\s*wrap/)
    expect(headerCss).toMatch(/overflow:\s*visible/)
    expect(titleRule).toMatch(/flex:\s*0 0 auto/)
    expect(titleRule).toMatch(/flex-shrink:\s*0/)
    expect(titleRule).not.toMatch(/overflow:\s*hidden/)
    expect(titleRule).not.toMatch(/text-overflow:\s*ellipsis/)
    expect(badgeRule).toMatch(/text-overflow:\s*ellipsis/)
    expect(badgeRule).toMatch(/overflow:\s*hidden/)
    expect(badgeRule).toMatch(/font-size:\s*var\(--tc-type-pill/)
    expect(badgeRule).not.toMatch(/max-width:\s*14rem/)
    expect(badgeRule).not.toMatch(/display:\s*inline-flex/)
    expect(headerRule(source, '.tc-connection')).toMatch(/text-overflow:\s*ellipsis/)
    expect(headerRule(source, '.tc-header-nav')).toMatch(/flex-wrap:\s*wrap/)
    expect(headerRule(source, '.tc-header-nav')).toMatch(/overflow:\s*visible/)
    expect(headerRule(source, '.tc-header-nav')).not.toMatch(/overflow-x:\s*auto/)
    expect(HEADER_FIT_CSS_PX).toEqual([1280, 1440, 1512, 1024, 1152, 960])

    window.localStorage.clear()
    render(<App />)
    const title = screen.getByRole('heading', { name: 'Teller Copilot' })
    expect(title.className).toContain('tc-header-title')
    expect(title.textContent).toBe('Teller Copilot')
    expect(getComputedStyle(title).overflow).toBe('visible')
    expect(getComputedStyle(title).textOverflow).not.toBe('ellipsis')
    const badge = screen.getByTestId('live-badge')
    expect(badge.className).toContain('tc-live-badge')
    expect(badge.textContent).toBe('Simulation: Contractor cash, coached')
    expect(badge.getAttribute('title')).toBe('Simulation: Contractor cash, coached')
    expect(screen.getByTestId('connection-status').className).toContain('tc-connection')
    expect(getComputedStyle(screen.getByTestId('app-header')).flexWrap).toBe('wrap')
    expect(getComputedStyle(screen.getByTestId('app-header')).overflow).toBe('visible')
    expect(getComputedStyle(screen.getByTestId('app-nav')).flexWrap).toBe('wrap')
    expect(getComputedStyle(screen.getByTestId('app-nav')).overflow).toBe('visible')
    for (const label of ['Home', 'Customer file', 'Outcome', 'Handoff']) {
      const tab = screen.getByText(label)
      expect(tab.textContent).toBe(label)
      expect(tab.getAttribute('style') ?? '').toMatch(/flex:\s*1 1 0/)
      expect(tab.getAttribute('style') ?? '').toMatch(/white-space:\s*nowrap/)
      expect(tab.getAttribute('style') ?? '').toMatch(/text-align:\s*center/)
    }
    expect(screen.getByTestId('color-scheme')).toBeTruthy()
    expect(screen.queryByTestId('scheme-menu')).toBeNull()
    expect(screen.getByTestId('theme-root').style.fontSize).toBe(DEMO_ROOT_FONT)
    expect(screen.getByTestId('theme-card').style.width).toBe('100%')
    expect(screen.getByTestId('theme-card').className).toContain('tc-page-card')
    expect(screen.getByTestId('theme-footer').style.fontSize).toBe(FOOTER_FONT_SIZE)
    expect(source).toMatch(/\.tc-page-card[\s\S]*width:\s*100%/)
    expect(source).toMatch(/\.tc-footer[\s\S]*font-size:\s*13px/)
    expect(source).not.toMatch(/min\(1440px/)
  })

  it('keeps every simulation label complete and exposes it on the pill title', () => {
    for (const customer of CUSTOMERS) {
      const label = liveBadgeText('live', customer.title)
      expect(label).toBe(`Simulation: ${customer.title}`)
      const { unmount } = render(
        <MemoryRouter>
          <AppShell library={null} session={null} issues={[]} demo={demoView(customer.id)} />
        </MemoryRouter>,
      )
      const badge = screen.getByTestId('live-badge')
      expect(badge.textContent, customer.id).toBe(label)
      expect(badge.getAttribute('title'), customer.id).toBe(label)
      unmount()
    }
  })

  it('scales type and spacing from the shared density tokens', () => {
    const source = css()
    expect(source).toContain(DENSITY.typeTitle)
    expect(source).toContain(DENSITY.typeSection)
    expect(source).toContain(DENSITY.typeHeader)
    expect(source).toContain(DENSITY.typeDisplay)
    expect(source).toContain(DENSITY.spaceWorkstation)
    expect(source).toContain(DENSITY.spaceCard)
    expect(source).toContain(`--tc-type-title: ${DENSITY.typeTitle}`)
    expect(source).toContain(`--tc-space-workstation: ${DENSITY.spaceWorkstation}`)
    expect(source).toContain(`--tc-space-1: ${DENSITY.space1}`)
    expect(source).toContain(`--tc-space-header: ${DENSITY.spaceHeader}`)
    expect(source).toContain(`--tc-space-header-content: ${DENSITY.spaceHeaderContent}`)
    expect(source).toMatch(/overflow-x:\s*hidden/)
    expect(source).toMatch(/\.tc-theme-page[\s\S]*overflow-x:\s*clip/)
    expect(DENSITY.spaceGap).toBe(DENSITY.space3)
    expect(THEMES.tellr).not.toHaveProperty('space')
    expect(DENSITY.cardPad).toBe('clamp(10px, 1vw, 16px)')
    expect(THEMES.mtb).not.toHaveProperty('space')
    expect(THEMES.fnb).not.toHaveProperty('space')
    expect(THEMES.pnc).not.toHaveProperty('space')
  })
})
