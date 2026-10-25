import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { mockRequest, resetMock } from '../mock/replay'
import { App, AppShell } from './App'
import { CUSTOMERS } from './demo/customers'
import { APP_ROUTES } from './routes'
import type { Library, SessionState } from './types'

const library = libraryJson as Library
const session = t2.steps[0]?.response as SessionState
const LIVE = 'LIVE — no scenario loaded'

function shell(mode: SessionState['mode'], path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <AppShell library={library} session={{ ...session, mode }} issues={[]} />
    </MemoryRouter>
  )
}

function http(status: number, body: unknown) {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  })
}

describe('session modes', () => {
  afterEach(() => {
    cleanup()
    resetMock()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('shows the live badge on every screen and hides it in practice', () => {
    for (const route of APP_ROUTES) {
      const path = route.path.replace(':id', session.session_id)
      const { unmount } = render(shell('live', path))
      expect(screen.getByTestId(route.testId), path).toBeTruthy()
      expect(screen.getByTestId('live-badge').textContent, path).toBe(LIVE)
      const link = screen.queryByRole('link', { name: route.label })
      if (link) {
        expect(link.textContent).toBe(route.label)
      }
      unmount()
    }
    for (const route of APP_ROUTES) {
      const path = route.path.replace(':id', session.session_id)
      render(shell('practice', path))
      expect(screen.queryByTestId('live-badge'), path).toBeNull()
      cleanup()
    }
  })

  it('starts a simulated customer as a live session without a scenario id', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const calls: { url: string; method: string; body?: string }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method ?? 'GET'
        const body = typeof init?.body === 'string' ? init.body : undefined
        calls.push({ url, method, body })
        const path = url.replace('http://api.test', '')
        const result = mockRequest(method, path, body ? (JSON.parse(body) as unknown) : undefined)
        return http(result.status, result.body)
      }),
    )
    render(<App />)
    expect(screen.queryByTestId('scenario-picker')).toBeNull()
    expect(screen.getByTestId('customer-picker')).toBeTruthy()
    fireEvent.click(screen.getByTestId('demo-step'))
    await waitFor(() => {
      expect(screen.getByTestId('live-badge').textContent).toBe('Simulation: Contractor cash, coached')
    })
    const live = calls.find((call) => call.method === 'POST' && call.url.endsWith('/sessions'))
    expect(live?.url).toBe('http://api.test/sessions')
    const posted = JSON.parse(live?.body ?? '{}') as Record<string, unknown>
    expect(posted.mode).toBe('live')
    expect(posted.amount_band).toBe((t1.steps[0]?.request as { amount_band: string }).amount_band)
    expect(typeof posted.opened_at).toBe('string')
    expect(posted.opened_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
    expect(typeof posted.timezone).toBe('string')
    expect(String(posted.timezone).length).toBeGreaterThan(0)
    expect(live?.body ?? '').not.toContain('scenario_id')
    expect(live?.body ?? '').not.toContain('name')
    expect(live?.body ?? '').not.toContain('age')
    const benign = CUSTOMERS.find((customer) => customer.id === 'benign-routine')
    expect(benign?.events.every((event) => event.chips.length === 0)).toBe(true)
  })
})
