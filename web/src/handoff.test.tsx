import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HandoffScreen, handoffCounterpoint, handoffDownloadText, handoffSummaryRows } from './screens/HandoffScreen'
import { PresenterProvider } from './presenter'
import { ThemeRoot } from './theme/ThemeRoot'
import { ThemeProvider } from './theme/ThemeProvider'
import { THEME_IDS } from './theme/registry'
import { COLOR_STORAGE_KEY } from './theme/tokens'
import { TellerProvider, useTeller } from './teller'
import { actorLabel, modeLabel, patternValue, shortId } from './ui/plain'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from './ui/urgencyScore'
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
    expect(screen.getByTestId('handoff-session').textContent).toBe(shortId(projection.session_id))
    expect(screen.getByTestId('handoff-session').getAttribute('title')).toBe(projection.session_id)
    expect(screen.getByTestId('handoff-mode').textContent).toBe(modeLabel(projection.mode))
    expect(screen.getByTestId('handoff-answers').textContent).toBe(String(projection.answers))
    expect(screen.getByTestId('handoff-level').textContent).toBe('Caution')
    expect(screen.getByTestId('handoff-level').getAttribute('data-level')).toBe(projection.risk.level)
    expect(screen.getByTestId('handoff-score').textContent).toBe(formatUrgencyScore(projection.risk.score))
    expect(screen.getByText(URGENCY_SCORE_TERM)).toBeTruthy()
    expect(screen.getByTestId('handoff-pattern').textContent).toBe(patternValue(projection.risk.pattern_label))
    const reasonRows = screen.getAllByTestId('handoff-reason')
    expect(reasonRows.map((item) => item.querySelector('.tc-handoff-signal')?.textContent)).toEqual(
      projection.risk.reasons.map((reason) => reason.label),
    )
    for (const row of reasonRows) {
      const signal = row.querySelector('.tc-handoff-signal')
      const badge = row.querySelector('.tc-badge')
      expect(signal?.nextElementSibling).toBe(badge)
      expect(row.className).toContain('tc-handoff-chip')
    }
    const terms = screen.getAllByRole('term').map((term) => term.textContent)
    expect(new Set(terms).size).toBe(terms.length)
    expect(terms).not.toContain('Type')
    expect(terms).not.toContain('Amount')
    expect(terms).not.toContain('Memo')
    expect(screen.getByRole('heading', { name: 'Handoff' }).className).toContain('tc-title')
    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save handoff' })).toBeTruthy()
    for (const row of reasonRows) {
      expect(row.getAttribute('data-status')).toBe('Observed')
      expect(row.querySelector('.tc-badge')?.textContent).toBe('Observed')
    }
    expect(screen.getByTestId('handoff-suggested').textContent).toBe('Slow down')
    expect(screen.getByTestId('handoff-suggested').getAttribute('data-outcome')).toBe(projection.suggested_outcome)
    const purpose = library.purposes.find((item) => item.id === projection.stated_purpose)
    expect(screen.getByTestId('handoff-purpose').textContent).toBe(purpose?.label)
    expect(screen.queryByTestId('handoff-stop')).toBeNull()
    expect(screen.queryByTestId('question-text')).toBeNull()
    expect(screen.getByTestId('handoff-outcome').textContent).toBe('Not recorded yet')
    expect(screen.getByTestId('handoff-outcome').getAttribute('data-recorded')).toBe('false')
    expect(screen.getByTestId('handoff-actor').textContent).toBe(actorLabel(null))
    expect(screen.getByTestId('handoff-actor').getAttribute('data-recorded')).toBe('false')
  })

  it('shows a hard stop reason from the fixture projection', () => {
    const session = asSession(t1.steps.at(-1)?.response)
    const projection = projectionFromFixture(session)
    expect(projection.stop?.kind).toBe('hard')
    render(<HandoffScreen library={library} projection={projection} />)
    const stop = screen.getByTestId('handoff-stop')
    expect(stop.getAttribute('data-kind')).toBe('hard')
    expect(projection.stop?.reason).toBe('enough to proceed; nothing left to ask')
    expect(stop.textContent).toBe('Enough to proceed; nothing left to ask')
  })

  it('renders the API projection even when its score differs from another state', () => {
    const session = asSession(t2.steps[0]?.response)
    const projection = projectionFromFixture(session)
    projection.risk = { ...projection.risk, score: 12345, pattern_label: 'From the server' }
    projection.suggested_outcome = 'escalate'
    render(<HandoffScreen library={library} projection={projection} />)
    expect(screen.getByTestId('handoff-score').textContent).toBe(formatUrgencyScore(12345))
    expect(screen.getByTestId('handoff-pattern').textContent).toBe('From the server')
    expect(screen.getByTestId('handoff-suggested').textContent).toBe('Escalate')
    expect(screen.getByTestId('handoff-suggested').getAttribute('data-outcome')).toBe('escalate')
    expect(screen.getByTestId('handoff-outcome').textContent).toBe('Not recorded yet')
    expect(screen.getByTestId('handoff-actor').textContent).toBe(actorLabel(null))
  })

  it('lists session chips and marks dismissed or confirmed ones', () => {
    const session = asSession(t2.steps.find((step) => asSession(step.response).answers === 2)?.response)
    const projection = projectionFromFixture(session)
    const chips = [
      { id: 'chip.on_phone', source: 'observed' as const },
      { id: 'chip.someone_directing', source: 'observed' as const },
      { id: 'chip.cash_only', source: 'observed' as const },
      { id: 'chip.urgency_secrecy', source: 'observed' as const },
      { id: 'chip.rushed', source: 'teller' as const },
    ]
    render(
      <HandoffScreen
        library={library}
        projection={projection}
        session={{ ...session, context_chips: chips }}
        dismissed={['chip.cash_only']}
        confirmed={['chip.rushed']}
      />,
    )
    const rows = screen.getAllByTestId('handoff-reason')
    expect(rows.length).toBeGreaterThanOrEqual(5)
    expect(rows.map((row) => row.getAttribute('data-id') ?? row.textContent).join(' ')).toMatch(/phone|directing|cash|secrecy|rush/i)
    expect(rows.find((row) => row.getAttribute('data-status') === 'Dismissed')?.textContent).toMatch(/Dismissed/)
    expect(rows.find((row) => row.getAttribute('data-status') === 'Teller confirmed')?.textContent).toMatch(
      /Teller confirmed/,
    )
  })

  it('renders a recorded outcome and actor', () => {
    const session = asSession(t2.steps[3]?.response)
    const projection = projectionFromFixture(session)
    projection.outcome = 'report'
    projection.actor = 'teller-1'
    render(<HandoffScreen library={library} projection={projection} />)
    expect(screen.getByTestId('handoff-outcome').textContent).toBe('Report')
    expect(screen.getByTestId('handoff-outcome').getAttribute('data-recorded')).toBe('true')
    expect(screen.getByTestId('handoff-actor').textContent).toBe('Teller-1')
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

function handoffCss(): string {
  const css = readFileSync('src/index.css', 'utf8')
  const start = css.indexOf('/* handoff-design:start */')
  const end = css.indexOf('/* handoff-design:end */')
  return css.slice(start, end)
}

describe('Handoff design', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    window.history.replaceState({}, '', '/')
    window.localStorage.clear()
  })

  it('keeps the glass card on the stage grid and scrolls only the body', () => {
    const css = handoffCss()
    expect(css).toMatch(/\.tc-stage \.tc-shell > main > \.tc-handoff\.tc-screen\s*\{[^}]*left:\s*calc\(193 \* var\(--u\)\)/)
    expect(css).toMatch(/top:\s*calc\(114 \* var\(--u\)\)/)
    expect(css).toMatch(/width:\s*calc\(\(818 - 193\) \* var\(--u\)\)/)
    expect(css).toMatch(/height:\s*calc\(\(515 - 114\) \* var\(--u\)\)/)
    expect(css).toMatch(/overflow:\s*hidden/)
    expect(css).toMatch(/border-radius:\s*calc\(45 \* var\(--u, 1px\)\)/)
    expect(css).toMatch(/background:\s*var\(--tc-glass-fill\)/)
    expect(css).toMatch(/border:\s*1px solid var\(--tc-glass-border\)/)
    expect(css).toMatch(/\.tc-handoff-head\s*\{[^}]*height:\s*calc\(\(211 - 114\) \* var\(--u, 1px\)\)/)
    expect(css).toMatch(/\.tc-handoff-body\s*\{[^}]*overflow:\s*auto/)
    expect(css).toMatch(/\.tc-handoff-body\s*\{[^}]*min-height:\s*0/)
    expect(css).toMatch(/\.tc-handoff-body\s*\{[^}]*overscroll-behavior:\s*contain/)
    expect(css).toMatch(/\.tc-handoff-facts\s*\{[^}]*row-gap:\s*calc\(20 \* var\(--u, 1px\)\)/)
    expect(css).toMatch(/\.tc-handoff-chip\s*\{[^}]*flex-direction:\s*column/)
    expect(css).toMatch(/\.tc-handoff-chip\s*\{[^}]*border-radius:\s*var\(--tc-radius-control, 999px\)/)
    expect(css).toMatch(/color-mix\(in srgb, var\(--tc-accent\)/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(css).not.toMatch(/\b(tellr|pnc|mtb|fnb)\b/)
    expect(css).not.toMatch(/\.tc-footer|theme-footer|HackPSU|text-align:\s*right/)
    const full = readFileSync('src/index.css', 'utf8')
    const footerTop = full.match(/\.tc-stage \.tc-footer-row\s*\{[^}]*top:\s*calc\((\d+) \* var\(--u\)\)/)
    expect(Number(footerTop?.[1])).toBeGreaterThan(515)
  })

  it('copies the case id and saves the on-screen summary', async () => {
    const session = asSession(t2.steps.find((step) => asSession(step.response).answers === 2)?.response)
    const projection = projectionFromFixture(session)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob)
      return 'blob:handoff'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const anchors: HTMLAnchorElement[] = []
    const append = document.body.appendChild.bind(document.body)
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        anchors.push(node)
      }
      return append(node)
    })

    render(<HandoffScreen library={library} projection={projection} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }))
    expect(writeText).toHaveBeenCalledWith(projection.session_id)
    await waitFor(() => {
      expect(screen.getByTestId('copy-session-id').textContent).toBe('Copied')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save handoff' }))
    expect(anchors[0]?.download).toBe(`handoff-${projection.session_id}.txt`)
    const text = await blobs[0]?.text()
    const rows = handoffSummaryRows(library, projection)
    expect(text).toBe(
      handoffDownloadText(
        projection,
        rows,
        projection.risk.reasons.map((reason) => ({ label: reason.label, status: 'Observed' })),
        handoffCounterpoint(projection),
      ),
    )
    expect(text).not.toMatch(/\b(sig|chip|purpose|pat)\./)
    expect(text).toContain(screen.getByTestId('handoff-session').textContent ?? '')
  })

  it('uses the same chip structure in every bank and scheme', () => {
    const session = asSession(t1.steps.at(-1)?.response)
    const projection = projectionFromFixture(session)
    for (const id of THEME_IDS) {
      for (const scheme of ['light', 'dark'] as const) {
        window.history.replaceState({}, '', `/?theme=${id}`)
        window.localStorage.setItem(COLOR_STORAGE_KEY, scheme)
        const view = render(
          <ThemeProvider>
            <PresenterProvider>
              <ThemeRoot>
                <HandoffScreen library={library} projection={projection} session={session} />
              </ThemeRoot>
            </PresenterProvider>
          </ThemeProvider>,
        )
        const root = view.getByTestId('theme-root')
        expect(root.getAttribute('data-theme')).toBe(id)
        expect(root.getAttribute('data-scheme')).toBe(scheme)
        const chips = view.getAllByTestId('handoff-reason')
        expect(chips.length).toBeGreaterThan(0)
        for (const chip of chips) {
          const badge = chip.querySelector('.tc-badge')
          expect(chip.querySelector('.tc-handoff-signal')?.nextElementSibling).toBe(badge)
          expect(badge?.textContent).toMatch(/^(Observed|Teller confirmed|Dismissed)$/)
          expect(chip.textContent).not.toMatch(/\b(sig|chip)\./)
        }
        view.unmount()
      }
    }
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
      expect(screen.getByTestId('handoff-score').textContent).toBe(formatUrgencyScore(58))
    })
    expect(screen.getByTestId('handoff-pattern').textContent).toBe(patternValue(projection.risk.pattern_label))
    expect(screen.getByTestId('handoff-outcome').textContent).toBe('Not recorded yet')
    expect(screen.getByTestId('handoff-actor').textContent).toBe(actorLabel(null))
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
      expect(screen.getByTestId('handoff-outcome').textContent).toBe('Escalate')
    })
    expect(screen.getByTestId('handoff-outcome').getAttribute('data-recorded')).toBe('true')
    expect(screen.getByTestId('handoff-actor').textContent).toBe('Teller-1')
    expect(screen.getByTestId('handoff-actor').getAttribute('data-recorded')).toBe('true')
    expect(recorded).toEqual({ outcome: 'escalate', actor: 'teller-1' })
    expect(validateHandoff({ ...projection, outcome: recorded.outcome, actor: recorded.actor })).toEqual([])
  })
})
