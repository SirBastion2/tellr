import libraryJson from '../../contract/library.json'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './App'
import type { Library } from './types'

const library = libraryJson as Library

const EMPTY_PATHS = ['/outcome', '/handoff', '/history', '/session', '/context'] as const
const SESSION_PATHS = [
  '/sessions/missing/outcome',
  '/sessions/missing/handoff',
  '/sessions/missing',
  '/sessions/missing/context',
] as const

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell library={library} session={null} issues={[]} />
    </MemoryRouter>,
  )
}

describe('empty routes', () => {
  it('shows a start-a-customer message with a Home link on short paths without a session', () => {
    for (const path of EMPTY_PATHS) {
      const { unmount } = renderAt(path)
      const main = document.getElementById('main')
      expect(main, path).toBeTruthy()
      expect(main?.textContent?.trim(), path).not.toBe('')
      expect(screen.getByTestId('not-found-screen'), path).toBeTruthy()
      expect(screen.getByTestId('not-found-home').getAttribute('href'), path).toBe('/')
      expect(screen.getByTestId('not-found-home').textContent, path).toMatch(/Home/)
      expect(screen.queryByTestId('outcome-screen'), path).toBeNull()
      expect(screen.queryByTestId('handoff-screen'), path).toBeNull()
      unmount()
    }
  })

  it('asks to start a customer when a session route has no visit', () => {
    for (const path of SESSION_PATHS) {
      const { unmount } = renderAt(path)
      expect(screen.getByTestId('not-found-screen'), path).toBeTruthy()
      expect(screen.getByTestId('not-found-screen').textContent, path).toMatch(/Start a customer first/i)
      expect(screen.getByTestId('not-found-home').getAttribute('href'), path).toBe('/')
      unmount()
    }
  })

  it('still shows Health without a session', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    renderAt('/health')
    expect(screen.getByTestId('health-screen')).toBeTruthy()
    expect(screen.queryByTestId('not-found-screen')).toBeNull()
    await screen.findByTestId('health-config-note')
    spy.mockRestore()
  })
})
