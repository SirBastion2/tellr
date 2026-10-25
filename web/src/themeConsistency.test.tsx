// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import t1 from '../../contract/fixtures/T1.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { OutcomeScreen } from './screens/OutcomeScreen'
import { themeForScheme } from './theme/palette'
import { THEME_IDS, THEMES } from './theme/registry'
import { readSchemeCompact } from './theme/scheme'
import { ThemeProvider } from './theme/ThemeProvider'
import { ThemeRoot } from './theme/ThemeRoot'
import { schemeNeedsCompact } from './theme/scheme'
import { COLOR_STORAGE_KEY, DENSITY, THEME_STORAGE_KEY } from './theme/tokens'
import { SHARED_STRUCTURE_VARS, themeVars } from './theme/vars'
import type { ColorChoice } from './theme/scheme'
import type { SessionState } from './types'

const BANKS = ['tellr', 'pnc', 'mtb', 'fnb'] as const
const LAPTOP_WIDTHS = [1024, 1180, 1280] as const
const session = t1.steps[0]?.response as SessionState
const css = () => readFileSync('src/index.css', 'utf8')
const outcomeSource = () => readFileSync('src/screens/OutcomeScreen.tsx', 'utf8')
const originalMatchMedia = window.matchMedia

function hexRgb(hex: string): string {
  const body = hex.replace('#', '')
  const full = body.length === 3 ? body.split('').map((part) => part + part).join('') : body
  return `rgb(${parseInt(full.slice(0, 2), 16)}, ${parseInt(full.slice(2, 4), 16)}, ${parseInt(full.slice(4, 6), 16)})`
}

function mockMatchMedia(dark: boolean) {
  window.matchMedia = (query: string) => {
    const matches = query.includes('prefers-color-scheme: dark') ? dark : false
    return {
      matches,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false
      },
      onchange: null,
    } as MediaQueryList
  }
}

function renderThemed(themeId: string, scheme: ColorChoice = 'dark') {
  window.history.replaceState({}, '', `/?theme=${themeId}`)
  window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
  window.localStorage.setItem(COLOR_STORAGE_KEY, scheme)
  return render(<App />)
}

function renderOutcome(themeId: string, scheme: ColorChoice) {
  window.history.replaceState({}, '', `/?theme=${themeId}`)
  window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
  window.localStorage.setItem(COLOR_STORAGE_KEY, scheme)
  return render(
    <ThemeProvider>
      <ThemeRoot>
        <OutcomeScreen session={session} />
      </ThemeRoot>
    </ThemeProvider>,
  )
}

