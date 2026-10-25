import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockRequest, resetMock } from '../mock/replay'
import { App } from './App'
import { PRESENTER_STORAGE_KEY } from './theme/tokens'

function http(status: number, body: unknown) {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  })
}

describe('presenter mode', () => {
  it('enlarges type, hides dev tabs, and keeps the demo tabs labeled', async () => {
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
    window.localStorage.setItem(PRESENTER_STORAGE_KEY, '0')
    window.history.replaceState({}, '', '/?present=0')
    render(<App />)
    const root = screen.getByTestId('theme-root')
    expect(root.getAttribute('data-presenter')).toBe('true')
    expect(root.style.getPropertyValue('--tc-root-font')).toBe('105%')
    expect(root.style.fontSize).toBe('var(--tc-root-live)')
    expect(screen.queryByTestId('presenter-toggle')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Presenter' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Context' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Session' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'History' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Health' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Customer file' })).toBeNull()
    expect(screen.getByTestId('nav-hint-outcome').textContent).toBe('Outcome')
    expect(screen.getByTestId('nav-hint-handoff').textContent).toBe('Handoff')
    expect(screen.getByTestId('elapsed-timer').textContent).toBe('0:00')
    expect(screen.getByTestId('event-caption').textContent).toBe('Customer File')
    expect(window.localStorage.getItem(PRESENTER_STORAGE_KEY)).toBe('0')
    expect(window.location.search).toContain('present=0')

    fireEvent.keyDown(window, { key: 'r' })
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy()
    expect(screen.getByTestId('confirm-accept').textContent).toBe('Restart')
    fireEvent.click(screen.getByTestId('confirm-cancel'))
    fireEvent.keyDown(window, { key: 'p' })
    expect(screen.getByTestId('demo-play').getAttribute('aria-pressed')).toBe('true')
    fireEvent.keyDown(window, { key: 'p' })

    fireEvent.click(screen.getByTestId('demo-step'))
    await waitFor(() => {
      expect(screen.getByTestId('live-badge').textContent).toMatch(/Simulation:/)
    })
    fireEvent.change(screen.getByTestId('customer-picker'), { target: { value: 'government-impersonation' } })
    expect(screen.queryByTestId('confirm-dialog')).toBeNull()
    expect((screen.getByTestId('customer-picker') as HTMLSelectElement).value).toBe('government-impersonation')
    await waitFor(() => {
      expect(screen.getByTestId('live-badge').textContent).toBe('Simulation: Government impersonation')
    })

    resetMock()
    vi.unstubAllGlobals()
  })
})
