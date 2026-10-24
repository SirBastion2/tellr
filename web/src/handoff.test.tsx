import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HandoffScreen } from './screens/HandoffScreen'
import { TellerProvider, useTeller } from './teller'
import type { HandoffProjection, Library, SessionState } from './types'
import { validateHandoff } from './validate'

const library = libraryJson as Library

function asSession(response: unknown): SessionState {
  return response as SessionState
}

function projectionFromFixture(session: SessionState): HandoffProjection {
  return {
    session_id: session.session_id,
    mode: session.mode,
    stated_purpose: session.stated_purpose,
    risk: session.risk,
    suggested_outcome: session.suggested_outcome,
    answers: session.answers,
    stop: session.stop,
    outcome: null,
    actor: null,
  }
}

describe('Handoff screen', () => {
  it('renders the projection taken from the fixture', () => {
    const session = asSession(t2.steps.find((step) => asSession(step.response).answers === 2)?.response)
    const projection = projectionFromFixture(session)
    render(<HandoffScreen library={library} projection={projection} />)

    expect(screen.getByTestId('handoff-screen')).toBeTruthy()
    expect(screen.getByTestId('handoff-session').textContent).toBe(projection.session_id)
    expect(screen.getByTestId('handoff-mode').textContent).toBe(projection.mode)
    expect(screen.getByTestId('handoff-answers').textContent).toBe(String(projection.answers))
    expect(screen.getByTestId('handoff-level').textContent).toBe('Caution')
    expect(screen.getByTestId('handoff-level').getAttribute('data-level')).toBe(projection.risk.level)
    expect(screen.getByTestId('handoff-score').textContent).toBe(String(projection.risk.score))
    expect(screen.getByTestId('handoff-pattern').textContent).toBe(projection.risk.pattern_label)
    expect(screen.getAllByTestId('handoff-reason').map((item) => item.textContent)).toEqual(
      projection.risk.reasons.map((reason) => reason.label),
    )
    expect(screen.getByTestId('handoff-suggested').textContent).toBe('Slow down')
    expect(screen.getByTestId('handoff-suggested').getAttribute('data-outcome')).toBe(projection.suggested_outcome)
    const purpose = library.purposes.find((item) => item.id === projection.stated_purpose)
    expect(screen.getByTestId('handoff-purpose').textContent).toBe(purpose?.label)
    expect(screen.queryByTestId('handoff-stop')).toBeNull()
    expect(screen.queryByTestId('question-text')).toBeNull()
    expect(screen.getByTestId('handoff-outcome').textContent).toBe('Outcome: not recorded yet')
    expect(screen.getByTestId('handoff-outcome').getAttribute('data-recorded')).toBe('false')
    expect(screen.getByTestId('handoff-actor').textContent).toBe('Actor: not recorded yet')
    expect(screen.getByTestId('handoff-actor').getAttribute('data-recorded')).toBe('false')
  })

  it('shows a hard stop reason from the fixture projection', () => {
    const session = asSession(t1.steps.at(-1)?.response)
    const projection = projectionFromFixture(session)
    expect(projection.stop?.kind).toBe('hard')
    render(<HandoffScreen library={library} projection={projection} />)
    const stop = screen.getByTestId('handoff-stop')
    expect(stop.getAttribute('data-kind')).toBe('hard')
    expect(stop.textContent).toBe(projection.stop?.reason)
  })

  it('renders the API projection even when its score differs from another state', () => {
    const session = asSession(t2.steps[0]?.response)
    const projection = projectionFromFixture(session)
    projection.risk = { ...projection.risk, score: 12345, pattern_label: 'From the server' }
    projection.suggested_outcome = 'escalate'
    render(<HandoffScreen library={library} projection={projection} />)
    expect(screen.getByTestId('handoff-score').textContent).toBe('12345')
    expect(screen.getByTestId('handoff-pattern').textContent).toBe('From the server')
    expect(screen.getByTestId('handoff-suggested').textContent).toBe('Escalate')
    expect(screen.getByTestId('handoff-suggested').getAttribute('data-outcome')).toBe('escalate')
    expect(screen.getByTestId('handoff-outcome').textContent).toBe('Outcome: not recorded yet')
    expect(screen.getByTestId('handoff-actor').textContent).toBe('Actor: not recorded yet')
  })

  it('renders a recorded outcome and actor', () => {
    const session = asSession(t2.steps[3]?.response)
    const projection = projectionFromFixture(session)
    projection.outcome = 'report'
    projection.actor = 'teller-1'
    render(<HandoffScreen library={library} projection={projection} />)
    expect(screen.getByTestId('handoff-outcome').textContent).toBe('Outcome: Report')
    expect(screen.getByTestId('handoff-outcome').getAttribute('data-recorded')).toBe('true')
    expect(screen.getByTestId('handoff-actor').textContent).toBe('Actor: teller-1')
    expect(screen.getByTestId('handoff-actor').getAttribute('data-recorded')).toBe('true')
  })

  it('validates the fixture projection against handoff.schema.json', () => {
    const session = asSession(t2.steps[3]?.response)
    const projection = projectionFromFixture(session)
    expect(validateHandoff(projection)).toEqual([])
    const recorded = { ...projection, outcome: 'escalate', actor: 'teller-1' }
    expect(validateHandoff(recorded)).toEqual([])
    const missing: Record<string, unknown> = { ...projection }
    delete missing.outcome
    delete missing.actor
    expect(validateHandoff(missing).length).toBeGreaterThan(0)
    expect(validateHandoff({ ...projection, outcome: 'approve' }).length).toBeGreaterThan(0)
  })
})

