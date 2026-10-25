import { fireEvent, render, screen, waitFor } from '@testing-library/react'
// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockRequest, resetMock } from '../mock/replay'
import { App } from './App'
import { THEME_IDS } from './theme/registry'

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
    expect(screen.getByTestId('footer-step').getAttribute('data-motion')).toBe('forward')
    expect(screen.getByTestId('footer-step').querySelector('[data-phase="enter"]')?.getAttribute('data-dir')).toBe('forward')
    expect(screen.getByTestId('transaction-panel').contains(screen.getByTestId('copilot-action'))).toBe(false)
    expect(screen.getByTestId('copilot-strip').contains(screen.getByTestId('txn-amount'))).toBe(false)
  })

  it('scrolls steps backward from Back, dots, and keeps the timeline list', async () => {
    installFetch()
    render(<App />)
    fireEvent.click(screen.getByTestId('demo-step'))
    await waitFor(() => expect(screen.getAllByTestId('demo-event')).toHaveLength(1))
    fireEvent.click(screen.getByTestId('demo-step'))
    await waitFor(() => expect(screen.getAllByTestId('demo-event')).toHaveLength(2))

    fireEvent.click(screen.getByTestId('demo-back'))
    await waitFor(() => expect(screen.getAllByTestId('demo-event')).toHaveLength(1))
    expect(screen.getByTestId('step-viewport').getAttribute('data-motion')).toBe('back')
    expect(screen.getByTestId('step-viewport').querySelector('[data-phase="exit"]')?.getAttribute('data-dir')).toBe('back')
    expect(screen.getByTestId('footer-step').querySelector('[data-phase="enter"]')?.getAttribute('data-dir')).toBe('back')

    const third = screen.getAllByTestId('step-dot').find((dot) => dot.getAttribute('data-step') === '3')
    expect(third).toBeTruthy()
    fireEvent.click(third!)
    await waitFor(() => expect(screen.getAllByTestId('demo-event')).toHaveLength(3))
    expect(screen.getByTestId('demo-timeline').getAttribute('data-motion')).toBe('forward')
    expect(third?.getAttribute('aria-current')).toBe('step')
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
    await waitFor(() => {
      expect(screen.getByTestId('outcome-screen').textContent).toMatch(/Escalate/)
    })
    fireEvent.click(screen.getByRole('link', { name: 'Handoff' }))
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
  })
})
