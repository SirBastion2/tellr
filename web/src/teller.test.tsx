import library from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TellerProvider, useTeller } from './teller'

function http(status: number, body: unknown): Promise<{ status: number; text: () => Promise<string> }> {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

function Harness() {
  const teller = useTeller()
  return (
    <>
      <button type="button" onClick={() => void teller.startCase('T1')}>
        start
      </button>
      <button type="button" onClick={() => void teller.postContext(['chip.on_phone'])}>
        context
      </button>
      <button
        type="button"
        onClick={() =>
          void teller.postAnswer({
            question_id: 'q.purpose.open',
            chip: 'specific',
            purpose: 'purpose.home_repair',
          })
        }
      >
        opener
      </button>
      <button
        type="button"
        onClick={() =>
          void teller.postAnswer({ question_id: 'q.homerepair.contractor_name', chip: 'specific' })
        }
      >
        follow-up
      </button>
      <button type="button" onClick={() => void teller.undo()}>
        undo
      </button>
      <p data-testid="chips">{teller.postedChipIds.join(',')}</p>
      <p data-testid="ready">{teller.session ? 'yes' : 'no'}</p>
    </>
  )
}

describe('answer posting', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('posts opener purpose and chip to VITE_API_URL and keeps context chips across answer undo', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const calls: { url: string; body?: string }[] = []
    let undoCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const body = typeof init?.body === 'string' ? init.body : undefined
        calls.push({ url, body })
        const method = init?.method ?? 'GET'
        if (method === 'GET' && url.endsWith('/library')) {
          return http(200, library)
        }
        if (method === 'POST' && url.includes('/sessions?')) {
          return http(200, t1.steps[0]?.response)
        }
        if (method === 'POST' && url.endsWith('/context')) {
          return http(200, t1.steps[1]?.response)
        }
        if (method === 'POST' && url.endsWith('/answers')) {
          return http(200, t1.steps[2]?.response)
        }
        if (method === 'POST' && url.endsWith('/undo')) {
          undoCount += 1
          const step = undoCount < 3 ? t1.steps[1]?.response : t1.steps[0]?.response
          return http(200, step)
        }
        return http(404, null)
      }),
    )

    render(
      <TellerProvider>
        <Harness />
      </TellerProvider>,
    )
    await waitFor(() => {
      expect(calls.some((call) => call.url === 'http://api.test/library')).toBe(true)
    })

    fireEvent.click(screen.getByRole('button', { name: 'start' }))
    await waitFor(() => {
      expect(screen.getByTestId('ready').textContent).toBe('yes')
    })
    fireEvent.click(screen.getByRole('button', { name: 'context' }))
    await waitFor(() => {
      expect(screen.getByTestId('chips').textContent).toBe('chip.on_phone')
    })
    fireEvent.click(screen.getByRole('button', { name: 'opener' }))
    await waitFor(() => {
      expect(calls.some((call) => call.url.endsWith('/answers'))).toBe(true)
    })

    const sessionId = t1.steps[0]?.response.session_id
    const opener = calls.find((call) => call.url.endsWith('/answers'))
    expect(opener?.url).toBe(`http://api.test/sessions/${sessionId}/answers`)
    expect(JSON.parse(opener?.body ?? '{}')).toEqual({
      question_id: 'q.purpose.open',
      chip: 'specific',
      purpose: 'purpose.home_repair',
    })

    fireEvent.click(screen.getByRole('button', { name: 'follow-up' }))
    await waitFor(() => {
      expect(calls.filter((call) => call.url.endsWith('/answers'))).toHaveLength(2)
    })
    const followUp = calls.filter((call) => call.url.endsWith('/answers')).at(-1)
    expect(JSON.parse(followUp?.body ?? '{}')).toEqual({
      question_id: 'q.homerepair.contractor_name',
      chip: 'specific',
    })
    expect(screen.getByTestId('chips').textContent).toBe('chip.on_phone')

    fireEvent.click(screen.getByRole('button', { name: 'undo' }))
    fireEvent.click(screen.getByRole('button', { name: 'undo' }))
    await waitFor(() => {
      expect(calls.filter((call) => call.url.endsWith('/undo'))).toHaveLength(2)
    })
    expect(screen.getByTestId('chips').textContent).toBe('chip.on_phone')

    fireEvent.click(screen.getByRole('button', { name: 'undo' }))
    await waitFor(() => {
      expect(calls.filter((call) => call.url.endsWith('/undo'))).toHaveLength(3)
    })
    expect(screen.getByTestId('chips').textContent).toBe('')
  })

  it('sends observed for a simulation post and teller for a manual post', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const calls: { url: string; body?: string }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const body = typeof init?.body === 'string' ? init.body : undefined
        calls.push({ url, body })
        const method = init?.method ?? 'GET'
        if (method === 'GET' && url.endsWith('/library')) {
          return http(200, library)
        }
        if (method === 'GET' && url.endsWith('/activity')) {
          return http(200, { session_id: t1.steps[0]?.response.session_id, rows: [] })
        }
        if (method === 'POST' && url.endsWith('/sessions')) {
          return http(200, t1.steps[0]?.response)
        }
        if (method === 'POST' && url.endsWith('/context')) {
          return http(200, t1.steps[1]?.response)
        }
        return http(404, null)
      }),
    )

    function Sources() {
      const teller = useTeller()
      return (
        <>
          <button type="button" onClick={() => void teller.startLive()}>
            live
          </button>
          <button type="button" onClick={() => void teller.postContext(['chip.on_phone'], 'observed')}>
            observed
          </button>
          <button type="button" onClick={() => void teller.postContext(['chip.cash_only'], 'teller')}>
            manual
          </button>
        </>
      )
    }

    render(
      <TellerProvider>
        <Sources />
      </TellerProvider>,
    )
    await waitFor(() => {
      expect(calls.some((call) => call.url.endsWith('/library'))).toBe(true)
    })
    fireEvent.click(screen.getByRole('button', { name: 'live' }))
    await waitFor(() => {
      expect(calls.some((call) => call.url.endsWith('/sessions'))).toBe(true)
    })
    fireEvent.click(screen.getByRole('button', { name: 'observed' }))
    await waitFor(() => {
      expect(calls.some((call) => call.url.endsWith('/context'))).toBe(true)
    })
    fireEvent.click(screen.getByRole('button', { name: 'manual' }))
    await waitFor(() => {
      expect(calls.filter((call) => call.url.endsWith('/context'))).toHaveLength(2)
    })
    const bodies = calls
      .filter((call) => call.url.endsWith('/context'))
      .map((call) => JSON.parse(call.body ?? '{}') as unknown)
    expect(bodies).toEqual([
      { chips: ['chip.on_phone'], source: 'observed' },
      { chips: ['chip.cash_only'], source: 'teller' },
    ])
  })
})
