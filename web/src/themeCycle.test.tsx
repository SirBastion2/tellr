import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App, AppShell } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { PresenterProvider } from './presenter'
import { cycleThemeId, THEME_IDS, THEMES } from './theme/registry'
import { ThemeProvider } from './theme/ThemeProvider'
import { COLOR_STORAGE_KEY, DEFAULT_THEME_ID, THEME_STORAGE_KEY } from './theme/tokens'
import type { ColorChoice } from './theme/scheme'
import { themeForScheme } from './theme/palette'
import type { Library, SessionState } from './types'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from './ui/urgencyScore'

const library = libraryJson as Library
const emptyVisit = t1.steps[0]?.response as SessionState
const phoneVisit = {
  ...emptyVisit,
  context_chips: [{ id: 'chip.on_phone', source: 'observed' as const }],
  risk: {
    ...emptyVisit.risk,
    score: 14,
    counterpoint: {
      id: 'sig.third_party_call',
      label: 'On the phone during the visit',
      rationale: 'Scammers often stay on the line.',
    },
  },
  talk_track: {
    ...emptyVisit.talk_track,
    lines: ['I noticed you have someone on the phone. Would you like a moment?'],
  },
} satisfies SessionState

function demo(overrides: Partial<DemoView> = {}): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: CUSTOMERS[0]?.id ?? '',
    index: 1,
    playing: false,
    speed: 1,
    pending: false,
    showCase: false,
    confirmed: [],
    presenter: true,
    elapsedMs: 4000,
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

function renderApp(path = '/') {
  window.history.replaceState({}, '', path)
  return render(<App />)
}

function renderThemedShell(themeId: string, scheme: ColorChoice) {
  window.history.replaceState({}, '', `/?theme=${themeId}`)
  window.localStorage.setItem(COLOR_STORAGE_KEY, scheme)
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <PresenterProvider>
          <AppShell
            library={library}
            session={phoneVisit}
            issues={[]}
            postedChipIds={['chip.on_phone']}
            demo={demo()}
          />
        </PresenterProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

function assertUnclipped(element: HTMLElement) {
  expect(element.className).not.toMatch(/overflow-hidden|clip-hidden|text-clip/)
  expect(element.style.overflow).not.toBe('hidden')
  expect(element.style.overflowX).not.toBe('hidden')
  expect(element.style.clipPath || '').toBe('')
}

describe('bank theme cycle', () => {
  it('lists tellr first, then pnc, mtb, and fnb', () => {
    expect([...THEME_IDS]).toEqual(['tellr', 'pnc', 'mtb', 'fnb'])
    expect(cycleThemeId('tellr')).toBe('pnc')
    expect(cycleThemeId('pnc')).toBe('mtb')
    expect(cycleThemeId('mtb')).toBe('fnb')
    expect(cycleThemeId('fnb')).toBe('tellr')
  })

  it('defaults to tellr on first load even when a leftover theme is stored', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'pnc')
    renderApp('/')
    expect(DEFAULT_THEME_ID).toBe('tellr')
    expect(screen.getByTestId('theme-root').getAttribute('data-theme')).toBe('tellr')
    expect(screen.getByTestId('theme-wordmark').textContent).toContain('tellr')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('pnc')
  })

  it('cycles T through all four banks and wraps without resetting the session', () => {
    renderApp('/')
    const root = screen.getByTestId('theme-root')
    expect(root.getAttribute('data-theme')).toBe('tellr')
    expect(screen.getByTestId('home-screen')).toBeTruthy()
    expect(screen.getByTestId('customer-picker')).toBeTruthy()

    fireEvent.keyDown(window, { key: 't' })
    expect(root.getAttribute('data-theme')).toBe('pnc')
    fireEvent.keyDown(window, { key: 'T' })
    expect(root.getAttribute('data-theme')).toBe('mtb')
    fireEvent.keyDown(window, { key: 't' })
    expect(root.getAttribute('data-theme')).toBe('fnb')
    fireEvent.keyDown(window, { key: 't' })
    expect(root.getAttribute('data-theme')).toBe('tellr')

    expect(screen.getByTestId('home-screen')).toBeTruthy()
    expect(screen.getByTestId('customer-picker')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Teller Copilot' })).toBeTruthy()
    expect(window.location.pathname).toBe('/')
  })

  it('cycles T on the Customer file route', () => {
    renderApp('/customer')
    expect(screen.getByTestId('customer-screen')).toBeTruthy()
    const root = screen.getByTestId('theme-root')
    expect(root.getAttribute('data-theme')).toBe('tellr')

    fireEvent.keyDown(window, { key: 't' })
    expect(root.getAttribute('data-theme')).toBe('pnc')
    expect(screen.getByTestId('customer-screen')).toBeTruthy()
    expect(window.location.pathname).toBe('/customer')
  })

  it('ignores T while typing in an input or textarea', () => {
    renderApp('/')
    const root = screen.getByTestId('theme-root')

    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 't' })
    expect(root.getAttribute('data-theme')).toBe('tellr')
    input.remove()

    const area = document.createElement('textarea')
    document.body.appendChild(area)
    fireEvent.keyDown(area, { key: 't' })
    expect(root.getAttribute('data-theme')).toBe('tellr')
    area.remove()
  })

  it('lists T as Switch bank theme in shortcut help', () => {
    renderApp('/')
    fireEvent.click(screen.getByTestId('shortcut-help-button'))
    const help = screen.getByTestId('shortcut-help')
    expect(help.textContent).toMatch(/T Switch bank theme/)
  })
})

