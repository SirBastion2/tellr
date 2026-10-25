import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HistoryScreen } from './screens/HistoryScreen'

const liveRow = {
  session_id: 'live-1',
  mode: 'live',
  opened_at: '2026-10-24T12:00:00',
  closed_at: '2026-10-24T12:05:00',
  library_version: '1.2.0',
}

const practiceRow = {
  session_id: 'practice-1',
  mode: 'practice',
  opened_at: '2026-10-24T13:00:00',
  closed_at: null,
  library_version: '1.2.0',
}

function http(status: number, body: unknown): Promise<{ status: number; text: () => Promise<string> }> {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

describe('History screen', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('excludes practice sessions by default and shows them on request', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const calls: { url: string; method: string }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = (init?.method ?? 'GET').toUpperCase()
        calls.push({ url, method })
        const parsed = new URL(url)
        if (method === 'GET' && parsed.pathname === '/sessions') {
          const mode = parsed.searchParams.get('mode')
          if (mode === 'practice') {
            return http(200, { sessions: [practiceRow] })
          }
          return http(200, { sessions: [liveRow, practiceRow] })
        }
        return http(404, null)
      }),
    )

    render(<HistoryScreen />)

    await waitFor(() => {
      expect(screen.getByTestId('history-session-id').textContent).toBe('live-1')
    })
    expect(screen.getByTestId('history-opened').textContent).not.toBe(liveRow.opened_at)
    expect(screen.getByTestId('history-opened').textContent).not.toMatch(/UTC/)
    expect(screen.queryByText('practice-1')).toBeNull()
    expect(calls.map((call) => call.url)).toEqual(['http://api.test/sessions'])
    expect(calls.every((call) => call.method === 'GET')).toBe(true)

    fireEvent.click(screen.getByTestId('history-practice'))
    await waitFor(() => {
      expect(screen.getByTestId('history-session-id').textContent).toBe('practice-1')
    })
    expect(screen.queryByText('live-1')).toBeNull()
    expect(calls.map((call) => call.url)).toEqual([
      'http://api.test/sessions',
      'http://api.test/sessions?mode=practice',
    ])

    fireEvent.click(screen.getByTestId('history-live'))
    await waitFor(() => {
      expect(screen.getByTestId('history-session-id').textContent).toBe('live-1')
    })
    expect(screen.queryByText('practice-1')).toBeNull()
    expect(calls.at(-1)?.url).toBe('http://api.test/sessions')
    expect(calls.every((call) => call.method === 'GET')).toBe(true)
  })
})
