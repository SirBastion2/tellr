import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { HandoffScreen } from './screens/HandoffScreen'
import { HomeScreen } from './screens/HomeScreen'
import { OutcomeScreen } from './screens/OutcomeScreen'
import type { HandoffProjection, Library, SessionState } from './types'
import { CUSTOMER_LABEL } from './ui/privacy'

const library = libraryJson as Library
const session = t1.steps[1]?.response as SessionState

const NAMES = CUSTOMERS.flatMap((customer) => {
  const full = customer.profile.name
  const first = full.split(/\s+/)[0]
  return first ? [full, first] : [full]
})
const AGE_BANDS = [...new Set(CUSTOMERS.map((customer) => customer.profile.ageBand))]
const GENDERED = /\b(she|he|her|hers|him|his|herself|himself|woman|man|female|male)\b/i

function demo(overrides: Partial<DemoView> = {}): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: 'contractor-cash',
    index: 5,
    playing: false,
    speed: 1,
    pending: false,
    showCase: true,
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

function assertNoPersonalId(root: HTMLElement) {
  const text = root.textContent ?? ''
  for (const name of NAMES) {
    expect(text, `leaked ${name}`).not.toContain(name)
  }
  for (const band of AGE_BANDS) {
    expect(text, `leaked ${band}`).not.toContain(band)
  }
  expect(text).not.toMatch(GENDERED)
}

describe('demo personal identification', () => {
  it('renders Home, Outcome, and Handoff without name, age, or gender', () => {
    const view = demo()
    const home = render(<HomeScreen library={library} session={session} demo={view} />)
    assertNoPersonalId(screen.getByTestId('home-screen'))
    expect(screen.queryByTestId('synthetic-banner')).toBeNull()
    expect(screen.queryByText('Practice data.')).toBeNull()
    const markers = screen.getAllByTestId('event-marker').map((row) => row.textContent ?? '')
    expect(markers.some((text) => text.includes(CUSTOMER_LABEL))).toBe(true)
    expect(markers.every((text) => NAMES.every((name) => !text.includes(name)))).toBe(true)
    home.unmount()

    const outcome = render(<OutcomeScreen session={session} />)
    assertNoPersonalId(screen.getByTestId('outcome-screen'))
    outcome.unmount()

    const projection = {
      session_id: session.session_id,
      mode: session.mode,
      answers: session.answers,
      risk: session.risk,
      stated_purpose: session.stated_purpose,
      suggested_outcome: session.suggested_outcome,
      outcome: 'escalate',
      actor: 'teller',
      stop: session.stop,
    } as HandoffProjection
    const handoff = render(<HandoffScreen library={library} projection={projection} session={session} />)
    assertNoPersonalId(screen.getByTestId('handoff-screen'))
    handoff.unmount()

    render(
      <MemoryRouter>
        <AppShell library={library} session={session} issues={[]} demo={view} />
      </MemoryRouter>,
    )
    assertNoPersonalId(screen.getByTestId('home-screen'))
    expect(screen.getAllByTestId('event-marker').some((row) => (row.textContent ?? '').includes(CUSTOMER_LABEL))).toBe(true)
  })
})
