import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockRequest, resetMock } from '../mock/replay'
import { App } from './App'
import { CUSTOMERS } from './demo/customers'
import { THEME_IDS } from './theme/registry'
import { StepCard } from './workstation/TransactionPanel'

function http(status: number, body: unknown) {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  })
}

function installFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? init.body : undefined
      const path = url.replace(/^https?:\/\/[^/]+/, '')
      const result = mockRequest(method, path, body ? (JSON.parse(body) as unknown) : undefined)
      return http(result.status, result.body)
    }),
  )
}

describe('Home redesign', () => {
  afterEach(() => {
    resetMock()
    vi.unstubAllGlobals()
  })

  it('renders Home from the sample-data path and keeps case file off the copilot', async () => {
    installFetch()
    render(<App />)
    expect(screen.getByTestId('home-screen')).toBeTruthy()
    expect(screen.getByTestId('customer-picker')).toBeTruthy()
    expect(screen.getByTestId('txn-type').textContent).toBe('Cash withdrawal above the branch threshold')
    expect(screen.getByTestId('copilot-strip')).toBeTruthy()
    expect(screen.getByTestId('copilot-strip').contains(screen.getByTestId('txn-type'))).toBe(false)
    expect(screen.getByTestId('transaction-panel').contains(screen.getByTestId('copilot-strip'))).toBe(false)
    const column = document.querySelector('.tc-home-column')
    expect(column?.contains(screen.getByTestId('customer-picker'))).toBe(true)
    expect(column?.contains(screen.getByTestId('case-file'))).toBe(true)
    expect(column?.contains(screen.queryByTestId('copilot-action'))).toBe(false)

    fireEvent.click(screen.getByTestId('demo-step'))
    await waitFor(() => {
      expect(screen.getByTestId('demo-event')).toBeTruthy()
    })
    expect(screen.getByTestId('step-viewport').getAttribute('data-motion')).toBe('forward')
    expect(screen.getByTestId('step-viewport').querySelector('[data-phase="enter"]')?.getAttribute('data-dir')).toBe('forward')
    expect(screen.queryByTestId('demo-timeline')).toBeNull()
    expect(screen.queryByTestId('event-progress')).toBeNull()
    expect(screen.getByTestId('transaction-panel').contains(screen.getByTestId('copilot-action'))).toBe(false)
    expect(screen.getByTestId('copilot-strip').contains(screen.getByTestId('txn-amount'))).toBe(false)
  })

  it('scrolls the current step card from Back and the footer dots', async () => {
    installFetch()
    render(<App />)
    fireEvent.click(screen.getByTestId('demo-step'))
    await waitFor(() => expect(screen.getByTestId('event-marker').textContent).toMatch(/Step 1 · 0:04/))
    fireEvent.click(screen.getByTestId('demo-step'))
    await waitFor(() => expect(screen.getByTestId('event-marker').textContent).toMatch(/Step 2 · 0:18/))
    expect(screen.getAllByTestId('demo-event')).toHaveLength(1)
    const dotsAtTwo = screen.getAllByTestId('step-dot')
    expect(dotsAtTwo[0]?.getAttribute('data-step')).toBe('2')
    expect(dotsAtTwo[0]?.getAttribute('data-state')).toBe('current')
    expect(dotsAtTwo[1]?.getAttribute('data-step')).toBe('1')
    expect(dotsAtTwo[1]?.getAttribute('data-state')).toBe('past')
    expect(dotsAtTwo[2]?.getAttribute('data-state')).toBe('future')
    expect(dotsAtTwo[2]?.getAttribute('aria-current')).toBeNull()

    const back = screen.getAllByTestId('step-dot').find((dot) => dot.getAttribute('data-step') === '1')
    expect(back).toBeTruthy()
    fireEvent.click(back!)
    await waitFor(() => expect(screen.getByTestId('event-marker').textContent).toMatch(/Step 1 · 0:04/))
    expect(screen.getByTestId('step-viewport').getAttribute('data-motion')).toBe('back')
    expect(screen.getByTestId('step-viewport').querySelector('[data-phase="exit"]')?.getAttribute('data-dir')).toBe('back')
    expect(screen.getByTestId('step-viewport').querySelector('[data-phase="enter"]')?.getAttribute('data-dir')).toBe('back')

    const third = screen.getAllByTestId('step-dot').find((dot) => dot.getAttribute('data-step') === '3')
    expect(third).toBeTruthy()
    fireEvent.click(third!)
    await waitFor(() => expect(screen.getByTestId('event-marker').textContent).toMatch(/Step 3 · 0:32/))
    expect(screen.getByTestId('step-viewport').getAttribute('data-motion')).toBe('forward')
    const shown = screen.getAllByTestId('step-dot')
    expect(shown[0]?.getAttribute('data-step')).toBe('3')
    expect(shown[0]?.getAttribute('aria-current')).toBe('step')
    expect(shown.find((dot) => dot.getAttribute('data-step') === '4')?.getAttribute('aria-current')).toBeNull()
    expect(screen.queryByTestId('demo-timeline')).toBeNull()
  })

  it('records a decision from Home through Outcome and opens Handoff', async () => {
    installFetch()
    render(<App />)
    fireEvent.click(screen.getByTestId('demo-step'))
    const outcome = await screen.findByRole('link', { name: 'Outcome' })
    fireEvent.click(outcome)
    expect(await screen.findByTestId('outcome-screen')).toBeTruthy()
    fireEvent.change(screen.getByTestId('actor'), { target: { value: 'teller' } })
    fireEvent.click(screen.getByTestId('outcome-escalate'))
    fireEvent.click(screen.getByTestId('outcome-submit'))
    const handoff = await screen.findByTestId('handoff-screen')
    expect(handoff.textContent).toMatch(/Handoff/)
    expect(screen.queryByTestId('api-error')).toBeNull()
  })

  it.each([...THEME_IDS])('renders Home under %s without an error', (themeId) => {
    installFetch()
    window.history.replaceState({}, '', `/?theme=${themeId}`)
    render(<App />)
    expect(screen.getByTestId('theme-root').getAttribute('data-theme')).toBe(themeId)
    expect(screen.getByTestId('home-screen')).toBeTruthy()
    expect(screen.getByTestId('transaction-panel')).toBeTruthy()
    expect(screen.getByTestId('copilot-strip')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByTestId('api-error')).toBeNull()
  })

  it('disables the step scroll when reduced motion is requested', () => {
    const css = readFileSync('src/index.css', 'utf8')
    expect(css).toMatch(/@keyframes tc-step-in-top[\s\S]*translateY\(-100%\)/)
    expect(css).toMatch(/@keyframes tc-step-out-bottom[\s\S]*translateY\(100%\)/)
    expect(css).toMatch(/@keyframes tc-step-in-bottom[\s\S]*translateY\(100%\)/)
    expect(css).toMatch(/@keyframes tc-step-out-top[\s\S]*translateY\(-100%\)/)
    expect(css).toMatch(/animation:\s*tc-step-in-top 0\.55s ease/)
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toMatch(/\.tc-step-swap[\s\S]*animation:\s*none/)
    expect(reduced).toMatch(/\.tc-timeline\[data-motion\][\s\S]*animation:\s*none/)
    expect(css).toMatch(/\.tc-stage\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/)
    expect(css).toMatch(/\.tc-stage\s*\{[^}]*overflow:\s*hidden/)
    expect(css).toMatch(/\.tc-stage\s*\{[^}]*container-type:\s*inline-size/)
    expect(css).toMatch(/\.tc-stage \.tc-home-column\s*\{[^}]*overflow:\s*hidden/)
    expect(css).toMatch(/\.tc-stage \.tc-home-column\s*\{[^}]*overscroll-behavior:\s*contain/)
    expect(css).toMatch(/\.tc-stage \.tc-home-column\s*\{[^}]*min-height:\s*0/)
    expect(css).toMatch(/\.tc-strip-body\s*\{[^}]*overflow-y:\s*auto/)
    expect(css).toMatch(/\.tc-strip-body\s*\{[^}]*min-height:\s*0/)
    expect(css).toMatch(/\.tc-stage \.tc-shell > main > \.tc-screen:not\(\.tc-home\)\s*\{[^}]*overflow:\s*auto/)
    expect(css).toMatch(/\.tc-signal-row\[data-state='confirmed'\]\s*\{[^}]*outline:\s*1px solid/)
    expect(css).not.toMatch(/min-height:\s*min-content/)
    expect(css).toMatch(/\.tc-step-card\s*\{[^}]*opacity:\s*0/)
    expect(css).toMatch(/\.tc-step-card\s*\{[^}]*pointer-events:\s*none/)
    expect(css).toMatch(/\.tc-home-column:hover ~ \.tc-step-card:not\(\[hidden\]\)/)
    expect(css).toMatch(/\.tc-home-column:focus-within ~ \.tc-step-card:not\(\[hidden\]\)/)
    expect(css).toMatch(/\.tc-step-card\[data-revealed='pulse'\]/)
    expect(reduced).toMatch(/\.tc-step-card\s*\{[^}]*transition:\s*none !important/)
    expect(css).toMatch(/\.tc-stage \.tc-home-column > \.tc-transaction\s*\{[^}]*overflow:\s*auto/)
    expect(css).toMatch(/\.tc-stage \.tc-dots \.tc-step-dot\s*\{[^}]*opacity:\s*0/)
    expect(css).toMatch(/\.tc-stage:has\(\.tc-step-zone:hover\) \.tc-dots \.tc-step-dot/)
    expect(css).toMatch(/\.tc-stage \.tc-case-half \.tc-kv\s*\{[^}]*40%/)
    expect(css).toMatch(/\.tc-copilot-actions \.tc-undo\s*\{[^}]*border-radius:\s*999px/)
    expect(css).toMatch(/rgba\(198,\s*208,\s*236,\s*0\.82\)/)
  })

  it('keeps step text available and reveals a new step briefly while playback is running', () => {
    const customer = CUSTOMERS.find((item) => item.id === 'contractor-cash')
    if (!customer) {
      throw new Error('missing contractor-cash')
    }
    vi.useFakeTimers()
    try {
      const view = render(<StepCard customer={customer} fired={1} playing />)
      const card = screen.getByTestId('demo-event')
      expect(card.getAttribute('hidden')).toBeNull()
      expect(card.getAttribute('aria-live')).toBe('polite')
      expect(card.getAttribute('data-revealed')).toBe('idle')
      expect(screen.getByTestId('event-caption').textContent).toMatch(/Step 1 · 0:04/)
      expect(card.textContent?.length).toBeGreaterThan(0)

      view.rerender(<StepCard customer={customer} fired={2} playing />)
      expect(screen.getByTestId('demo-event').getAttribute('data-revealed')).toBe('pulse')
      expect(screen.getByTestId('event-caption').textContent).toMatch(/Step 2 · 0:18/)
      act(() => {
        vi.advanceTimersByTime(2500)
      })
      expect(screen.getByTestId('demo-event').getAttribute('data-revealed')).toBe('idle')
      expect(screen.getByTestId('event-caption').textContent).toMatch(/Step 2 · 0:18/)
    } finally {
      vi.useRealTimers()
    }
  })

  it('changes speed from the playback arrows and hides the 1× label', async () => {
    installFetch()
    render(<App />)
    const down = screen.getByTestId('demo-speed-down') as HTMLButtonElement
    expect(down.disabled).toBe(true)
    expect(screen.queryByTestId('playback-speed')).toBeNull()
    expect(screen.queryByTestId('speed-control')).toBeNull()
    expect(screen.getByTestId('demo-step').className).toContain('tc-sr')

    fireEvent.click(screen.getByTestId('demo-speed-up'))
    expect(screen.getByTestId('playback-speed').textContent).toBe('2×')
    expect((screen.getByTestId('demo-speed-down') as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(screen.getByTestId('demo-speed-up'))
    expect(screen.getByTestId('playback-speed').textContent).toBe('4×')
    expect((screen.getByTestId('demo-speed-up') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByTestId('demo-speed-down'))
    expect(screen.getByTestId('playback-speed').textContent).toBe('2×')
    fireEvent.click(screen.getByTestId('demo-speed-down'))
    expect(screen.queryByTestId('playback-speed')).toBeNull()
    expect((screen.getByTestId('demo-speed-down') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('demo-restart')).toBeTruthy()
    expect(screen.getByTestId('elapsed-timer')).toBeTruthy()
  })
})
