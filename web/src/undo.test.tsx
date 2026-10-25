import libraryJson from '../../contract/library.json'
import t2 from '../../contract/fixtures/T2.json'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { InterviewScreen } from './screens/InterviewScreen'
import { TellerProvider, useTeller } from './teller'
import type { Library, SessionState } from './types'
import { formatUrgencyScore } from './ui/urgencyScore'

const library = libraryJson as Library

function http(status: number, body: unknown) {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

function demo(): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: CUSTOMERS[0]?.id ?? '',
    index: 1,
    playing: false,
    speed: 1,
    pending: false,
    showCase: false,
    confirmed: [],
    presenter: false,
    elapsedMs: 0,
    onSelectCustomer: () => undefined,
    onPlay: () => undefined,
    onPause: () => undefined,
    onStep: () => undefined,
    onRestart: () => undefined,
    onSpeed: () => undefined,
    onToggleCase: () => undefined,
    onConfirmSignal: () => undefined,
    onDismissSignal: () => undefined,
    onRestoreSignal: () => undefined,
    onEscalate: () => undefined,
  }
}

function Harness() {
  const teller = useTeller()
  return (
    <>
      <MemoryRouter initialEntries={['/']}>
        <p data-testid="lib">{teller.library ? 'yes' : 'no'}</p>
        <button type="button" onClick={() => void teller.startCase('T2')}>
          start
        </button>
        <AppShell
          library={teller.library}
          session={teller.session}
          issues={[]}
          demo={demo()}
          onUndo={() => {
            void teller.undo()
          }}
        />
      </MemoryRouter>
      {teller.session ? <InterviewScreen library={teller.library} session={teller.session} /> : null}
    </>
  )
}

describe('undo', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('posts /undo and renders the returned state instead of a client rollback', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const opened = structuredClone(t2.steps.at(-1)?.response) as SessionState
    const returned = structuredClone(t2.steps[0]?.response) as SessionState
    returned.risk.score = 4
    if (!returned.question) {
      throw new Error('opener question missing')
    }
    returned.question.text = 'SENTINEL_QUESTION'
    const calls: { url: string; method: string; body?: string }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method ?? 'GET'
        const body = typeof init?.body === 'string' ? init.body : undefined
        calls.push({ url, method, body })
        if (method === 'GET' && url.endsWith('/library')) {
          return http(200, library)
        }
        if (method === 'POST' && url.includes('/sessions?')) {
          return http(200, opened)
        }
        if (method === 'POST' && url.endsWith('/undo')) {
          return http(200, returned)
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
      expect(screen.getByTestId('lib').textContent).toBe('yes')
    })
    fireEvent.click(screen.getByRole('button', { name: 'start' }))
    await waitFor(() => {
      expect(screen.getByTestId('question-text').textContent).toBe(opened.question?.text)
    })
    expect(screen.getByTestId('risk-score').textContent).toBe(formatUrgencyScore(opened.risk.score))
    expect(screen.getAllByTestId('talk-pattern-line').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByTestId('undo'))
    await waitFor(() => {
      expect(screen.getByTestId('question-text').textContent).toBe('SENTINEL_QUESTION')
    })
    const undo = calls.find((call) => call.url.endsWith('/undo'))
    expect(undo?.method).toBe('POST')
    expect(undo?.body).toBeUndefined()
    expect(undo?.url).toBe(`http://api.test/sessions/${opened.session_id}/undo`)
    expect(screen.getByTestId('risk-score').textContent).toBe(formatUrgencyScore(4))
    expect(screen.getByTestId('question-text').textContent).not.toBe(opened.question?.text)
    expect(screen.queryByTestId('talk-pattern-line')).toBeNull()
    expect(screen.getByTestId('talk-stage-line').textContent).toBe(returned.talk_track.lines[0])
    expect(screen.queryByText('Anything accusatory')).toBeNull()
  })
})
