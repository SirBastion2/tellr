import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function elapsedSeconds(text: string | null): number {
  const match = /^(\d+):(\d{2})$/.exec(text ?? '')
  if (!match) {
    throw new Error(`bad elapsed display: ${text}`)
  }
  return Number(match[1]) * 60 + Number(match[2])
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

  it('fires each scripted event when elapsed time reaches it', async () => {
    vi.useFakeTimers()
    installFetch()
    const contractor = CUSTOMERS.find((item) => item.id === 'contractor-cash')
    if (!contractor) {
      throw new Error('missing contractor-cash')
    }
    const at = (count: number) => timelineElapsedMs(contractor.events, count)
    try {
      render(<App />)
      await act(async () => {
        await Promise.resolve()
      })
      fireEvent.click(screen.getByTestId('demo-play'))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(at(1) - 1)
      })
      expect(screen.queryAllByTestId('demo-event')).toHaveLength(0)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(screen.getAllByTestId('demo-event')).toHaveLength(1)
      expect(screen.getByTestId('event-marker').textContent).toMatch(/0:04/)
      const afterFirst = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      expect(afterFirst).toBeGreaterThanOrEqual(4)

      fireEvent.click(screen.getByTestId('demo-speed-2'))
      expect(screen.getByTestId('home-screen')).toBeTruthy()
      const onHome = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      expect(onHome).toBeGreaterThanOrEqual(afterFirst)

      const wallToSecond = (at(2) - at(1)) / 2
      await act(async () => {
        await vi.advanceTimersByTimeAsync(wallToSecond - 1)
      })
      expect(screen.getAllByTestId('demo-event')).toHaveLength(1)
      const beforeSecond = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      expect(beforeSecond).toBeGreaterThanOrEqual(onHome)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(screen.getAllByTestId('demo-event')).toHaveLength(2)
      expect(screen.getAllByTestId('event-marker').at(-1)?.textContent).toMatch(/0:18/)
      const afterSecond = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      expect(afterSecond).toBeGreaterThanOrEqual(beforeSecond)
      expect(afterSecond).toBeGreaterThanOrEqual(18)

      const wallToThird = (at(3) - at(2)) / 2
      await act(async () => {
        await vi.advanceTimersByTimeAsync(wallToThird - 1)
      })
      expect(screen.getAllByTestId('demo-event')).toHaveLength(2)
      const beforeThird = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      expect(beforeThird).toBeGreaterThanOrEqual(afterSecond)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(screen.getAllByTestId('demo-event')).toHaveLength(3)
      expect(screen.getAllByTestId('event-marker').at(-1)?.textContent).toMatch(/0:32/)
      const afterThird = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      expect(afterThird).toBeGreaterThanOrEqual(beforeThird)
      expect(afterThird).toBeGreaterThanOrEqual(32)
      expect(afterFirst).toBeLessThanOrEqual(afterSecond)
      expect(afterSecond).toBeLessThanOrEqual(afterThird)

      expect(screen.getByTestId('demo-play').getAttribute('aria-pressed')).toBe('true')
      fireEvent.click(screen.getByTestId('demo-play'))
      const pausedAt = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000)
      })
      expect(elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)).toBe(pausedAt)
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })

  it('keeps the displayed elapsed time increasing while a step advances', async () => {
    vi.useFakeTimers()
    const release: Array<() => void> = []
    let holdSessionOpen = false
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method ?? 'GET'
        const body = typeof init?.body === 'string' ? init.body : undefined
        const path = url.replace(/^https?:\/\/[^/]+/, '')
        const result = mockRequest(method, path, body ? (JSON.parse(body) as unknown) : undefined)
        if (holdSessionOpen && method === 'POST' && path === '/sessions') {
          const payload = {
            status: result.status,
            text: () => Promise.resolve(result.body === undefined ? '' : JSON.stringify(result.body)),
          }
          return new Promise<typeof payload>((resolve) => {
            release.push(() => resolve(payload))
          })
        }
        return http(result.status, result.body)
      }),
    )
    try {
      render(<App />)
      await act(async () => {
        await Promise.resolve()
      })
      holdSessionOpen = true
      fireEvent.click(screen.getByTestId('demo-play'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000)
      })
      expect(release.length).toBeGreaterThan(0)
      const atStep = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)

      fireEvent.click(screen.getByTestId('demo-speed-2'))
      await act(async () => {
        window.history.pushState({}, '', '/customer')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      expect(screen.getByTestId('not-found-screen')).toBeTruthy()
      expect(screen.queryByTestId('customer-screen')).toBeNull()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000)
      })
      await act(async () => {
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      const during = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      expect(during).toBeGreaterThan(atStep)

      await act(async () => {
        for (const done of release) {
          done()
        }
        await Promise.resolve()
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(250)
      })
      const afterStep = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      expect(afterStep).toBeGreaterThanOrEqual(during)

      fireEvent.click(screen.getByTestId('demo-play'))
      const pausedAt = elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000)
      })
      expect(elapsedSeconds(screen.getByTestId('elapsed-timer').textContent)).toBe(pausedAt)
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })

  it('lists working shortcuts and names the restart confirm Restart', async () => {
    installFetch()
    render(<App />)
    expect(screen.getByTestId('nav-hint-outcome').textContent).toBe('Outcome')
    expect(screen.getByTestId('nav-hint-handoff').textContent).toBe('Handoff')
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Customer file' })).toBeNull()
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

  it('fills the padded page and keeps the shared footer type token', () => {
    installFetch()
    render(<App />)
    const card = screen.getByTestId('theme-card')
    expect(card.style.width).toBe('100%')
    expect(card.style.width).not.toMatch(/1440|1180|960|770/)
    expect(card.style.maxWidth).toBe('100%')
    const footer = screen.getByTestId('theme-footer')
    expect(footer.className).toContain('tc-footer')
    expect(FOOTER_FONT_SIZE).toBe('0.75rem')
  })
})
