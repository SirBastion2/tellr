import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockRequest, resetMock } from '../mock/replay'
import { App } from './App'

function http(status: number, body: unknown) {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(body === undefined || body === null ? '' : JSON.stringify(body)),
  })
}

function installFetch(outcomeStatus: number, outcomeBody: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const raw = typeof init?.body === 'string' ? init.body : undefined
      const path = url.replace(/^https?:\/\/[^/]+/, '')
      if (method === 'POST' && path.endsWith('/outcome')) {
        return http(outcomeStatus, outcomeBody)
      }
      const result = mockRequest(method, path, raw ? (JSON.parse(raw) as unknown) : undefined)
      return http(result.status, result.body)
    }),
  )
}

async function recordSlowDown() {
  fireEvent.click(screen.getByTestId('demo-step'))
  await waitFor(() => {
    expect(screen.getByRole('link', { name: 'Outcome' })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('link', { name: 'Outcome' }))
  fireEvent.change(screen.getByTestId('actor'), { target: { value: 'Avery' } })
  fireEvent.click(screen.getByTestId('outcome-slow_down'))
  fireEvent.click(screen.getByTestId('outcome-submit'))
}

describe('closed visits', () => {
  afterEach(() => {
    resetMock()
    vi.unstubAllGlobals()
  })

  it('hides the decision controls after a recorded outcome and starts another customer', async () => {
    installFetch(200, null)
    render(<App />)
    await recordSlowDown()
    await waitFor(() => {
      expect(screen.getByTestId('handoff-screen')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('link', { name: 'Outcome' }))
    await waitFor(() => {
      expect(screen.getByTestId('visit-closed')).toBeTruthy()
    })
    expect(screen.queryByTestId('outcome-proceed')).toBeNull()
    expect(screen.queryByTestId('outcome-submit')).toBeNull()
    expect(screen.getByTestId('visit-closed').textContent).toMatch(/closed/)
    expect(document.body.textContent ?? '').not.toMatch(/session_closed/)
    expect(document.body.textContent ?? '').not.toMatch(/Status\s+409/)
    expect(document.body.textContent ?? '').not.toMatch(/\b409\b/)
    expect(screen.getByText('Slow down')).toBeTruthy()

    fireEvent.click(screen.getByTestId('start-new-customer'))
    await waitFor(() => {
      expect(screen.getByTestId('home-screen')).toBeTruthy()
    })
    expect(screen.queryByTestId('visit-closed')).toBeNull()
    expect(screen.queryByTestId('outcome-submit')).toBeNull()
  })

  it('turns a closed-session response into plain language', async () => {
    installFetch(409, { error: { code: 'session_closed', message: 'session is closed' } })
    render(<App />)
    await recordSlowDown()
    await waitFor(() => {
      expect(screen.getByTestId('visit-closed')).toBeTruthy()
    })
    expect(screen.queryByTestId('handoff-screen')).toBeNull()
    expect(screen.queryByTestId('outcome-proceed')).toBeNull()
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/This visit is closed/)
    expect(text).not.toMatch(/session_closed/)
    expect(text).not.toMatch(/session is closed/)
    expect(text).not.toMatch(/\b409\b/)
  })
})
