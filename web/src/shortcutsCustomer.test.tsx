import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockRequest, resetMock } from '../mock/replay'
import { App } from './App'

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

function press(key: string, target: Element) {
  fireEvent.keyDown(target, { key })
}

describe('demo shortcuts on other routes', () => {
  beforeEach(() => {
    resetMock()
  })
  afterEach(() => {
    resetMock()
    vi.unstubAllGlobals()
  })

  it('fires the demo keys on the Customer file route', async () => {
    installFetch()
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Customer file' }))
    const page = screen.getByTestId('customer-screen')
    expect(page).toBeTruthy()

    press('?', page)
    const help = screen.getByTestId('shortcut-help')
    expect(help).toBeTruthy()
    expect(help.textContent).toMatch(/every screen/i)
    press('Escape', page)
    expect(screen.queryByTestId('shortcut-help')).toBeNull()

    press('r', page)
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy()
    expect(screen.getByTestId('confirm-accept').textContent).toBe('Restart')
    fireEvent.click(screen.getByTestId('confirm-cancel'))
    expect(screen.queryByTestId('confirm-dialog')).toBeNull()

    const picker = screen.getByTestId('customer-file-picker')
    press('r', picker)
    press('p', picker)
    expect(screen.queryByTestId('confirm-dialog')).toBeNull()
    fireEvent.keyDown(page, { key: 'r', ctrlKey: true })
    expect(screen.queryByTestId('confirm-dialog')).toBeNull()

    press('p', page)
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    expect(screen.getByTestId('demo-play').getAttribute('aria-pressed')).toBe('true')
    press('p', screen.getByTestId('home-screen'))
    expect(screen.getByTestId('demo-play').getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(screen.getByRole('link', { name: 'Customer file' }))
    const file = screen.getByTestId('customer-screen')
    press('n', file)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Outcome' })).toBeTruthy()
    })
    press('n', screen.getByTestId('customer-screen'))
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    await waitFor(() => {
      expect(screen.getByTestId('signal-row')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('link', { name: 'Customer file' }))
    const onFile = screen.getByTestId('customer-screen')
    press('c', onFile)
    press('d', onFile)
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    await waitFor(() => {
      expect(screen.getByTestId('signal-row').getAttribute('data-state')).toBe('dismissed')
    })
    fireEvent.click(screen.getByRole('link', { name: 'Customer file' }))
    press('e', screen.getByTestId('customer-screen'))
    expect(screen.getByTestId('confirm-accept').textContent).toBe('Escalate')
    fireEvent.click(screen.getByTestId('confirm-cancel'))

    press(']', screen.getByTestId('customer-screen'))
    await waitFor(() => {
      expect(screen.getByTestId('live-badge').textContent).toBe('Simulation: Romance, crypto cash')
    })
  })

  it('still runs help, restart, and customer switch from Outcome and Handoff', async () => {
    installFetch()
    render(<App />)
    fireEvent.click(screen.getByTestId('demo-step'))
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Outcome' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('link', { name: 'Outcome' }))
    const outcome = screen.getByTestId('outcome-screen')
    press('?', outcome)
    expect(screen.getByTestId('shortcut-help')).toBeTruthy()
    press('Escape', outcome)
    press('r', screen.getByTestId('actor'))
    expect(screen.queryByTestId('confirm-dialog')).toBeNull()
    press('r', outcome)
    expect(screen.getByTestId('confirm-accept').textContent).toBe('Restart')
    fireEvent.click(screen.getByTestId('confirm-cancel'))

    fireEvent.click(screen.getByRole('link', { name: 'Handoff' }))
    const handoff = screen.getByTestId('handoff-screen')
    press('?', handoff)
    expect(screen.getByTestId('shortcut-help')).toBeTruthy()
    press('Escape', handoff)
    press('[', handoff)
    await waitFor(() => {
      expect(screen.getByTestId('live-badge').textContent).toBe('Simulation: Routine Friday cash')
    })
  })
})
