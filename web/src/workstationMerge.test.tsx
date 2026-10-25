import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { CustomerFileScreen } from './screens/CustomerFileScreen'
import { HomeScreen } from './screens/HomeScreen'
import type { ActivityRow, Library, SessionState } from './types'

const library = libraryJson as Library
const caution = t1.steps[1]?.response as SessionState

const thresholdChip = library.context_chips.find((chip) => chip.id === 'chip.above_threshold')
if (!thresholdChip) {
  throw new Error('missing chip.above_threshold')
}

const activityRows: ActivityRow[] = [
  { ts: '2026-10-25T08:08:00Z', channel: 'chip.on_phone', amount_band: '5000_9999', type: 'ContextAdded' },
  { ts: '2026-10-25T08:08:00Z', channel: 'chip.cash_only', amount_band: '5000_9999', type: 'ContextAdded' },
  { ts: '2026-10-25T08:08:00Z', channel: 'chip.above_threshold', amount_band: '5000_9999', type: 'ContextAdded' },
]

const liveVisit: SessionState = {
  ...caution,
  context_chips: [
    { id: 'chip.on_phone', source: 'observed' },
    { id: 'chip.cash_only', source: 'observed' },
    { id: 'chip.above_threshold', source: 'observed' },
  ],
}

function demo(overrides: Partial<DemoView> = {}): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: 'romance-crypto',
    index: 3,
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
    ...overrides,
  }
}

function workstation(overrides: Partial<Parameters<typeof HomeScreen>[0]> = {}) {
  return (
    <HomeScreen
      library={library}
      session={liveVisit}
      postedChipIds={['chip.on_phone', 'chip.cash_only', 'chip.above_threshold']}
      dismissed={[]}
      activity={activityRows}
      demo={demo()}
      {...overrides}
    />
  )
}

function signalTexts(): string[] {
  return screen.getAllByTestId('signal-row').map((row) => row.textContent ?? '')
}

