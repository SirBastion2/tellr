import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockRequest, resetMock } from '../mock/replay'
import { App } from './App'
import { CUSTOMERS } from './demo/customers'
import { formatElapsed, timelineElapsedMs } from './demo/clock'
import { FOOTER_FONT_SIZE } from './theme/tokens'

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

async function stepOnce() {
  fireEvent.click(screen.getByTestId('demo-step'))
  await waitFor(() => {
    expect(screen.getByTestId('demo-event')).toBeTruthy()
  })
}

describe('demo polish', () => {
  afterEach(() => {
    resetMock()
    vi.unstubAllGlobals()
  })

  it('keeps the clock and timeline on the same simulated customer time', async () => {
    installFetch()
    render(<App />)
    const contractor = CUSTOMERS.find((item) => item.id === 'contractor-cash')
    if (!contractor) {
      throw new Error('missing contractor-cash')
    }
    await stepOnce()
    expect(screen.getByTestId('elapsed-timer').textContent).toBe('0:04')
    expect(screen.getByTestId('event-marker').textContent).toMatch(/0:04/)
    expect(screen.getByTestId('elapsed-timer').textContent).toBe(
      formatElapsed(timelineElapsedMs(contractor.events, 1)),
    )

    fireEvent.click(screen.getByTestId('demo-speed-4'))
    for (let i = 1; i < contractor.events.length; i += 1) {
      fireEvent.click(screen.getByTestId('demo-step'))
      await waitFor(() => {
        expect(screen.getAllByTestId('demo-event')).toHaveLength(i + 1)
      })
    }
    expect(screen.getByTestId('elapsed-timer').textContent).toBe('1:00')
    const last = screen.getAllByTestId('event-marker').at(-1)
    expect(last?.textContent).toMatch(/1:00/)
  })

  it('lists working shortcuts and names the restart confirm Restart', async () => {
    installFetch()
    render(<App />)
    expect(screen.getByTestId('nav-hint-outcome').textContent).toBe('Outcome')
    expect(screen.getByTestId('nav-hint-handoff').textContent).toBe('Handoff')
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Customer file' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Outcome' })).toBeNull()

    fireEvent.click(screen.getByTestId('shortcut-help-button'))
    const help = screen.getByTestId('shortcut-help')
    expect(help.textContent).toMatch(/\?/)
    expect(help.textContent).toMatch(/P/)
    expect(help.textContent).toMatch(/N/)
    expect(help.textContent).toMatch(/R/)
    expect(help.textContent).toMatch(/Restart/)
    expect(help.textContent).toMatch(/C/)
    expect(help.textContent).toMatch(/D/)
    expect(help.textContent).toMatch(/E/)
    expect(help.textContent).toMatch(/\[ and \]/)
    expect(help.textContent).toMatch(/T Switch bank theme/)
    fireEvent.click(screen.getByTestId('shortcut-close'))

    fireEvent.keyDown(window, { key: 'r' })
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy()
    expect(screen.getByTestId('confirm-accept').textContent).toBe('Restart')
    fireEvent.click(screen.getByTestId('confirm-cancel'))

    fireEvent.click(screen.getByTestId('demo-restart'))
    expect(screen.getByTestId('confirm-accept').textContent).toBe('Restart')
  })

  it('fills the padded page and keeps a 13px footer', () => {
    installFetch()
    render(<App />)
    const card = screen.getByTestId('theme-card')
    expect(card.style.width).toBe('100%')
    expect(card.style.width).not.toMatch(/1440|1180|960|770/)
    expect(card.style.maxWidth).toBe('100%')
    const footer = screen.getByTestId('theme-footer')
    expect(footer.style.fontSize).toBe(FOOTER_FONT_SIZE)
    expect(footer.style.fontSize).toBe('13px')
  })
})
