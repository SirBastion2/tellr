import libraryJson from '../../contract/library.json'
import t2 from '../../contract/fixtures/T2.json'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './App'
import { APP_ROUTES } from './routes'
import type { Library, SessionState } from './types'

const library = libraryJson as Library
const session = t2.steps[0]?.response as SessionState

describe('routes', () => {
  it('mounts the screens', () => {
    expect(APP_ROUTES).toHaveLength(7)
    for (const route of APP_ROUTES) {
      const path = route.path.replace(':id', 'fixture-T2')
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppShell
            library={library}
            session={session}
            issues={[]}
          />
        </MemoryRouter>,
      )
      expect(screen.getByTestId(route.testId), path).toBeTruthy()
      cleanup()
    }
  })

  it('keeps health read-only and sends /settings there', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppShell
          library={library}
          session={session}
          issues={[]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('health-screen')).toBeTruthy()
    expect(screen.queryByTestId('settings-screen')).toBeNull()
    await screen.findByTestId('health-unavailable')
    expect(screen.queryByText(/does not change it/i)).toBeNull()
    const calls = spy.mock.calls.map((call) => ({
      url: String(call[0]),
      method: ((call[1] as RequestInit | undefined)?.method ?? 'GET').toUpperCase(),
    }))
    expect(calls.some((call) => call.url.includes('/settings'))).toBe(false)
    expect(calls.some((call) => call.url.includes('/health') && call.method !== 'GET')).toBe(false)
    expect(calls.some((call) => call.url.includes('/health') && call.method === 'GET')).toBe(true)
    spy.mockRestore()
  })
})
