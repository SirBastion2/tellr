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
    const score = screen.getByTestId('copilot-score')
    const control = screen.getByRole('button', { name: 'Score explanation' })
    const overlay = screen.getByTestId('score-explanation-overlay')

    expect(workstation?.nextElementSibling).toBeNull()
    expect(home.querySelector(':scope > .tc-explain')).toBeNull()
    expect(home.querySelector(':scope > [data-testid="explain-panel"]')).toBeNull()
    expect(home.childElementCount).toBe(1)
    expect(screen.getByTestId('copilot-strip').contains(control)).toBe(true)
    expect(score.nextElementSibling).toBe(control)
    expect(score.closest('dd')?.contains(control)).toBe(true)
    expect(score.closest('dl')?.querySelector('dt')?.textContent).toBe(URGENCY_SCORE_TERM)
    expect(control.getAttribute('aria-expanded')).toBe('false')
    expect(control.className).toContain('tc-btn')
    expect(control.style.borderRadius).toBe('var(--tc-radius-control, 999px)')
    expect(overlay.hidden).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Why this level' })).toBeNull()

    const rule = cssRule('.tc-explain-overlay')
    expect(rule).toMatch(/position:\s*absolute/)
    expect(rule).toMatch(/max-height:\s*100vh/)
    expect(rule).toMatch(/max-height:\s*100dvh/)
    expect(rule).toMatch(/overflow-y:\s*auto/)
    expect(rule).toMatch(/background:\s*var\(--tc-surface/)
    expect(rule).toMatch(/color:\s*var\(--tc-text/)
    expect(rule).not.toMatch(/tellr|pnc|mtb|fnb/)

    fireEvent.click(control)
    const panel = screen.getByTestId('explain-panel')
    expect(control.getAttribute('aria-expanded')).toBe('true')
    expect(overlay.hidden).toBe(false)
    expect(overlay.contains(panel)).toBe(true)
    expect(screen.getByTestId('copilot-strip').contains(panel)).toBe(true)
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
})
