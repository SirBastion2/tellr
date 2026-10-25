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
  it('hides confidence when explanation is absent or null', () => {
    const { rerender } = render(
      <ExplanationPanel library={library} session={base} postedChipIds={[]} />,
    )
    expect(screen.queryByTestId('explain-gap')).toBeNull()
    expect(screen.queryByText(/not in this response/)).toBeNull()
    expect(screen.queryByTestId('explain-confidence')).toBeNull()
    rerender(
      <ExplanationPanel library={library} session={{ ...base, explanation: null }} postedChipIds={[]} />,
    )
    expect(screen.queryByTestId('explain-gap')).toBeNull()
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
    expect(screen.queryByTestId('explain-fallback')).toBeNull()
    expect(screen.queryByText(/use the fallback/)).toBeNull()
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

  it('renders strength for every weighted contribution and omits Observed when the response has no weights', () => {
    const labels = [
      'Mentioned urgency or secrecy',
      'Someone else directing them',
      'On the phone during the visit',
    ]
    const reasons = [
      {
        id: 'sig.urgency_secrecy_mentioned',
        label: labels[0] ?? '',
        rationale: 'Being told to hurry or keep quiet is a hallmark of coaching.',
      },
      {
        id: 'sig.someone_directing',
        label: labels[1] ?? '',
        rationale: 'Another person steering the transaction can mean the customer is not acting freely.',
      },
      {
        id: 'sig.third_party_call',
        label: labels[2] ?? '',
        rationale: 'Scammers often stay on the line to coach the customer through the withdrawal.',
      },
    ]
    const chips = [
      { id: 'chip.urgency_secrecy', source: 'observed' as const },
      { id: 'chip.someone_directing', source: 'observed' as const },
      { id: 'chip.on_phone', source: 'observed' as const },
      { id: 'chip.cash_only', source: 'teller' as const },
      { id: 'chip.rushed', source: 'observed' as const },
    ]
    const posted = chips.map((chip) => chip.id)
    const unweighted = {
      ...base,
      risk: {
        ...base.risk,
        level: 'caution' as const,
        raw_level: 'caution' as const,
        score: 45,
        reasons,
        counterpoint: null,
      },
      context_chips: chips,
    }
    const { rerender } = render(
      <ExplanationPanel library={library} session={unweighted} postedChipIds={posted} />,
    )
    const plainRows = screen.getAllByTestId('explain-reason')
    expect(plainRows.map((row) => row.querySelector('strong')?.textContent)).toEqual(labels)
    for (const row of plainRows) {
      expect(row.querySelector('.tc-factor-strength')).toBeNull()
      expect(row.querySelector('.tc-meter')).toBeNull()
      expect(row.querySelector('[data-testid="signal-origin"]')).toBeNull()
      expect(row.textContent).not.toMatch(/Observed/)
    }
    expect(screen.queryByTestId('explain-gap')).toBeNull()

    rerender(
      <ExplanationPanel
        library={library}
        session={{
          ...unweighted,
          explanation: {
            confidence: null,
            used_fallback: false,
            contributions: [
              { signal_id: 'sig.urgency_secrecy_mentioned', label: labels[0] ?? '', weight: 18, direction: 'raises' },
              { signal_id: 'sig.someone_directing', label: labels[1] ?? '', weight: 16, direction: 'raises' },
              { signal_id: 'sig.third_party_call', label: labels[2] ?? '', weight: 14, direction: 'raises' },
              { signal_id: 'sig.cash_insistence', label: 'Insists on cash', weight: 12, direction: 'raises' },
              { signal_id: 'sig.rushed', label: 'Seems rushed', weight: 6, direction: 'raises' },
            ],
          },
        }}
        postedChipIds={posted}
      />,
    )
    expect(screen.queryByTestId('explain-gap')).toBeNull()
    const weighted = screen.getAllByTestId('explain-reason')
    expect(weighted).toHaveLength(5)
    const words = weighted.map((row) =>
      row.querySelector('.tc-factor-strength')?.textContent?.replace(/\s+/g, ' ').trim(),
    )
    expect(words).toEqual([
      '↑ Moderate factor',
      '↑ Moderate factor',
      '↑ Moderate factor',
      '↑ Moderate factor',
      '↑ Minor factor',
    ])
    const widths = weighted.map((row) => row.querySelector('.tc-meter span')?.getAttribute('style'))
    expect(widths).toEqual(['width: 27%;', 'width: 24%;', 'width: 21%;', 'width: 18%;', 'width: 9%;'])
    const cash = weighted.find((row) => row.textContent?.includes('Insists on cash'))
    expect(cash?.querySelector('[data-testid="signal-origin"]')?.textContent).toBe('Teller confirmed')
    for (const row of weighted) {
      if (row === cash) {
        continue
      }
      expect(row.querySelector('[data-testid="signal-origin"]')).toBeNull()
      expect(row.textContent).not.toMatch(/Observed/)
    }
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
    expect(screen.queryByTestId('explain-gap')).toBeNull()
    expect(screen.queryByText(/not in this response/)).toBeNull()
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
    expect(screen.queryByTestId('explain-fallback')).toBeNull()
    expect(screen.queryByText(/use the fallback/)).toBeNull()
    expect(screen.queryByTestId('explain-contribution')).toBeNull()
    expect(screen.queryByText(/no contributions/)).toBeNull()
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
