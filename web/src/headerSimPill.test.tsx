// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import t1 from '../../contract/fixtures/T1.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AppShell } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { liveBadgeText } from './LiveBadge'
import './index.css'
import { PresenterProvider } from './presenter'
import { THEME_IDS, THEMES } from './theme/registry'
import { ThemeProvider } from './theme/ThemeProvider'
import { COLOR_STORAGE_KEY, DENSITY, THEME_STORAGE_KEY } from './theme/tokens'
import { SHARED_STRUCTURE_VARS, themeVars } from './theme/vars'
import type { SessionState } from './types'

const BANKS = ['tellr', 'pnc', 'mtb', 'fnb'] as const
const STATES = ['idle', 'running', 'paused', 'after'] as const
const HEADER_WIDTHS = [1024, 1180, 1280] as const
const session = t1.steps[0]?.response as SessionState
const css = () => readFileSync('src/index.css', 'utf8')

type SimState = (typeof STATES)[number]

function headerRule(source: string, selector: string): string {
  const match = source.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))
  if (!match?.[1]) {
    throw new Error(`missing ${selector} rule`)
  }
  return match[1]
}

function demoView(overrides: Partial<DemoView> = {}): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: CUSTOMERS[0]?.id ?? '',
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
    ...overrides,
  }
}

