import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { mockRequest, resetMock } from '../mock/replay'
import { App, AppShell } from './App'
import { APP_ROUTES } from './routes'
import { HomeScreen } from './screens/HomeScreen'
import type { Library, SessionState } from './types'

const library = libraryJson as Library
const session = t2.steps[0]?.response as SessionState
const LIVE = 'LIVE — no scenario loaded'

function shell(mode: SessionState['mode'], path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <AppShell
        library={library}
        session={{ ...session, mode }}
        issues={[]}
        scenarios={[{ id: 'T2', label: t2.label }]}
        onStartPractice={() => undefined}
        onStartLive={() => undefined}
      />
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

  it('offers a scenario picker in practice and starts live without one', () => {
    const onStartPractice = vi.fn()
    const onStartLive = vi.fn()
    render(
      <HomeScreen
        library={library}
        scenarios={[
          { id: 'T1', label: t1.label },
          { id: 'T2', label: t2.label },
        ]}
        onStartPractice={onStartPractice}
        onStartLive={onStartLive}
      />,
    )
    expect(screen.getByTestId('scenario-picker')).toBeTruthy()
    expect(screen.getByTestId('scenario-T2').textContent).toBe(t2.label)
    expect(screen.queryByTestId('start-live')).toBeNull()
    fireEvent.click(screen.getByTestId('scenario-T2'))
    expect(onStartPractice).toHaveBeenCalledWith('T2')

    fireEvent.click(screen.getByTestId('mode-live'))
    expect(screen.queryByTestId('scenario-picker')).toBeNull()
    expect(screen.queryByTestId('scenario-T1')).toBeNull()
    expect(screen.queryByTestId('scenario-T2')).toBeNull()
    fireEvent.click(screen.getByTestId('start-live'))
    expect(onStartLive).toHaveBeenCalledOnce()
    expect(onStartPractice).toHaveBeenCalledOnce()
  })

  it('shows the live badge on every screen and hides it in practice', () => {
    for (const route of APP_ROUTES) {
      const path = route.path.replace(':id', session.session_id)
      const { unmount } = render(shell('live', path))
      expect(screen.getByTestId(route.testId), path).toBeTruthy()
      expect(screen.getByTestId('live-badge').textContent, path).toBe(LIVE)
      unmount()
    }
    for (const route of APP_ROUTES) {
      const path = route.path.replace(':id', session.session_id)
      render(shell('practice', path))
      expect(screen.queryByTestId('live-badge'), path).toBeNull()
      cleanup()
    }
  })

  it('posts practice with a scenario id and live without one', async () => {
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
    fireEvent.click(screen.getByTestId('scenario-T2'))
    await waitFor(() => {
      expect(screen.getByTestId('context-screen')).toBeTruthy()
    })
    expect(screen.queryByTestId('live-badge')).toBeNull()
    const practice = calls.find((call) => call.method === 'POST' && call.url.includes('/sessions'))
    expect(practice?.url).toBe('http://api.test/sessions?case=T2')
    expect(JSON.parse(practice?.body ?? '{}')).toEqual({
      ...(t2.steps[0]?.request as object),
      scenario_id: 'T2',
    })

    fireEvent.click(screen.getByRole('link', { name: '/' }))
    fireEvent.click(screen.getByTestId('mode-live'))
    fireEvent.click(screen.getByTestId('start-live'))
    await waitFor(() => {
      expect(screen.getByTestId('live-badge').textContent).toBe(LIVE)
    })
    const live = calls.filter((call) => call.method === 'POST' && call.url.includes('/sessions')).at(-1)
    expect(live?.url).toBe('http://api.test/sessions')
    expect(JSON.parse(live?.body ?? '{}')).toEqual({
      mode: 'live',
      amount_band: (t1.steps[0]?.request as { amount_band: string }).amount_band,
    })
    expect(live?.body ?? '').not.toContain('scenario_id')
    expect(screen.getByTestId('context-screen')).toBeTruthy()
  })
})