describe('shared theme leftovers', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia
    } else {
      Reflect.deleteProperty(window, 'matchMedia')
    }
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  })

  it('uses the shared 4/8/12/16/24 gap for every bank', () => {
    expect([...THEME_IDS]).toEqual([...BANKS])
    expect(DENSITY.spaceGap).toBe(DENSITY.space3)
    expect(DENSITY.spaceGap).toBe('12px')
    expect(css()).toContain(`--tc-space-gap: ${DENSITY.spaceGap}`)
    for (const id of BANKS) {
      const theme = THEMES[id]
      expect(theme, id).toBeTruthy()
      expect(theme, id).not.toHaveProperty('space')
      expect(themeVars(theme!)['--tc-space-gap'], id).toBe(DENSITY.spaceGap)
      expect(themeVars(theme!)['--tc-space-gap'], id).toBe(themeVars(THEMES.tellr!)['--tc-space-gap'])
    }
  })

  it('sizes the simulation pill from one token on every bank', () => {
    expect(DENSITY.typePill).toBe('0.875rem')
    const source = css()
    expect(source).toContain(`--tc-text-sm: ${DENSITY.typePill}`)
    expect(source).toContain('--tc-type-pill: var(--tc-text-sm)')
    expect(source).not.toMatch(/\.tc-connection\s*\{/)
    expect(source).toMatch(/\.tc-live-badge[\s\S]*font-size:\s*var\(--tc-text-sm/)
    for (const id of BANKS) {
      const { unmount } = renderThemed(id)
      const root = screen.getByTestId('theme-root')
      expect(root.style.getPropertyValue('--tc-type-pill'), id).toBe(DENSITY.typePill)
      expect(screen.queryByTestId('connection-status'), id).toBeNull()
      expect(screen.queryByTestId('local-clock'), id).toBeNull()
      expect(screen.getByTestId('live-badge').className, id).toContain('tc-live-badge')
      unmount()
    }
  })

  it('paints the suggested outcome from a per-bank highlight token, not #fef3c7', () => {
    expect(outcomeSource()).not.toMatch(/#fef3c7/i)
    expect(session.suggested_outcome).not.toBe('report')
    for (const id of BANKS) {
      for (const scheme of ['dark', 'light'] as const) {
        const painted = themeForScheme(THEMES[id]!, scheme)
        expect(painted.highlightBg.toLowerCase(), `${id} ${scheme}`).not.toBe('#fef3c7')
        const { unmount } = renderOutcome(id, scheme)
        const root = screen.getByTestId('theme-root')
        const suggested = screen.getByTestId(`outcome-${session.suggested_outcome}`)
        expect(root.style.getPropertyValue('--tc-highlight'), `${id} ${scheme}`).toBe(painted.highlightBg)
        expect(root.style.getPropertyValue('--tc-highlight-fg'), `${id} ${scheme}`).toBe(painted.highlightFg)
        expect(suggested.getAttribute('data-highlighted'), `${id} ${scheme}`).toBe('true')
        expect(getComputedStyle(suggested).backgroundColor, `${id} ${scheme}`).toBe(hexRgb(painted.highlightBg))
        expect(getComputedStyle(suggested).color, `${id} ${scheme}`).toBe(hexRgb(painted.highlightFg))
        expect(getComputedStyle(screen.getByTestId('outcome-report')).backgroundColor, `${id} ${scheme}`).not.toBe(
          hexRgb(painted.highlightBg),
        )
        unmount()
      }
    }
  })

  it('keeps both scheme controls mounted and T / keyboard access', () => {
    expect(readSchemeCompact(null)).toBe(false)
    expect(
      schemeNeedsCompact({
        available: 900,
        brand: 240,
        status: 260,
        nav: 400,
        schemeFull: 220,
        help: 48,
        gap: 8,
      }),
    ).toBe(true)
    mockMatchMedia(true)

    for (const id of BANKS) {
      const { unmount } = renderThemed(id)
      expect(screen.getByTestId('color-scheme'), `${id} segment`).toBeTruthy()
      expect(screen.getByTestId('scheme-menu'), `${id} menu`).toBeTruthy()
      expect(screen.getByTestId('app-header').getAttribute('data-scheme-compact'), id).toBe('false')
      const light = screen.getByTestId('scheme-light')
      light.focus()
      expect(document.activeElement, id).toBe(light)
      fireEvent.click(light)
      expect(screen.getByTestId('theme-root').getAttribute('data-scheme'), id).toBe('light')
      fireEvent.keyDown(window, { key: 't' })
      const menu = screen.getByTestId('scheme-menu') as HTMLSelectElement
      fireEvent.change(menu, { target: { value: 'dark' } })
      expect(screen.getByTestId('theme-root').getAttribute('data-scheme'), id).toBe('dark')
      unmount()
    }
  })

  it('keeps theme-page focus rings unclipped and does not open horizontal scroll at laptop widths', () => {
    const source = css()
    expect(source).toMatch(/html,\s*body\s*\{[^}]*overflow-x:\s*hidden/)
    expect(source).toMatch(/\.tc-theme-page[\s\S]*overflow-x:\s*clip/)
    expect(source).toMatch(/\.tc-theme-page[\s\S]*overflow-clip-margin:\s*var\(--tc-space-2/)
    expect(DENSITY.focusClip).toBe(DENSITY.space2)
    for (const id of BANKS) {
      const { unmount } = renderThemed(id)
      const page = screen.getByTestId('theme-page')
      expect(page.className, id).toContain('tc-theme-page')
      expect(page.style.overflowX, id).toBe('clip')
      expect(page.style.overflowX, id).not.toBe('hidden')
      expect(page.style.overflowClipMargin, id).toBe(DENSITY.focusClip)
      expect(page.style.maxWidth, id).toBe('100%')
      expect(page.style.minWidth, id).toMatch(/^0(px)?$/)
      for (const width of LAPTOP_WIDTHS) {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
        window.dispatchEvent(new Event('resize'))
        expect(page.style.overflowX, `${id} @ ${width}`).toBe('clip')
        expect(page.style.maxWidth, `${id} @ ${width}`).toBe('100%')
      }
      unmount()
    }
  })

  it('resolves the same pill and card radius tokens on every bank', () => {
    expect(DENSITY.radiusControl).toBe('999px')
    expect(DENSITY.headerRadius).toBe('999px')
    expect(DENSITY.radiusCard).toBe('16px')
    expect(css()).toContain(`--tc-radius-control: ${DENSITY.radiusControl}`)
    expect(css()).toContain(`--tc-radius-card: ${DENSITY.radiusCard}`)
    expect(css()).toContain(`--tc-header-radius: ${DENSITY.headerRadius}`)
    expect(css()).not.toMatch(/\[data-theme=(?:fnb|pnc|tellr|mtb)\][^{]*\{[^}]*border-radius/)
    const tellrVars = themeVars(THEMES.tellr!)
    for (const id of BANKS) {
      const source = readFileSync(`src/theme/themes/${id}.ts`, 'utf8')
      expect(source, id).not.toMatch(/\bradius\s*:/)
      expect(source, id).not.toMatch(/radiusControl|radiusCard|headerRadius/)
      const theme = THEMES[id]
      expect(theme, id).toBeTruthy()
      expect(theme, id).not.toHaveProperty('radius')
      const vars = themeVars(theme!)
      expect(vars['--tc-radius-control'], id).toBe(DENSITY.radiusControl)
      expect(vars['--tc-radius-card'], id).toBe(DENSITY.radiusCard)
      expect(vars['--tc-header-radius'], id).toBe(DENSITY.headerRadius)
      expect(vars['--tc-radius-control'], id).toBe(tellrVars['--tc-radius-control'])
      expect(vars['--tc-radius-card'], id).toBe(tellrVars['--tc-radius-card'])
      expect(vars['--tc-header-radius'], id).toBe(tellrVars['--tc-header-radius'])
      const { unmount } = renderThemed(id)
      const root = screen.getByTestId('theme-root')
      expect(root.style.getPropertyValue('--tc-radius-control'), id).toBe(DENSITY.radiusControl)
      expect(root.style.getPropertyValue('--tc-radius-card'), id).toBe(DENSITY.radiusCard)
      expect(root.style.getPropertyValue('--tc-header-radius'), id).toBe(DENSITY.headerRadius)
      expect(root.style.getPropertyValue('--tc-radius-control'), id).toBe(
        screen.getByTestId('theme-root').style.getPropertyValue('--tc-radius-control'),
      )
      unmount()
    }
  })

  it('shares header heights, type size, and line-height tokens across every bank', () => {
    expect(DENSITY.headerMinHeight).toBe(DENSITY.headerControlHeight)
    expect(DENSITY.controlHeight).toBe('48px')
    expect(DENSITY.typeLineBody).toBe('1.5')
    expect(DENSITY.typeLineHeading).toBe('1.2')
    expect(DENSITY.typeLineUi).toBe('1.2')
    const tellrVars = themeVars(THEMES.tellr!)
    for (const id of BANKS) {
      const vars = themeVars(THEMES[id]!)
      for (const key of SHARED_STRUCTURE_VARS) {
        expect(vars[key], `${id} ${key}`).toBe(tellrVars[key])
      }
      const { unmount } = renderThemed(id)
      const root = screen.getByTestId('theme-root')
      expect(root.style.getPropertyValue('--tc-header-h'), id).toBe(DENSITY.headerMinHeight)
      expect(root.style.getPropertyValue('--tc-header-control-h'), id).toBe(DENSITY.headerControlHeight)
      expect(root.style.getPropertyValue('--tc-control-h'), id).toBe(DENSITY.controlHeight)
      expect(root.style.getPropertyValue('--tc-type-title'), id).toBe(DENSITY.typeTitle)
      expect(root.style.getPropertyValue('--tc-type-pill'), id).toBe(DENSITY.typePill)
      expect(root.style.getPropertyValue('--tc-type-line-body'), id).toBe(DENSITY.typeLineBody)
      expect(root.style.getPropertyValue('--tc-type-line-heading'), id).toBe(DENSITY.typeLineHeading)
      expect(root.style.getPropertyValue('--tc-type-line-ui'), id).toBe(DENSITY.typeLineUi)
      expect(screen.getByTestId('app-header').style.minHeight, id).toBe(DENSITY.headerMinHeight)
      unmount()
    }
  })

  it('sizes content tabs and spreads header groups across the pill', () => {
    const source = css()
    expect(source).toMatch(/\.tc-header\s*\{[^}]*justify-content:\s*space-between/)
    expect(source).toMatch(/\.tc-header\s*\{[^}]*padding-inline:\s*var\(--tc-space-2/)
    expect(source).toMatch(/\.tc-header-nav\s*\{[^}]*flex:\s*0 0 auto/)
    expect(source).toMatch(/\.tc-header-nav\s*\{[^}]*justify-content:\s*center/)
    expect(source).not.toMatch(/\.tc-header-nav\s*\{[^}]*flex:\s*1 1 auto/)
    expect(source).not.toMatch(/\.tc-header-nav\s*\{[^}]*margin-inline:\s*auto/)
    expect(source).toMatch(/\.tc-header-nav\s*\{[^}]*flex-wrap:\s*nowrap/)
    expect(source).toMatch(/\.tc-header-nav\s*\{[^}]*overflow:\s*visible/)
    expect(source).toMatch(/\.tc-header-nav\s*\{[^}]*gap:\s*var\(--tc-space-header/)
    expect(source).toMatch(/\.tc-header-nav a[\s\S]*flex:\s*0 0 auto/)
    expect(source).not.toMatch(/\.tc-header-nav a[\s\S]*flex:\s*1 1 0/)
    expect(source).toMatch(/\.tc-header-nav a[\s\S]*text-align:\s*center/)
    expect(source).toMatch(/\.tc-header-nav a[\s\S]*min-width:\s*min-content/)
    expect(source).toMatch(/\.tc-header-nav a[\s\S]*border-radius:\s*var\(--tc-header-radius/)
    expect(source).not.toMatch(/\.tc-header-nav[\s\S]*overflow-x:\s*auto/)
    for (const id of BANKS) {
      const { unmount } = renderThemed(id)
      const nav = screen.getByTestId('app-nav')
      expect(nav.style.flex, id).toBe('0 0 auto')
      expect(nav.style.justifyContent, id).toBe('center')
      expect(nav.style.marginInline, id).not.toBe('auto')
      const header = screen.getByTestId('app-header')
      expect(header.style.justifyContent, id).toBe('space-between')
      expect(header.style.paddingInline, id).toBe('var(--tc-space-2)')
      expect(nav.style.flexWrap, id).toBe('nowrap')
      expect(nav.style.overflow, id).toBe('visible')
      expect(nav.style.gap, id).toBe('var(--tc-space-header, 8px)')
      expect(screen.queryByTestId('local-clock'), id).toBeNull()
      expect(screen.queryByTestId('connection-status'), id).toBeNull()
      const tabs = ['Home', 'Outcome', 'Handoff'].map((label) => screen.getByText(label))
      expect(tabs, id).toHaveLength(3)
      for (const tab of tabs) {
        expect(tab.className, `${id} ${tab.textContent}`).toContain('tc-nav-tab')
        expect(tab.style.flex, `${id} ${tab.textContent}`).toMatch(/^0 0 auto$/)
        expect(tab.style.justifyContent, `${id} ${tab.textContent}`).toBe('center')
        expect(tab.style.textAlign, `${id} ${tab.textContent}`).toBe('center')
        expect(tab.style.whiteSpace, `${id} ${tab.textContent}`).toBe('nowrap')
        expect(tab.style.overflow, `${id} ${tab.textContent}`).toBe('visible')
        expect(tab.style.minWidth, `${id} ${tab.textContent}`).toBe('min-content')
        expect(tab.style.borderRadius, `${id} ${tab.textContent}`).toBe('var(--tc-header-radius, 999px)')
        expect(tab.textContent, id).not.toMatch(/…|\.\.\./)
      }
      for (const width of LAPTOP_WIDTHS) {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
        window.dispatchEvent(new Event('resize'))
        expect(header.style.justifyContent, `${id} @ ${width}`).toBe('space-between')
        expect(header.style.paddingInline, `${id} @ ${width}`).toBe('var(--tc-space-2)')
        expect(header.style.flexWrap, `${id} @ ${width}`).toBe('nowrap')
        expect(nav.style.flex, `${id} @ ${width}`).toBe('0 0 auto')
        expect(nav.style.justifyContent, `${id} @ ${width}`).toBe('center')
        expect(nav.style.flexWrap, `${id} @ ${width}`).toBe('nowrap')
        expect(nav.style.overflow, `${id} @ ${width}`).toBe('visible')
        for (const tab of tabs) {
          expect(tab.style.flex, `${id} ${tab.textContent} @ ${width}`).toMatch(/^0 0 auto$/)
          expect(tab.style.whiteSpace, `${id} ${tab.textContent} @ ${width}`).toBe('nowrap')
          expect(tab.style.overflow, `${id} ${tab.textContent} @ ${width}`).toBe('visible')
          expect(tab.textContent, `${id} @ ${width}`).not.toMatch(/…|\.\.\./)
        }
      }
      unmount()
    }
  })
})
