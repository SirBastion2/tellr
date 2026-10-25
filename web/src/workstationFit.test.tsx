// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import './index.css'
import { THEMES } from './theme/registry'
import { DEMO_ROOT_FONT, DENSITY, FOOTER_FONT_SIZE, HEADER_SCHEME_COLLAPSE_PX } from './theme/tokens'

const css = () => readFileSync('src/index.css', 'utf8')

describe('workstation laptop fit', () => {
  it('keeps 3fr/2fr from 1280px and stacks below 900px', () => {
    const source = css()
    const stacked = source.slice(0, source.indexOf('@media (min-width: 900px)'))
    expect(stacked).toMatch(/\.tc-workstation[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(source).toMatch(/@media \(min-width:\s*900px\)/)
    expect(source).toMatch(/@media \(min-width:\s*1280px\)[\s\S]*minmax\(0,\s*3fr\)\s+minmax\(280px,\s*2fr\)/)
    expect(source).toMatch(/@media \(min-width:\s*1024px\)/)
  })

  it('collapses the theme segment at 1280px and never clips header copy', () => {
    const source = css()
    expect(HEADER_SCHEME_COLLAPSE_PX).toBe(1280)
    expect(source).not.toMatch(/1120px/)
    expect(source).toMatch(new RegExp(`@container header \\(max-width:\\s*${HEADER_SCHEME_COLLAPSE_PX}px\\)`))
    expect(source).toMatch(new RegExp(`@media \\(max-width:\\s*${HEADER_SCHEME_COLLAPSE_PX}px\\)`))
    expect(source).toMatch(/\.tc-header-title[\s\S]*overflow:\s*hidden/)
    expect(source).toMatch(/\.tc-header-title[\s\S]*text-overflow:\s*ellipsis/)
    expect(source).toMatch(/\.tc-live-badge[\s\S]*text-overflow:\s*ellipsis/)
    expect(source).toMatch(/\.tc-connection[\s\S]*text-overflow:\s*ellipsis/)
    expect(source).toMatch(/\.tc-header-nav[\s\S]*overflow-x:\s*auto/)

    window.localStorage.clear()
    render(<App />)
    const title = screen.getByRole('heading', { name: 'Teller Copilot' })
    expect(title.className).toContain('tc-header-title')
    expect(screen.getByTestId('live-badge').className).toContain('tc-live-badge')
    expect(screen.getByTestId('connection-status').className).toContain('tc-connection')
    expect(getComputedStyle(screen.getByTestId('app-header')).flexWrap).toBe('nowrap')
    expect(getComputedStyle(screen.getByTestId('app-nav')).overflowX).toBe('auto')
    expect(screen.getByTestId('scheme-menu')).toBeTruthy()
    expect(screen.getByTestId('color-scheme')).toBeTruthy()
    expect(screen.getByTestId('theme-root').style.fontSize).toBe(DEMO_ROOT_FONT)
    expect(screen.getByTestId('theme-card').style.width).toBe('100%')
    expect(screen.getByTestId('theme-card').className).toContain('tc-page-card')
    expect(screen.getByTestId('theme-footer').style.fontSize).toBe(FOOTER_FONT_SIZE)
    expect(source).toMatch(/\.tc-page-card[\s\S]*width:\s*100%/)
    expect(source).toMatch(/\.tc-footer[\s\S]*font-size:\s*13px/)
    expect(source).not.toMatch(/min\(1440px/)
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
    expect(source).toMatch(/overflow-x:\s*hidden/)
    expect(THEMES.tellr?.space.gap).toBe('13px')
    expect(THEMES.tellr?.space.cardPadding).toBe('18px')
    expect(THEMES.mtb?.space.gap).toBe('11px')
    expect(THEMES.fnb?.space.gap).toBe('8px')
    expect(THEMES.pnc?.space.gap).toBe('13px')
  })
})
