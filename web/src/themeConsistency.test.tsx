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
import { COLOR_STORAGE_KEY, DENSITY, HEADER_SCHEME_COLLAPSE_PX, THEME_STORAGE_KEY } from './theme/tokens'
import { themeVars } from './theme/vars'
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

function mockMatchMedia(collapsed: boolean) {
  window.matchMedia = (query: string) => {
    const matches = query.includes(`max-width: ${HEADER_SCHEME_COLLAPSE_PX}px`)
      ? collapsed
      : query.includes('prefers-color-scheme: dark')
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
      expect(theme?.space, id).not.toHaveProperty('gap')
      expect(themeVars(theme!)['--tc-space-gap'], id).toBe(DENSITY.spaceGap)
      expect(themeVars(theme!)['--tc-space-gap'], id).toBe(themeVars(THEMES.tellr!)['--tc-space-gap'])
    }
  })

  it('sizes the connection and simulation pills from one token on every bank', () => {
    expect(DENSITY.typePill).toBe('0.875rem')
    const source = css()
    expect(source).toContain(`--tc-type-pill: ${DENSITY.typePill}`)
    expect(source).toMatch(/\.tc-connection[\s\S]*font-size:\s*var\(--tc-type-pill/)
    expect(source).toMatch(/\.tc-live-badge[\s\S]*font-size:\s*var\(--tc-type-pill/)
    for (const id of BANKS) {
      const { unmount } = renderThemed(id)
      const root = screen.getByTestId('theme-root')
      expect(root.style.getPropertyValue('--tc-type-pill'), id).toBe(DENSITY.typePill)
      expect(screen.getByTestId('connection-status').className, id).toContain('tc-connection')
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
        expect(suggested.getAttribute('style'), `${id} ${scheme}`).toContain('var(--tc-highlight)')
        expect(suggested.getAttribute('data-highlighted'), `${id} ${scheme}`).toBe('true')
        const computed = getComputedStyle(suggested).backgroundColor
        if (computed.startsWith('rgb')) {
          expect(computed, `${id} ${scheme}`).toBe(hexRgb(painted.highlightBg))
        }
        expect(screen.getByTestId('outcome-report').getAttribute('style') ?? '', `${id} ${scheme}`).not.toContain(
          'var(--tc-highlight)',
        )
        unmount()
      }
    }
  })

  it('mounts only the active scheme control and keeps T and keyboard access', () => {
    expect(readSchemeCompact(null)).toBe(false)
    mockMatchMedia(false)
    expect(readSchemeCompact(null)).toBe(false)

    for (const id of BANKS) {
      const { unmount } = renderThemed(id)
      expect(screen.getByTestId('color-scheme'), `${id} segment`).toBeTruthy()
      expect(screen.queryByTestId('scheme-menu'), `${id} segment`).toBeNull()
      const light = screen.getByTestId('scheme-light')
      light.focus()
      expect(document.activeElement, id).toBe(light)
      fireEvent.click(light)
      expect(screen.getByTestId('theme-root').getAttribute('data-scheme'), id).toBe('light')
      fireEvent.keyDown(window, { key: 't' })
      unmount()
    }

    mockMatchMedia(true)
    expect(readSchemeCompact(null)).toBe(true)
    for (const id of BANKS) {
      const { unmount } = renderThemed(id)
      const menu = screen.getByTestId('scheme-menu') as HTMLSelectElement
      expect(menu, `${id} menu`).toBeTruthy()
      expect(screen.queryByTestId('color-scheme'), `${id} menu`).toBeNull()
      menu.focus()
      expect(document.activeElement, id).toBe(menu)
      fireEvent.change(menu, { target: { value: 'light' } })
      expect(screen.getByTestId('theme-root').getAttribute('data-scheme'), id).toBe('light')
      const before = screen.getByTestId('theme-root').getAttribute('data-theme')
      fireEvent.keyDown(window, { key: 't' })
      expect(screen.getByTestId('theme-root').getAttribute('data-theme'), id).not.toBe(before)
      expect(screen.getByTestId('scheme-menu'), `${id} after T`).toBeTruthy()
      expect(screen.queryByTestId('color-scheme'), `${id} after T`).toBeNull()
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
      expect(page.style.minWidth, id).toBe('0')
      for (const width of LAPTOP_WIDTHS) {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
        window.dispatchEvent(new Event('resize'))
        expect(page.style.overflowX, `${id} @ ${width}`).toBe('clip')
        expect(page.style.maxWidth, `${id} @ ${width}`).toBe('100%')
      }
      unmount()
    }
  })
})