function http(status: number, body: unknown): Promise<{ status: number; text: () => Promise<string> }> {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

function ApiHarness() {
  const teller = useTeller()
  return (
    <>
      <button type="button" onClick={() => void teller.startCase('T2')}>
        start
      </button>
      <button type="button" onClick={() => void teller.loadHandoff()}>
        load
      </button>
      <button type="button" onClick={() => void teller.postOutcome('escalate', 'teller-1')}>
        record
      </button>
      <HandoffScreen library={teller.library} projection={teller.handoff} />
      <p data-testid="status">{teller.httpStatus ?? ''}</p>
      <p data-testid="ready">{teller.session ? 'yes' : 'no'}</p>
    </>
  )
}

describe('handoff and outcome against the API', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('renders the handoff body from GET and posts outcome with an actor', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const calls: { url: string; method: string; body?: string }[] = []
    const session = asSession(t2.steps[0]?.response)
    const projection = projectionFromFixture(asSession(t2.steps[3]?.response))
    projection.risk = { ...projection.risk, score: 58 }
    const recorded: { outcome: HandoffProjection['outcome']; actor: string | null } = {
      outcome: null,
      actor: null,
    }
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
          return http(200, session)
        }
        if (method === 'GET' && url.endsWith('/handoff')) {
          return http(200, { ...projection, outcome: recorded.outcome, actor: recorded.actor })
        }
        if (method === 'POST' && url.endsWith('/outcome')) {
          const posted = JSON.parse(body ?? '{}') as { outcome: HandoffProjection['outcome']; actor: string }
          recorded.outcome = posted.outcome
          recorded.actor = posted.actor
          return http(200, session)
        }
        return http(404, null)
      }),
    )

    render(
      <TellerProvider>
        <ApiHarness />
      </TellerProvider>,
    )
    await waitFor(() => {
      expect(calls.some((call) => call.url === 'http://api.test/library')).toBe(true)
    })
    fireEvent.click(screen.getByRole('button', { name: 'start' }))
    await waitFor(() => {
      expect(screen.getByTestId('ready').textContent).toBe('yes')
    })
    fireEvent.click(screen.getByRole('button', { name: 'load' }))
    await waitFor(() => {
      expect(screen.getByTestId('handoff-score').textContent).toBe('58')
    })
    expect(screen.getByTestId('handoff-pattern').textContent).toBe(projection.risk.pattern_label)
    expect(screen.getByTestId('handoff-outcome').textContent).toBe('Outcome: not recorded yet')
    expect(screen.getByTestId('handoff-actor').textContent).toBe('Actor: not recorded yet')
    const handoffCall = calls.find((call) => call.url.endsWith('/handoff'))
    expect(handoffCall?.method).toBe('GET')
    expect(handoffCall?.url).toBe(`http://api.test/sessions/${session.session_id}/handoff`)

    fireEvent.click(screen.getByRole('button', { name: 'record' }))
    await waitFor(() => {
      expect(calls.some((call) => call.url.endsWith('/outcome'))).toBe(true)
    })
    const outcomeCall = calls.find((call) => call.url.endsWith('/outcome'))
    expect(outcomeCall?.url).toBe(`http://api.test/sessions/${session.session_id}/outcome`)
    expect(JSON.parse(outcomeCall?.body ?? '{}')).toEqual({ outcome: 'escalate', actor: 'teller-1' })

    fireEvent.click(screen.getByRole('button', { name: 'load' }))
    await waitFor(() => {
      expect(screen.getByTestId('handoff-outcome').textContent).toBe('Outcome: Escalate')
    })
    expect(screen.getByTestId('handoff-outcome').getAttribute('data-recorded')).toBe('true')
    expect(screen.getByTestId('handoff-actor').textContent).toBe('Actor: teller-1')
    expect(screen.getByTestId('handoff-actor').getAttribute('data-recorded')).toBe('true')
    expect(recorded).toEqual({ outcome: 'escalate', actor: 'teller-1' })
    expect(validateHandoff({ ...projection, outcome: recorded.outcome, actor: recorded.actor })).toEqual([])
  })
})
