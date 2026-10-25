import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App, AppShell } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { listedChipIds } from './feed'
import { mockRequest, resetMock } from '../mock/replay'
import { HomeScreen } from './screens/HomeScreen'
import type { Library, SessionState } from './types'
import { CopilotStrip } from './workstation/CopilotStrip'

const library = libraryJson as Library
const emptyVisit = t1.steps[0]?.response as SessionState
const phoneVisit = {
  ...emptyVisit,
  context_chips: [{ id: 'chip.on_phone', source: 'observed' as const }],
  risk: {
    ...emptyVisit.risk,
    score: 14,
    counterpoint: {
      id: 'sig.third_party_call',
      label: 'On the phone during the visit',
      rationale: 'Scammers often stay on the line.',
    },
  },
  talk_track: {
    ...emptyVisit.talk_track,
    lines: ['I noticed you have someone on the phone. Would you like a moment?'],
  },
} satisfies SessionState

function demo(overrides: Partial<DemoView> = {}): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: CUSTOMERS[0]?.id ?? '',
    index: 0,
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
    onEscalate: () => undefined,
    ...overrides,
  }
}

function strip(overrides: Partial<Parameters<typeof CopilotStrip>[0]> = {}) {
  return (
    <CopilotStrip
      library={library}
      session={phoneVisit}
      postedChipIds={['chip.on_phone']}
      confirmed={[]}
      pending={false}
      onConfirm={() => undefined}
      onDismiss={() => undefined}
      onEscalate={() => undefined}
      onUndo={() => undefined}
      {...overrides}
    />
  )
}

function http(status: number, body: unknown) {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(body === undefined || body === null ? '' : JSON.stringify(body)),
  })
}

function installMockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const raw = typeof init?.body === 'string' ? init.body : undefined
      const path = url.replace(/^https?:\/\/[^/]+/, '')
      const result = mockRequest(method, path, raw ? (JSON.parse(raw) as unknown) : undefined)
      return http(result.status, result.body)
    }),
  )
}

async function stepUntilSignals() {
  fireEvent.click(screen.getByTestId('demo-step'))
  await waitFor(() => {
    expect(screen.getByRole('link', { name: 'Outcome' })).toBeTruthy()
  })
  fireEvent.click(screen.getByTestId('demo-step'))
  await waitFor(() => {
    expect(screen.getByTestId('signal-row')).toBeTruthy()
  })
}

