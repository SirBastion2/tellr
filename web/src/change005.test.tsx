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
    onRestoreSignal: () => undefined,
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

  it('groups raises and lowers and does not repeat a contributions list', () => {
    render(
      <ExplanationPanel
        library={library}
        session={{
          ...base,
          risk: {
            ...base.risk,
            level: 'clear',
            raw_level: 'clear',
            score: 14,
            reasons: [],
            counterpoint: {
              id: 'sig.third_party_call',
              label: 'On the phone during the visit',
              rationale: 'Scammers often stay on the line.',
            },
            pattern_label: 'Pattern unclear',
          },
          explanation: {
            confidence: null,
            used_fallback: false,
            contributions: [
              {
                signal_id: 'sig.third_party_call',
                label: 'On the phone during the visit',
                weight: 14,
                direction: 'raises',
              },
              { signal_id: 'mit.known', label: 'Known customer', weight: 4, direction: 'lowers' },
            ],
          },
        }}
        postedChipIds={['chip.on_phone']}
      />,
    )
    expect(screen.queryByTestId('explain-gap')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Contributions' })).toBeNull()
    expect(screen.getByTestId('explain-level').textContent).toBe('Clear')
    expect(screen.getByText('Unclear')).toBeTruthy()
    expect(screen.queryByText(/Pattern Pattern/)).toBeNull()
    const raised = screen.getAllByTestId('explain-reason').map((row) => row.textContent ?? '')
    expect(raised.some((text) => text.includes('On the phone during the visit'))).toBe(true)
    expect(raised.some((text) => text.includes('Strong factor'))).toBe(true)
    expect(raised.join(' ')).not.toMatch(/sig\./)
    const lowered = screen.getAllByTestId('explain-counter').map((row) => row.textContent ?? '')
    expect(lowered.some((text) => text.includes('Known customer'))).toBe(true)
    expect(lowered.join(' ')).not.toMatch(/On the phone/)
    expect(screen.getByTestId('explain-confidence').textContent).toMatch(/Not applicable \(rules engine\)/)
    expect(screen.getByTestId('explain-fallback').textContent).toMatch(/did not use the fallback/)
    const technical = screen.getByTestId('technical-details')
    expect(technical.textContent).toMatch(/sig\.third_party_call/)
    expect(technical.textContent).toMatch(/Weight 14/)
    expect(screen.getByTestId('explain-input').textContent).not.toMatch(/sig\.|chip\./)
  })

  it('puts a raising counterpoint under what raised it when explanation is absent at Clear', () => {
    render(
      <ExplanationPanel
        library={library}
        session={{
          ...base,
          risk: {
            ...base.risk,
            level: 'clear',
            reasons: [],
            counterpoint: {
              id: 'sig.third_party_call',
              label: 'On the phone during the visit',
              rationale: 'Scammers often stay on the line.',
            },
          },
        }}
        postedChipIds={[]}
      />,
    )
    expect(screen.getByTestId('explain-reason').textContent).toMatch(/On the phone during the visit/)
    expect(screen.getByTestId('explain-counter').textContent).toMatch(/points toward it being safe/)
    expect(screen.getByTestId('explain-gap')).toBeTruthy()
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
    expect(screen.getByTestId('explain-contribution').textContent).toMatch(/no contributions/)
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
    expect(screen.getByTestId('activity-row').textContent).toMatch(/\$5,000/)
    expect(screen.getByTestId('activity-row').textContent).toMatch(/Noted at the window/)
    expect(screen.getByTestId('activity-row').textContent).not.toMatch(/chip\.|5000_9999|ContextAdded/)
    expect(screen.getByTestId('activity-technical').textContent).toMatch(/5000_9999/)
    expect(screen.getByTestId('activity-technical').textContent).toMatch(/ContextAdded/)
    expect(screen.getByTestId('activity-technical').textContent).toMatch(/chip\.on_phone/)
    const confirmed = screen.getAllByTestId('file-signal').find((row) => row.textContent?.includes('phone'))
    expect(confirmed?.getAttribute('data-status')).toBe('Teller confirmed')
  })

  it('keeps signal rows in first-seen order after dismiss, restore, and confirm', () => {
    const posted = ['chip.on_phone', 'chip.cash_only', 'chip.rushed']
    const session = {
      ...base,
      context_chips: posted.map((id) => ({ id, source: 'observed' as const })),
    }
    const { rerender } = render(
      <CopilotStrip
        library={library}
        session={session}
        postedChipIds={posted}
        confirmed={[]}
        dismissed={[]}
        chipOrder={posted}
        pending={false}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onRestore={() => undefined}
        onEscalate={() => undefined}
      />,
    )
    expect(screen.getAllByTestId('signal-row').map((row) => row.textContent)).toEqual(
      screen.getAllByTestId('signal-row').map((row) => row.textContent),
    )
    const before = screen.getAllByTestId('signal-row').map((row) => row.querySelector('span')?.textContent)
    rerender(
      <CopilotStrip
        library={library}
        session={{ ...session, context_chips: session.context_chips.filter((chip) => chip.id !== 'chip.cash_only') }}
        postedChipIds={['chip.on_phone', 'chip.rushed']}
        confirmed={['chip.rushed']}
        dismissed={['chip.cash_only']}
        chipOrder={posted}
        pending={false}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onRestore={() => undefined}
        onEscalate={() => undefined}
      />,
    )
    const afterDismiss = screen.getAllByTestId('signal-row')
    expect(afterDismiss.map((row) => row.querySelector('span')?.textContent)).toEqual(before)
    expect(afterDismiss[1]?.getAttribute('data-state')).toBe('dismissed')
    expect(afterDismiss[2]?.getAttribute('data-state')).toBe('confirmed')
    expect(screen.getByTestId('signal-restore')).toBeTruthy()
    rerender(
      <CopilotStrip
        library={library}
        session={session}
        postedChipIds={posted}
        confirmed={['chip.rushed']}
        dismissed={[]}
        chipOrder={posted}
        pending={false}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onRestore={() => undefined}
        onEscalate={() => undefined}
      />,
    )
    expect(screen.getAllByTestId('signal-row').map((row) => row.querySelector('span')?.textContent)).toEqual(before)
  })
})
