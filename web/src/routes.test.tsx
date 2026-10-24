import libraryJson from '../../contract/library.json'
import t2 from '../../contract/fixtures/T2.json'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './App'
import { APP_ROUTES } from './routes'
import { HealthScreen } from './screens/HealthScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import type { Library, SessionState } from './types'

const library = libraryJson as Library
const session = t2.steps[0]?.response as SessionState

describe('routes', () => {
  it('mounts the eight screens', () => {
    expect(APP_ROUTES).toHaveLength(8)
    for (const route of APP_ROUTES) {
      const path = route.path.replace(':id', 'fixture-T2')
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppShell
            library={library}
            session={session}
            issues={[]}
            scenarios={[{ id: 'T2', label: 'T2' }]}
            onStartPractice={() => undefined}
            onStartLive={() => undefined}
          />
        </MemoryRouter>,
      )
      expect(screen.getByTestId(route.testId), path).toBeTruthy()
      cleanup()
    }
  })

  it('keeps settings UI-only and does not write health', () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    render(<SettingsScreen />)
    render(<HealthScreen />)
    const calls = spy.mock.calls.map((call) => ({
      url: String(call[0]),
      method: ((call[1] as RequestInit | undefined)?.method ?? 'GET').toUpperCase(),
    }))
    expect(calls.some((call) => call.url.includes('/settings'))).toBe(false)
    expect(calls.some((call) => call.url.includes('/health') && call.method !== 'GET')).toBe(false)
    spy.mockRestore()
  })
})
