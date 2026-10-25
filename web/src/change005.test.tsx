import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { CustomerFileScreen } from './screens/CustomerFileScreen'
import type { Library, SessionState } from './types'
import { ExplanationPanel } from './workstation/ExplanationPanel'

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
    expect(screen.queryByRole('heading', { name: 'What the teller and system noted' })).toBeNull()
    const raisedRow = screen.getAllByTestId('explain-reason').find((row) => row.textContent?.includes('On the phone'))
    expect(raisedRow?.querySelector('[data-testid="signal-origin"]')?.textContent).toBe('Observed')
    expect(raisedRow?.textContent ?? '').not.toMatch(/sig\.|chip\./)
    const loweredRow = screen.getAllByTestId('explain-counter').find((row) => row.textContent?.includes('Known customer'))
    expect(loweredRow?.querySelector('[data-testid="signal-origin"]')).toBeNull()
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
      <ExplanationPanel
        library={library}
        session={{
          ...base,
          context_chips: [{ id: 'chip.on_phone', source: 'observed' }],
        }}
        postedChipIds={[]}
      />,
    )
    expect(screen.getByTestId('signal-origin').textContent).toBe('Observed')
    rerender(
      <ExplanationPanel
        library={library}
        session={base}
        postedChipIds={['chip.on_phone']}
        confirmed={['chip.on_phone']}
      />,
    )
    expect(screen.getByTestId('signal-origin').textContent).toBe('Teller confirmed')
  })

  it('keeps the customer file on profile facts and leaves signals on Why this level', () => {
    const view = demo()
    render(<CustomerFileScreen demo={view} />)
    expect(screen.getByTestId('profile-name')).toBeTruthy()
    expect(screen.queryByTestId('session-activity')).toBeNull()
    expect(screen.queryByTestId('activity-row')).toBeNull()
    expect(screen.queryByTestId('file-signal')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Recent activity' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'This withdrawal' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'What was noted' })).toBeNull()
  })
})