function renderState(themeId: string, state: SimState, customerId = CUSTOMERS[0]?.id ?? '') {
  window.history.replaceState({}, '', `/?theme=${themeId}`)
  window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
  window.localStorage.setItem(COLOR_STORAGE_KEY, 'dark')
  const live = state === 'running' || state === 'paused'
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <PresenterProvider>
          <AppShell
            library={null}
            session={live ? session : null}
            issues={[]}
            demo={demoView({
              customerId,
              playing: state === 'running',
              index: live ? 1 : 0,
              elapsedMs: live ? 4000 : 0,
            })}
          />
        </PresenterProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

function chromeOf(element: HTMLElement) {
  const style = getComputedStyle(element)
  return {
    className: element.className,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    padding: style.padding,
    paddingTop: style.paddingTop,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    paddingRight: style.paddingRight,
    height: style.height,
    minHeight: style.minHeight,
    minWidth: style.minWidth,
    maxWidth: style.maxWidth,
    boxSizing: style.boxSizing,
    flexGrow: style.flexGrow,
    flexShrink: style.flexShrink,
    flexBasis: style.flexBasis,
  }
}

function headerTokens(root: HTMLElement) {
  return {
    typePill: root.style.getPropertyValue('--tc-type-pill'),
    headerControlH: root.style.getPropertyValue('--tc-header-control-h'),
    controlH: root.style.getPropertyValue('--tc-control-h'),
    headingWeight: root.style.getPropertyValue('--tc-heading-weight'),
    simPillMax: root.style.getPropertyValue('--tc-sim-pill-max'),
    playMin: root.style.getPropertyValue('--tc-play-min'),
    timerMin: root.style.getPropertyValue('--tc-timer-min'),
  }
}

describe('simulation pill stays the same size before and during play', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  })

  it('uses shared control-height and type tokens and content-width status pills', () => {
    const source = css()
    const badge = headerRule(source, '.tc-live-badge')
    const timer = headerRule(source, '.tc-timer')
    expect(DENSITY.headerControlHeight).toBe(DENSITY.controlHeight)
    expect(DENSITY.typePill).toBe('0.875rem')
    expect(DENSITY.simPillMaxWidth).toBe('none')
    expect(source).not.toContain('--tc-sim-pill-min:')
    expect(source).not.toContain('--tc-conn-pill-min:')
    expect(source).toContain(`--tc-sim-pill-max: ${DENSITY.simPillMaxWidth}`)
    expect(source).not.toContain('--tc-clock-min:')
    expect(source).toContain(`--tc-text-sm: ${DENSITY.typePill}`)
    expect(source).toContain('--tc-type-pill: var(--tc-text-sm)')
    expect(source).toContain(`--tc-header-control-h: ${DENSITY.headerControlHeight}`)
    expect(badge).toMatch(/flex:\s*0 1 auto/)
    expect(badge).toMatch(/display:\s*inline-flex/)
    expect(badge).toMatch(/align-items:\s*center/)
    expect(badge).toMatch(/width:\s*max-content/)
    expect(badge).toMatch(/height:\s*var\(--tc-header-control-h/)
    expect(badge).toMatch(/min-height:\s*var\(--tc-header-control-h/)
    expect(badge).toMatch(/min-width:\s*0/)
    expect(badge).toMatch(/max-width:\s*100%/)
    expect(badge).toMatch(/padding-block:\s*var\(--tc-space-2/)
    expect(badge).toMatch(/padding-inline:\s*var\(--tc-sim-pad-inline/)
    expect(badge).toMatch(/font-size:\s*var\(--tc-text-sm/)
    expect(badge).toMatch(/font-weight:\s*var\(--tc-heading-weight/)
    expect(badge).toMatch(/text-overflow:\s*ellipsis/)
    expect(source).not.toMatch(/\.tc-live-badge\[/)
    expect(source).not.toMatch(/\.tc-live-badge--/)
    expect(source).not.toMatch(/\.tc-connection\s*\{/)
    expect(source).not.toMatch(/\.tc-local-clock/)
    expect(timer).toMatch(/font-variant-numeric:\s*tabular-nums/)
    expect(timer).toMatch(/min-width:\s*var\(--tc-timer-min/)
    expect(headerRule(source, '.tc-play-label')).toMatch(/display:\s*grid/)
    expect(headerRule(source, '.tc-case-label')).toMatch(/display:\s*grid/)
    expect(headerRule(source, '.tc-header')).toMatch(/flex-wrap:\s*nowrap/)
    expect(headerRule(source, '.tc-header')).toMatch(/justify-content:\s*space-between/)
    expect(headerRule(source, '.tc-header-nav')).toMatch(/flex:\s*0 0 auto/)
    expect(headerRule(source, '.tc-header-nav')).toMatch(/justify-content:\s*center/)
    expect(headerRule(source, '.tc-header-nav')).not.toMatch(/margin-inline:\s*auto/)
    for (const id of BANKS) {
      const vars = themeVars(THEMES[id]!)
      expect(vars['--tc-sim-pill-max'], id).toBe(DENSITY.simPillMaxWidth)
      expect(vars['--tc-type-pill'], id).toBe(DENSITY.typePill)
      expect(vars['--tc-header-control-h'], id).toBe(DENSITY.headerControlHeight)
      expect(vars, id).not.toHaveProperty('--tc-clock-min')
      expect(SHARED_STRUCTURE_VARS, id).not.toContain('--tc-clock-min')
      expect(SHARED_STRUCTURE_VARS, id).not.toContain('--tc-sim-pill-min')
    }
  })

  it('keeps pill and header class names and type tokens identical idle vs running in every bank', () => {
    expect([...THEME_IDS]).toEqual([...BANKS])
    for (const id of BANKS) {
      const snapshots = STATES.map((state) => {
        const { unmount } = renderState(id, state)
        const root = screen.getByTestId('theme-root')
        const header = screen.getByTestId('app-header')
        const badge = screen.getByTestId('live-badge')
        const nav = screen.getByTestId('app-nav')
        const play = screen.getByTestId('demo-play')
        const timer = screen.getByTestId('elapsed-timer')
        const speed = screen.getByTestId('demo-transport')
        const title = liveBadgeText('live', CUSTOMERS[0]?.title ?? '')
        expect(root.getAttribute('data-theme'), `${id} ${state}`).toBe(id)
        expect(badge.className, `${id} ${state}`).toBe('tc-live-badge')
        expect(badge.getAttribute('data-playing'), `${id} ${state}`).toBeNull()
        expect(header.className, `${id} ${state}`).toBe('tc-header')
        expect(nav.className, `${id} ${state}`).toBe('tc-header-nav')
        expect(badge.textContent, `${id} ${state}`).toBe(title)
        expect(badge.getAttribute('title'), `${id} ${state}`).toBe(title)
        expect(screen.queryByTestId('connection-status')).toBeNull()
        expect(screen.queryByTestId('local-clock')).toBeNull()
        const snap = {
          state,
          badge: chromeOf(badge),
          header: chromeOf(header),
          nav: chromeOf(nav),
          play: chromeOf(play),
          timer: chromeOf(timer),
          speed: chromeOf(speed),
          tokens: headerTokens(root),
        }
        unmount()
        return snap
      })
      const idle = snapshots[0]
      expect(idle, id).toBeTruthy()
      for (const snap of snapshots.slice(1)) {
        expect(snap.badge, `${id} ${snap.state} badge`).toEqual(idle!.badge)
        expect(snap.header, `${id} ${snap.state} header`).toEqual(idle!.header)
        expect(snap.nav, `${id} ${snap.state} nav`).toEqual(idle!.nav)
        expect(snap.play, `${id} ${snap.state} play`).toEqual(idle!.play)
        expect(snap.timer, `${id} ${snap.state} timer`).toEqual(idle!.timer)
        expect(snap.speed, `${id} ${snap.state} speed`).toEqual(idle!.speed)
        expect(snap.tokens, `${id} ${snap.state} tokens`).toEqual(idle!.tokens)
        expect(snap.tokens.typePill, `${id} ${snap.state}`).toBe(DENSITY.typePill)
        expect(snap.tokens.headerControlH, `${id} ${snap.state}`).toBe(DENSITY.headerControlHeight)
        expect(snap.tokens.simPillMax, `${id} ${snap.state}`).toBe(DENSITY.simPillMaxWidth)
      }
    }
  })

  it('does not clip simulation labels at 1024, 1180, or 1280 and keeps tabs from depending on Play', () => {
    for (const width of HEADER_WIDTHS) {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
      window.dispatchEvent(new Event('resize'))
      for (const customer of CUSTOMERS) {
        const label = liveBadgeText('live', customer.title)
        expect(label, customer.id).toBe(`Simulation: ${customer.title}`)
        for (const state of ['idle', 'running'] as const) {
          const { unmount } = renderState('tellr', state, customer.id)
          const badge = screen.getByTestId('live-badge')
          const nav = screen.getByTestId('app-nav')
          expect(badge.textContent, `${customer.id} ${state} @ ${width}`).toBe(label)
          expect(badge.getAttribute('title'), `${customer.id} ${state} @ ${width}`).toBe(label)
          expect(badge.textContent, `${customer.id} ${state} @ ${width}`).not.toMatch(/…|\.\.\.$/)
          expect(badge.className, `${customer.id} ${state} @ ${width}`).toBe('tc-live-badge')
          expect(headerRule(css(), '.tc-live-badge')).toMatch(/flex:\s*0 1 auto/)
          expect(headerRule(css(), '.tc-live-badge')).toMatch(/width:\s*max-content/)
          expect(nav.className, `${customer.id} ${state} @ ${width}`).toBe('tc-header-nav')
          expect(headerRule(css(), '.tc-header-nav')).toMatch(/flex:\s*0 0 auto/)
          expect(screen.queryByTestId('local-clock')).toBeNull()
          expect(screen.queryByTestId('connection-status')).toBeNull()
          for (const tabLabel of ['Home', 'Outcome', 'Handoff']) {
            expect(screen.getByText(tabLabel).textContent, `${tabLabel} ${state} @ ${width}`).toBe(tabLabel)
          }
          unmount()
        }
      }
    }
    expect(liveBadgeText('live', null)).toBe('LIVE — no scenario loaded')
  })

  it('keeps Play/Pause, speed, and the timer on one control height', () => {
    const { unmount: idleUnmount } = renderState('tellr', 'idle')
    const idlePlay = chromeOf(screen.getByTestId('demo-play'))
    const idleTimer = chromeOf(screen.getByTestId('elapsed-timer'))
    const idleSpeed = chromeOf(screen.getByTestId('demo-transport'))
    expect(screen.getByTestId('demo-play').querySelector('[data-show="true"]')?.textContent).toBe('Play')
    expect(screen.getByTestId('demo-play').querySelector('.tc-play-label')).toBeTruthy()
    expect(screen.getByTestId('elapsed-timer').className).toBe('tc-timer')
    expect(headerRule(css(), '.tc-timer')).toMatch(/font-variant-numeric:\s*tabular-nums/)
    expect(headerRule(css(), '.tc-timer')).toMatch(/min-width:\s*var\(--tc-timer-min/)
    idleUnmount()

    const { unmount } = renderState('tellr', 'running')
    expect(screen.getByTestId('demo-play').querySelector('[data-show="true"]')?.textContent).toBe('Pause')
    expect(chromeOf(screen.getByTestId('demo-play'))).toEqual(idlePlay)
    expect(chromeOf(screen.getByTestId('elapsed-timer'))).toEqual(idleTimer)
    expect(chromeOf(screen.getByTestId('demo-transport'))).toEqual(idleSpeed)
    fireEvent.click(screen.getByTestId('demo-speed-up'))
    fireEvent.click(screen.getByTestId('demo-speed-up'))
    expect(chromeOf(screen.getByTestId('demo-transport')).minHeight).toBe(idleSpeed.minHeight)
    unmount()
  })
})
