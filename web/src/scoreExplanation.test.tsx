// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CSSProperties } from 'react'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import './index.css'
import { HomeScreen } from './screens/HomeScreen'
import { themeForScheme } from './theme/palette'
import { THEME_IDS, THEMES } from './theme/registry'
import { themeVars } from './theme/vars'
import type { ActivityRow, Library, SessionState } from './types'
import { URGENCY_SCORE_TERM } from './ui/urgencyScore'

const library = libraryJson as Library
const opener = t1.steps[0]?.response as SessionState
const activity: ActivityRow[] = [
  { ts: '2026-10-25T12:08:00Z', channel: 'chip.on_phone', amount_band: 'under_1000', type: 'ContextAdded' },
]

function demo(overrides: Partial<DemoView> = {}): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: 'government-impersonation',
    index: 4,
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
    onRestoreSignal: () => undefined,
    onEscalate: () => undefined,
    ...overrides,
  }
}

function cssRule(selector: string): string {
  const source = readFileSync('src/index.css', 'utf8')
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))
  if (!match?.[1]) {
    throw new Error(`missing ${selector}`)
  }
  return match[1]
}

describe('score explanation overlay', () => {
  it('opens and closes over the copilot and leaves nothing below the workstation', () => {
    render(<HomeScreen library={library} session={opener} activity={activity} demo={demo()} />)
    const home = screen.getByTestId('home-screen')
    const workstation = home.querySelector(':scope > .tc-workstation')
    const strip = screen.getByTestId('copilot-strip')
    const score = screen.getByTestId('copilot-score')
    const control = screen.getByRole('button', { name: 'Score explanation' })
    const overlay = screen.getByTestId('score-explanation-overlay')

    expect(workstation?.nextElementSibling).toBeNull()
    expect(home.querySelector(':scope > .tc-explain')).toBeNull()
    expect(home.querySelector(':scope > [data-testid="explain-panel"]')).toBeNull()
    expect(home.childElementCount).toBe(1)
    expect(strip.contains(control)).toBe(true)
    expect(strip.contains(overlay)).toBe(true)
    expect(overlay.closest('[data-testid="copilot-strip"]')).toBe(strip)
    expect(overlay.parentElement).not.toBe(document.body)
    expect(overlay.contains(control)).toBe(false)
    expect(score.nextElementSibling).toBe(control)
    expect(score.closest('dd')?.contains(control)).toBe(true)
    expect(score.closest('dl')?.querySelector('dt')?.textContent).toBe(URGENCY_SCORE_TERM)
    expect(control.getAttribute('aria-expanded')).toBe('false')
    expect(control.className).toContain('tc-btn')
    expect(control.style.borderRadius).toBe('var(--tc-radius-control, 999px)')
    expect(overlay.hidden).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Why this level' })).toBeNull()

    const rule = cssRule('.tc-explain-overlay')
    expect(cssRule('.tc-strip')).toMatch(/position:\s*relative/)
    expect(rule).toMatch(/position:\s*absolute/)
    expect(rule).not.toMatch(/position:\s*fixed/)
    expect(rule).not.toMatch(/position-anchor|anchor\(/)
    expect(rule).toMatch(/box-sizing:\s*border-box/)
    expect(rule).toMatch(/(?:^|[^-\w])width:\s*100%/)
    expect(rule).toMatch(/left:\s*0/)
    expect(rule).toMatch(/right:\s*0/)
    expect(rule).toMatch(/bottom:\s*0/)
    expect(rule).toMatch(/top:\s*var\(--tc-explain-pin/)
    expect(strip.style.getPropertyValue('--tc-explain-pin')).toMatch(/^\d+(?:\.\d+)?px$/)
    expect(rule).toMatch(/max-height:\s*100%/)
    expect(rule).toMatch(/max-width:\s*100%/)
    expect(rule).toMatch(/max-width:\s*min\(100%,\s*100vw\)/)
    expect(rule).toMatch(/max-height:\s*min\(100%,\s*100vh\)/)
    expect(rule).toMatch(/max-height:\s*min\(100%,\s*100dvh\)/)
    expect(rule).not.toMatch(/overflow-y:\s*auto/)
    expect(cssRule('.tc-explain-overlay-body')).toMatch(/overflow-y:\s*auto/)
    expect(cssRule('.tc-explain-overlay .tc-title')).toMatch(/position:\s*sticky/)
    expect(rule).toMatch(/background:\s*var\(--tc-surface/)
    expect(rule).toMatch(/color:\s*var\(--tc-text/)
    expect(rule).not.toMatch(/tellr|pnc|mtb|fnb/)
    expect(overlay.querySelector('.tc-explain-overlay-body')).toBeTruthy()

    fireEvent.click(control)
    const panel = screen.getByTestId('explain-panel')
    expect(control.getAttribute('aria-expanded')).toBe('true')
    expect(overlay.hidden).toBe(false)
    expect(overlay.contains(panel)).toBe(true)
    expect(strip.contains(panel)).toBe(true)
    expect(overlay.querySelector('.tc-explain-overlay-body')?.contains(panel)).toBe(true)
    expect(overlay.contains(control)).toBe(false)
    expect(workstation?.nextElementSibling).toBeNull()
    expect(home.childElementCount).toBe(1)
    expect(screen.getByRole('heading', { name: 'Why this level' })).toBeTruthy()
    const text = panel.textContent ?? ''
    let at = -1
    for (const part of [
      'Why this level',
      'Noted',
      'Level',
      URGENCY_SCORE_TERM,
      'Pattern',
      'Suggested outcome',
      'What raised it',
      'What would lower it',
      'Technical details',
    ]) {
      const next = text.indexOf(part)
      expect(next, part).toBeGreaterThan(at)
      at = next
    }
    expect(panel.querySelector('[data-testid="technical-details"]')).toBeTruthy()
    expect(panel.querySelector('[data-testid="explain-level"]')).toBeTruthy()
    expect(panel.querySelector('[data-testid="explain-score"]')).toBeTruthy()
    expect(panel.querySelector('[data-testid="noted-at"]')).toBeTruthy()

    fireEvent.click(panel)
    expect(control.getAttribute('aria-expanded')).toBe('true')
    expect(overlay.hidden).toBe(false)

    fireEvent.click(control)
    expect(control.getAttribute('aria-expanded')).toBe('false')
    expect(overlay.hidden).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Why this level' })).toBeNull()
    expect(workstation?.nextElementSibling).toBeNull()

    fireEvent.click(control)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(overlay.hidden).toBe(true)
    expect(control.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(control)
    fireEvent.click(screen.getByTestId('transaction-panel'))
    expect(overlay.hidden).toBe(true)
    expect(control.getAttribute('aria-expanded')).toBe('false')

    const buttonStyle = control.style.cssText
    const overlayClass = overlay.className
    for (const themeId of THEME_IDS) {
      for (const scheme of ['dark', 'light'] as const) {
        const theme = THEMES[themeId]
        expect(theme, themeId).toBeTruthy()
        const painted = themeForScheme(theme!, scheme)
        const view = render(
          <div style={themeVars(painted) as CSSProperties}>
            <HomeScreen library={library} session={opener} activity={activity} demo={demo()} />
          </div>,
        )
        const themedControl = screen.getAllByRole('button', { name: 'Score explanation' }).at(-1)
        const themedOverlay = screen.getAllByTestId('score-explanation-overlay').at(-1)
        expect(themedControl, themeId).toBeTruthy()
        expect(themedOverlay, themeId).toBeTruthy()
        expect(themedControl?.style.cssText, `${themeId} ${scheme}`).toBe(buttonStyle)
        expect(themedControl?.style.borderRadius, `${themeId} ${scheme}`).toBe('var(--tc-radius-control, 999px)')
        expect(themedControl?.style.padding, `${themeId} ${scheme}`).toBe('var(--tc-space-1, 4px) var(--tc-space-2, 8px)')
        expect(themedOverlay?.className, `${themeId} ${scheme}`).toBe(overlayClass)
        const themedStrip = themedOverlay?.closest('[data-testid="copilot-strip"]')
        expect(themedStrip, `${themeId} ${scheme}`).toBeTruthy()
        expect(themedStrip?.contains(themedOverlay as Node), `${themeId} ${scheme}`).toBe(true)
        expect(themedStrip?.contains(themedControl as Node), `${themeId} ${scheme}`).toBe(true)
        expect(themedOverlay?.contains(themedControl as Node), `${themeId} ${scheme}`).toBe(false)
        const vars = themeVars(painted)
        expect(vars['--tc-surface'], `${themeId} ${scheme}`).toBe(painted.surface)
        expect(vars['--tc-text'], `${themeId} ${scheme}`).toBe(painted.text)
        expect(painted.surface.startsWith('#'), `${themeId} ${scheme}`).toBe(true)
        expect(painted.text.startsWith('#'), `${themeId} ${scheme}`).toBe(true)
        fireEvent.click(themedControl as HTMLElement)
        expect(screen.getAllByRole('heading', { name: 'Why this level' }).length, `${themeId} ${scheme}`).toBeGreaterThan(0)
        expect(screen.getAllByTestId('home-screen').at(-1)?.querySelector(':scope > .tc-workstation')?.nextElementSibling).toBeNull()
        view.unmount()
      }
    }
  })

  it('anchors the overlay to the copilot panel, caps it to the window, and scrolls the body only', () => {
    const overlayRule = cssRule('.tc-explain-overlay')
    const bodyRule = cssRule('.tc-explain-overlay-body')
    const titleRule = cssRule('.tc-explain-overlay .tc-title')
    expect(cssRule('.tc-strip')).toMatch(/position:\s*relative/)
    expect(overlayRule).toMatch(/position:\s*absolute/)
    expect(overlayRule).not.toMatch(/position:\s*fixed/)
    expect(overlayRule).not.toMatch(/position-anchor|anchor\(/)
    expect(overlayRule).toMatch(/box-sizing:\s*border-box/)
    expect(overlayRule).toMatch(/(?:^|[^-\w])width:\s*100%/)
    expect(overlayRule).toMatch(/left:\s*0/)
    expect(overlayRule).toMatch(/right:\s*0/)
    expect(overlayRule).toMatch(/bottom:\s*0/)
    expect(overlayRule).toMatch(/top:\s*var\(--tc-explain-pin/)
    expect(overlayRule).toMatch(/max-height:\s*100%/)
    expect(overlayRule).toMatch(/max-width:\s*100%/)
    expect(overlayRule).toMatch(/max-width:\s*min\(100%,\s*100vw\)/)
    expect(overlayRule).toMatch(/max-height:\s*min\(100%,\s*100vh\)/)
    expect(overlayRule).toMatch(/max-height:\s*min\(100%,\s*100dvh\)/)
    expect(overlayRule).toMatch(/overflow:\s*hidden/)
    expect(overlayRule).not.toMatch(/overflow-y:\s*auto/)
    expect(overlayRule).not.toMatch(/tellr|pnc|mtb|fnb/)
    expect(bodyRule).toMatch(/overflow-y:\s*auto/)
    expect(bodyRule).toMatch(/box-sizing:\s*border-box/)
    expect(bodyRule).not.toMatch(/tellr|pnc|mtb|fnb/)
    expect(titleRule).toMatch(/position:\s*sticky/)
    expect(titleRule).not.toMatch(/tellr|pnc|mtb|fnb/)

    render(<HomeScreen library={library} session={opener} activity={activity} demo={demo()} />)
    const strip = screen.getByTestId('copilot-strip')
    const overlay = screen.getByTestId('score-explanation-overlay')
    const control = screen.getByRole('button', { name: 'Score explanation' })
    expect(overlay.classList.contains('tc-explain-overlay')).toBe(true)
    expect(strip.contains(overlay)).toBe(true)
    expect(overlay.parentElement).not.toBe(document.body)
    expect(strip.style.getPropertyValue('--tc-explain-pin')).toMatch(/^\d+(?:\.\d+)?px$/)
    const body = overlay.querySelector('.tc-explain-overlay-body')
    expect(body).toBeTruthy()
    expect(body?.contains(control)).toBe(false)
    expect(strip.contains(control)).toBe(true)
    fireEvent.click(control)
    expect(overlay.hidden).toBe(false)
    expect(body?.contains(screen.getByTestId('explain-panel'))).toBe(true)
    expect(screen.getByRole('heading', { name: 'Why this level' })).toBeTruthy()
    expect(body?.contains(screen.getByRole('heading', { name: 'Why this level' }))).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(overlay.hidden).toBe(true)
    expect(control.getAttribute('aria-expanded')).toBe('false')
  })
})