describe('bank theme chrome', () => {
  it.each([...THEME_IDS])('renders header, Urgency Score, and copilot under %s in both schemes', (themeId) => {
    for (const scheme of ['dark', 'light'] as const) {
      const { unmount } = renderThemedShell(themeId, scheme)
      const theme = THEMES[themeId]
      expect(theme).toBeTruthy()
      const painted = themeForScheme(theme!, scheme)
      const root = screen.getByTestId('theme-root')
      const header = screen.getByTestId('app-header')
      const badge = screen.getByTestId('live-badge')
      const strip = screen.getByTestId('copilot-strip')

      expect(root.getAttribute('data-theme')).toBe(themeId)
      expect(root.getAttribute('data-scheme')).toBe(scheme)
      expect(root.style.colorScheme).toBe(scheme)
      expect(['light', 'dark']).toContain(root.getAttribute('data-scheme'))
      expect(root.style.getPropertyValue('--tc-text')).toBe(painted.text)
      expect(root.style.getPropertyValue('--tc-surface')).toBe(painted.surface)
      expect(root.style.getPropertyValue('--tc-bg-color')).toBe(painted.background.color)
      expect(screen.getByTestId('theme-wordmark').textContent).toContain(theme!.wordmark)
      expect(header).toBeTruthy()
      expect(badge.textContent).toBe(`Simulation: ${CUSTOMERS[0]?.title}`)
      expect(screen.getByTestId('txn-type').textContent).toBe(CUSTOMERS[0]?.transaction.type)
      expect(screen.getByTestId('txn-type').textContent).toBe('Cash withdrawal above the branch threshold')
      expect(screen.getByTestId('txn-type').closest('dl')?.className).toContain('tc-kv')
      expect(screen.getByTestId('read-aloud')?.textContent ?? '').not.toContain('Cash withdrawal above the branch threshold')
      expect(screen.getAllByText(URGENCY_SCORE_TERM).length).toBeGreaterThan(0)
      expect(screen.getByTestId('copilot-score').textContent).toBe(formatUrgencyScore(phoneVisit.risk.score))
      expect(strip).toBeTruthy()
      assertUnclipped(header)
      assertUnclipped(badge)
      assertUnclipped(strip)
      expect(screen.queryByTestId('api-error')).toBeNull()
      expect(screen.queryByRole('alert')).toBeNull()
      unmount()
    }
  })
})
