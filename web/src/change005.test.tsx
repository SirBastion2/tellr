import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { CustomerFileScreen } from './screens/CustomerFileScreen'
import type { Library, SessionState } from './types'
import { ExplanationPanel } from './workstation/ExplanationPanel'
import { CopilotStrip } from './workstation/CopilotStrip'

const library = libraryJson as Library
const base = t1.steps[0]?.response as SessionState

function demo(): DemoView {
  const customer = CUSTOMERS[0]
  if (!customer) {
    throw new Error('missing customer')
  }
  return {
    customers: CUSTOMERS,
    customerId: customer.id,
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
  }
}

describe('CHANGE-005 fields', () => {
  it('keeps the explanation gap when the field is absent or null', () => {
    const { rerender } = render(
      <ExplanationPanel library={library} session={base} postedChipIds={[]} />,
    )
    expect(screen.getByTestId('explain-gap').textContent).toMatch(/not in this response/)
    expect(screen.queryByTestId('explain-confidence')).toBeNull()
    rerender(
      <ExplanationPanel library={library} session={{ ...base, explanation: null }} postedChipIds={[]} />,
    )
    expect(screen.getByTestId('explain-gap')).toBeTruthy()
  })

  it('renders contributions, hides a null confidence, and shows fallback', () => {
    render(
      <ExplanationPanel
        library={library}
        session={{
          ...base,
          explanation: {
            confidence: null,
            used_fallback: true,
            contributions: [
              { signal_id: 'sig.on_phone', label: 'On the phone', weight: 2, direction: 'raises' },
              { signal_id: 'sig.known', label: 'Known customer', weight: 1, direction: 'lowers' },
            ],
          },
        }}
        postedChipIds={[]}
      />,
    )
    expect(screen.queryByTestId('explain-gap')).toBeNull()
    expect(screen.queryByTestId('explain-confidence')).toBeNull()
    const rows = screen.getAllByTestId('explain-contribution').map((row) => row.textContent)
    expect(rows[0]).toMatch(/On the phone/)
    expect(rows[0]).toMatch(/Weight 2/)
    expect(rows[0]).toMatch(/Raises/)
    expect(rows[1]).toMatch(/Lowers/)
    expect(screen.getByTestId('explain-fallback').textContent).toMatch(/used the fallback/)
  })

  it('shows a numeric confidence when the response includes one', () => {
    render(
      <ExplanationPanel
        library={library}
        session={{
          ...base,
          explanation: { confidence: 0.5, used_fallback: false, contributions: [] },
        }}
        postedChipIds={[]}
      />,
    )
    expect(screen.getByTestId('explain-confidence').textContent).toMatch(/0\.5/)
    expect(screen.getByTestId('explain-fallback').textContent).toMatch(/did not use the fallback/)
  })

  it('badges signal source from context_chips and falls back to local confirm', () => {
    const { rerender } = render(
      <CopilotStrip
        library={library}
        session={{
          ...base,
          context_chips: [{ id: 'chip.on_phone', source: 'observed' }],
        }}
        postedChipIds={[]}
        confirmed={[]}
        pending={false}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onEscalate={() => undefined}
      />,
    )
    expect(screen.getByTestId('signal-origin').textContent).toBe('Observed')
    rerender(
      <CopilotStrip
        library={library}
        session={base}
        postedChipIds={['chip.on_phone']}
        confirmed={['chip.on_phone']}
        pending={false}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onEscalate={() => undefined}
      />,
    )
    expect(screen.getByTestId('signal-origin').textContent).toBe('Teller confirmed')
  })

  it('uses session activity when rows exist and the synthetic table when they do not', () => {
    const view = demo()
    const { rerender } = render(
      <CustomerFileScreen library={library} demo={view} postedChipIds={['chip.on_phone']} />,
    )
    expect(screen.getAllByTestId('activity-row')[0]?.getAttribute('data-feed')).toBe('synthetic')
    const phone = screen.getAllByTestId('file-signal').find((row) => row.textContent?.includes('phone'))
    expect(phone?.getAttribute('data-status')).toBe('Observed')
    rerender(
      <CustomerFileScreen
        library={library}
        demo={view}
        contextChips={[{ id: 'chip.on_phone', source: 'teller' }]}
        activity={[{ ts: '2026-10-24T00:00:00Z', channel: 'chip.on_phone', amount_band: '5000_9999', type: 'ContextAdded' }]}
      />,
    )
    expect(screen.getByTestId('session-activity')).toBeTruthy()
    expect(screen.getByTestId('activity-row').getAttribute('data-feed')).toBe('session')
    expect(screen.getByTestId('activity-row').textContent).toMatch(/5000_9999/)
    expect(screen.getByTestId('activity-row').textContent).toMatch(/ContextAdded/)
    const confirmed = screen.getAllByTestId('file-signal').find((row) => row.textContent?.includes('phone'))
    expect(confirmed?.getAttribute('data-status')).toBe('Teller confirmed')
  })
})