describe('Copilot card on latest main', () => {
  afterEach(() => {
    resetMock()
    vi.unstubAllGlobals()
  })

  it('keeps a dismissed signal visible and lets Undo reverse the last teller action', () => {
    const onRestore = vi.fn()
    const onUndo = vi.fn()
    const { rerender } = render(
      strip({
        dismissed: ['chip.on_phone'],
        postedChipIds: [],
        session: { ...phoneVisit, context_chips: [] },
        onRestore,
        onUndo,
      }),
    )
    const row = screen.getByTestId('signal-row')
    expect(row.getAttribute('data-state')).toBe('dismissed')
    expect(row.textContent).toMatch(/On the phone during the transaction/)
    expect(screen.queryByTestId('signal-confirm')).toBeNull()
    expect(screen.queryByTestId('signal-dismiss')).toBeNull()
    fireEvent.click(screen.getByTestId('signal-restore'))
    expect(onRestore).toHaveBeenCalledWith('chip.on_phone')

    rerender(strip({ confirmed: ['chip.on_phone'], onUndo }))
    expect(screen.getByTestId('signal-origin').textContent).toBe('Teller confirmed')
    fireEvent.click(screen.getByTestId('undo'))
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('lists dismissed chip ids so the row can return', () => {
    expect(listedChipIds([], [], ['chip.on_phone'])).toEqual(['chip.on_phone'])
    expect(listedChipIds(['chip.cash_only'], [], ['chip.on_phone'])).toEqual([
      'chip.cash_only',
      'chip.on_phone',
    ])
  })

  it('shows an updating state instead of mixing an in-flight Clear level with leftover copy', () => {
    render(
      strip({
        pending: true,
        session: {
          ...emptyVisit,
          question: phoneVisit.question,
          talk_track: phoneVisit.talk_track,
        },
      }),
    )
    expect(screen.getByTestId('copilot-updating').textContent).toMatch(/Updating/)
    expect(screen.queryByTestId('copilot-level')).toBeNull()
    expect(screen.queryByTestId('copilot-action')).toBeNull()
    expect(screen.queryByTestId('read-aloud')).toBeNull()
    expect(screen.queryByTestId('explain-panel')).toBeNull()
  })

  it('renders one server snapshot when that snapshot is Clear and still has a question', () => {
    render(strip({ session: emptyVisit, postedChipIds: [] }))
    expect(screen.getByTestId('copilot-level').textContent).toBe('Clear')
    expect(screen.getByTestId('copilot-reason').textContent).toMatch(/No concern flagged/)
    expect(screen.getByTestId('copilot-action').textContent).toBe(emptyVisit.question?.text)
    expect(screen.getByTestId('read-aloud').textContent).toBe(emptyVisit.talk_track.lines.join(' '))
  })

  it('shows an idle placeholder before play and after a new visit that has not started', () => {
    render(<HomeScreen library={library} session={emptyVisit} demo={demo()} />)
    expect(screen.getByTestId('copilot-idle').textContent).toMatch(/Press play to start the simulation/)
    expect(screen.queryByTestId('copilot-level')).toBeNull()
    expect(screen.queryByTestId('copilot-action')).toBeNull()
    expect(screen.queryByTestId('read-aloud')).toBeNull()
    expect(screen.queryByTestId('explain-panel')).toBeNull()
    expect(screen.queryByTestId('undo')).toBeNull()
    expect(screen.queryByTestId('escalate')).toBeNull()
  })

  it('places the origin badge as a compact pill beside the factor label', () => {
    render(strip())
    const row = screen.getByTestId('signal-row')
    const badge = screen.getByTestId('signal-origin')
    const label = within(row).getByText('On the phone during the transaction')
    expect(badge.textContent).toBe('Observed')
    expect(badge.className).toContain('tc-badge')
    expect(badge.parentElement).toBe(label.parentElement)
    expect(badge.parentElement?.className).toContain('tc-signal-meta')
    expect(row.className).toContain('tc-signal-row')
    expect(row.querySelector('.tc-signal-meta')?.contains(badge)).toBe(true)
    expect(row.querySelector('.tc-signal-actions')).toBeTruthy()
  })

  it('does not put a stray Undo above Outcome or Handoff', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={[`/sessions/${emptyVisit.session_id}/outcome`]}>
        <AppShell library={library} session={emptyVisit} issues={[]} onUndo={() => undefined} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('outcome-screen')).toBeTruthy()
    expect(screen.queryByTestId('undo')).toBeNull()
    unmount()

    render(
      <MemoryRouter initialEntries={[`/sessions/${emptyVisit.session_id}/handoff`]}>
        <AppShell library={library} session={emptyVisit} issues={[]} onUndo={() => undefined} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('handoff-screen')).toBeTruthy()
    expect(screen.queryByTestId('undo')).toBeNull()
  })

  it('dismiss, undo, idle after Start new customer, and no Outcome Undo through the live mock', async () => {
    installMockFetch()
    render(<App />)
    expect(screen.getByTestId('copilot-idle')).toBeTruthy()
    expect(screen.queryByTestId('copilot-level')).toBeNull()
    expect(screen.queryByTestId('escalate')).toBeNull()

    await stepUntilSignals()
    const label = 'On the phone during the transaction'
    expect(screen.getByTestId('signal-row').textContent).toMatch(label)
    fireEvent.click(screen.getByTestId('signal-dismiss'))
    await waitFor(() => {
      expect(screen.getByTestId('signal-row').getAttribute('data-state')).toBe('dismissed')
    })
    expect(screen.getByTestId('signal-row').textContent).toMatch(label)
    expect(screen.getByTestId('signal-restore')).toBeTruthy()

    fireEvent.click(screen.getByTestId('undo'))
    await waitFor(() => {
      expect(screen.getByTestId('signal-row').getAttribute('data-state')).not.toBe('dismissed')
    })
    expect(screen.getByTestId('signal-row').textContent).toMatch(label)
    expect(screen.getByTestId('signal-confirm')).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'Outcome' }))
    expect(screen.getByTestId('outcome-screen')).toBeTruthy()
    expect(screen.queryByTestId('undo')).toBeNull()

    fireEvent.change(screen.getByTestId('actor'), { target: { value: 'Avery' } })
    fireEvent.click(screen.getByTestId('outcome-slow_down'))
    fireEvent.click(screen.getByTestId('outcome-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('start-new-customer')).toBeTruthy()
    })
    fireEvent.click(screen.getByTestId('start-new-customer'))
    await waitFor(() => {
      expect(screen.getByTestId('home-screen')).toBeTruthy()
    })
    expect(screen.getByTestId('copilot-idle')).toBeTruthy()
    expect(screen.queryByTestId('copilot-level')).toBeNull()
    expect(screen.queryByTestId('escalate')).toBeNull()
  })
})