describe('merged workstation signals', () => {
  it('drops the Recent activity table and keeps each signal once with its reason', () => {
    render(workstation())
    expect(screen.queryByRole('heading', { name: 'Recent activity' })).toBeNull()
    expect(screen.queryByTestId('session-activity')).toBeNull()
    expect(screen.queryByTestId('activity-row')).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'When' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'What' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Amount' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Record' })).toBeNull()

    const panel = screen.getByTestId('explain-panel')
    const rows = within(panel).getAllByTestId('signal-row')
    expect(rows).toHaveLength(2)
    const phone = rows.find((row) => row.textContent?.includes('On the phone'))
    const cash = rows.find((row) => row.textContent?.includes('Insists on cash'))
    expect(phone?.textContent).toMatch(/stay on the line/)
    expect(cash?.textContent).toMatch(/can't be traced/)
    expect(phone?.textContent).not.toMatch(/Noted at the window/)
    expect(cash?.textContent).not.toMatch(/Noted at the window/)
    expect(panel.textContent).not.toMatch(/Oct 25, 2026, 8:08 AM UTC/)
    expect(within(panel).queryByTestId('activity-technical')).toBeNull()
    expect(within(panel).getAllByTestId('technical-details')).toHaveLength(1)
  })

  it('moves the timeline up to the old Recent activity slot and shows amount once', () => {
    render(workstation({ demo: demo({ showCase: true }) }))
    const column = screen.getByTestId('transaction-panel')
    const amount = within(column).getByTestId('txn-amount')
    const timeline = within(column).getByTestId('demo-timeline')
    const caseFile = within(column).getByTestId('case-file')
    expect(amount.textContent).toBe('$6,500')
    expect(amount.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(timeline.compareDocumentPosition(caseFile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Recent activity' })).toBeNull()

    const amountHits = (screen.getByTestId('home-screen').textContent ?? '').match(/\$6,500/g) ?? []
    expect(amountHits.length).toBeGreaterThanOrEqual(1)
    for (const row of signalTexts()) {
      expect(row).not.toMatch(/\$6,500/)
      expect(row).not.toMatch(/\$5,000/)
    }
    expect(screen.getByTestId('explain-panel').textContent).not.toMatch(/\$5,000–\$9,999/)
  })

  it('puts the branch threshold in teller notes instead of a signal row', () => {
    render(workstation())
    const notes = screen.getByTestId('teller-notes')
    expect(notes.textContent).toContain(thresholdChip.label)
    expect(signalTexts().join('\n')).not.toContain(thresholdChip.label)
    expect(screen.getByTestId('copilot-strip').querySelector('[data-testid="signal-row"]')).toBeNull()
  })

  it('keeps dismissed and confirmed marks plus keyboard labels on the merged rows', () => {
    const onRestore = vi.fn()
    const onConfirm = vi.fn()
    const onDismiss = vi.fn()
    render(
      workstation({
        dismissed: ['chip.on_phone'],
        demo: demo({
          confirmed: ['chip.cash_only'],
          onRestoreSignal: onRestore,
          onConfirmSignal: onConfirm,
          onDismissSignal: onDismiss,
        }),
      }),
    )
    const phone = screen.getAllByTestId('signal-row').find((row) => row.textContent?.includes('On the phone'))
    const cash = screen.getAllByTestId('signal-row').find((row) => row.textContent?.includes('Insists on cash'))
    expect(phone?.getAttribute('data-state')).toBe('dismissed')
    expect(cash?.getAttribute('data-state')).toBe('confirmed')
    expect(within(phone as HTMLElement).getByTestId('signal-origin').textContent).toBe('Observed')
    expect(within(cash as HTMLElement).getByTestId('signal-origin').textContent).toBe('Teller confirmed')
    const restore = screen.getByTestId('signal-restore')
    expect(restore.getAttribute('aria-label')).toMatch(/Restore/)
    fireEvent.click(restore)
    expect(onRestore).toHaveBeenCalledWith('chip.on_phone')
    const confirm = within(cash as HTMLElement).getByTestId('signal-confirm')
    const dismiss = within(cash as HTMLElement).getByTestId('signal-dismiss')
    expect(confirm.getAttribute('aria-label')).toMatch(/Confirm/)
    expect(dismiss.getAttribute('aria-label')).toMatch(/Dismiss/)
    expect(confirm.getAttribute('title')).toMatch(/\(C\)/)
    expect(dismiss.getAttribute('title')).toMatch(/\(D\)/)
    fireEvent.click(confirm)
    fireEvent.click(dismiss)
    expect(onConfirm).toHaveBeenCalledWith('chip.cash_only')
    expect(onDismiss).toHaveBeenCalledWith('chip.cash_only')
  })

  it('does not repeat transaction facts or the noted list on the customer file', () => {
    render(
      <MemoryRouter>
        <AppShell
          library={library}
          session={liveVisit}
          issues={[]}
          postedChipIds={['chip.on_phone']}
          activity={activityRows}
          demo={demo()}
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Customer file' }))
    const file = screen.getByTestId('customer-screen')
    expect(within(file).getByTestId('profile-name').textContent).toMatch(/Marcus/)
    expect(within(file).queryByRole('heading', { name: 'Recent activity' })).toBeNull()
    expect(within(file).queryByRole('heading', { name: 'This withdrawal' })).toBeNull()
    expect(within(file).queryByRole('heading', { name: 'What was noted' })).toBeNull()
    expect(within(file).queryByTestId('file-transaction')).toBeNull()
    expect(within(file).queryByTestId('file-signal')).toBeNull()
    expect(within(file).queryByTestId('session-activity')).toBeNull()
    expect(within(file).queryByTestId('activity-row')).toBeNull()
    expect(file.textContent).not.toMatch(/\$6,500/)
    expect(file.textContent).not.toMatch(/Noted at the window/)
  })

  it('still shows the synthetic profile when no visit activity is loaded', () => {
    render(<CustomerFileScreen demo={demo({ customerId: 'contractor-cash', index: 0 })} />)
    expect(screen.getByTestId('profile-name').textContent).toBe('Helen Ruiz')
    expect(screen.queryByTestId('activity-row')).toBeNull()
    expect(screen.queryByTestId('file-signal')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Recent activity' })).toBeNull()
  })

  it('shows one local noted time when activity rows exist', () => {
    render(workstation())
    const stamp = screen.getByTestId('noted-at')
    expect(stamp.textContent).toMatch(/Noted/)
    expect(stamp.textContent).not.toMatch(/UTC/)
    expect(screen.queryAllByTestId('noted-at')).toHaveLength(1)
  })
})
