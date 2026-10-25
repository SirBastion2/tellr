import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Library, SessionState } from './types'
import { CopilotStrip } from './workstation/CopilotStrip'
import { ExplanationPanel } from './workstation/ExplanationPanel'

const library = libraryJson as Library
const base = t1.steps[0]?.response as SessionState

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
    expect(raisedRow?.querySelector('.tc-factor-strength')?.textContent).toMatch(/Strong factor/)
    expect(raisedRow?.querySelector('.tc-meter')).toBeTruthy()
    expect(raisedRow?.querySelector('[data-testid="signal-origin"]')).toBeNull()
    expect(raisedRow?.textContent ?? '').not.toMatch(/sig\.|chip\./)
    const loweredRow = screen.getAllByTestId('explain-counter').find((row) => row.textContent?.includes('Known customer'))
    expect(loweredRow?.querySelector('[data-testid="signal-origin"]')).toBeNull()
  })

  it('renders the strength word and bar for a weighted factor and no Observed badge in What raised it', () => {
    render(
      <ExplanationPanel
        library={library}
        session={{
          ...base,
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
          context_chips: [{ id: 'chip.on_phone', source: 'observed' }],
        }}
        postedChipIds={['chip.on_phone']}
      />,
    )
    const raisedRow = screen.getAllByTestId('explain-reason').find((row) => row.textContent?.includes('On the phone'))
    expect(raisedRow).toBeTruthy()
    const word = raisedRow?.querySelector('.tc-factor-strength')
    expect(word?.textContent?.replace(/\s+/g, ' ').trim()).toBe('↑ Strong factor')
    const meter = raisedRow?.querySelector('.tc-meter')
    expect(meter?.getAttribute('role')).toBe('meter')
    expect(meter?.getAttribute('aria-label')).toBe('Strong factor')
    expect(meter?.querySelector('span')?.getAttribute('style')).toMatch(/78%/)
    const head = raisedRow?.querySelector('.tc-factor-head')
    expect(head && meter && (head.compareDocumentPosition(meter) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy()
    expect(raisedRow?.querySelector('[data-testid="signal-origin"]')).toBeNull()
    expect(raisedRow?.textContent).not.toMatch(/Observed/)
    const raisedList = screen.getAllByTestId('explain-reason').map((row) => row.textContent ?? '').join('\n')
    expect(raisedList).not.toMatch(/Observed/)
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

  it('badges signal source from context_chips on the model list', () => {
    const { rerender } = render(
      <ExplanationPanel
        library={library}
        session={{
          ...base,
          risk: {
            ...base.risk,
            reasons: [],
            counterpoint: {
              id: 'sig.third_party_call',
              label: 'On the phone during the visit',
              rationale: 'Scammers often stay on the line.',
            },
          },
          context_chips: [{ id: 'chip.on_phone', source: 'observed' }],
        }}
        postedChipIds={['chip.on_phone']}
      />,
    )
    const observedRow = screen.getByTestId('explain-reason')
    expect(observedRow.textContent).toMatch(/On the phone during the visit/)
    expect(observedRow.querySelector('[data-testid="signal-origin"]')).toBeNull()
    rerender(
      <ExplanationPanel
        library={library}
        session={{
          ...base,
          risk: {
            ...base.risk,
            reasons: [],
            counterpoint: {
              id: 'sig.third_party_call',
              label: 'On the phone during the visit',
              rationale: 'Scammers often stay on the line.',
            },
          },
          context_chips: [{ id: 'chip.on_phone', source: 'teller' }],
        }}
        postedChipIds={['chip.on_phone']}
      />,
    )
    expect(screen.getByTestId('signal-origin').textContent).toBe('Teller confirmed')
  })

  it('keeps teller signal chips in first-seen order after dismiss and confirm', () => {
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
    const ids = () => screen.getAllByTestId('signal-row').map((row) => row.getAttribute('data-chip'))
    expect(ids()).toEqual(posted)
    rerender(
      <CopilotStrip
        library={library}
        session={{
          ...session,
          context_chips: session.context_chips.filter((chip) => chip.id !== 'chip.cash_only'),
        }}
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
    expect(ids()).toEqual(posted)
    expect(screen.getAllByTestId('signal-row')[1]?.getAttribute('data-state')).toBe('dismissed')
    expect(screen.getByTestId('signal-restore')).toBeTruthy()
  })
})
