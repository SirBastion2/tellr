import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { HomeScreen } from './screens/HomeScreen'
import type { Library, SessionState } from './types'
import { DENSITY } from './theme/tokens'
import { formatUrgencyScore } from './ui/urgencyScore'
import { suggestedAction } from './workstation/CopilotStrip'

const library = libraryJson as Library

function asSession(body: unknown): SessionState {
  return body as SessionState
}

function demo(overrides: Partial<DemoView> = {}): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: 'government-impersonation',
    index: 4,
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

const opener = asSession(t1.steps[0]?.response)
const secrecy = asSession(
  t2.steps.find((step) => asSession(step.response).question?.id === 'q.secrecy.told_not_to_tell')?.response,
)
const afterSecrecy = asSession(
  t2.steps.find((step) => (step.request as { question_id?: string }).question_id === 'q.secrecy.told_not_to_tell')
    ?.response,
)

describe('workstation answers', () => {
  it('keeps the server question as suggested action and has no chip answer panel', () => {
    const { rerender } = render(<HomeScreen library={library} session={opener} demo={demo()} />)
    expect(screen.getByTestId('copilot-action').textContent).toBe(opener.question?.text)
    expect(suggestedAction(opener)).toBe(opener.question?.text)
    expect(screen.queryByTestId('answer-panel')).toBeNull()
    expect(screen.queryByText(/How did they answer/i)).toBeNull()
    expect(screen.queryByTestId('answer-chip')).toBeNull()
    expect(screen.queryByTestId('purpose-row')).toBeNull()
    expect(screen.getByTestId('explain-panel')).toBeTruthy()
    expect(screen.getByTestId('copilot-score').textContent).toBe(formatUrgencyScore(opener.risk.score))
    expect(screen.getByTestId('explain-score').textContent).toBe(formatUrgencyScore(opener.risk.score))
    expect(screen.getByTestId('explain-level').textContent).toBe('Clear')
    expect(screen.queryByText('Shown level')).toBeNull()
    expect(screen.queryByText('Raw level')).toBeNull()

    rerender(<HomeScreen library={library} session={secrecy} demo={demo()} />)
    expect(screen.getByTestId('copilot-action').textContent).toBe(secrecy.question?.text)
    expect(suggestedAction(secrecy)).toBe(secrecy.question?.text)
    expect(screen.queryByTestId('answer-panel')).toBeNull()

    rerender(<HomeScreen library={library} session={afterSecrecy} demo={demo()} />)
    expect(screen.getByTestId('copilot-level').textContent).toBe('High')
    expect(screen.getByTestId('copilot-action').textContent).toBe(afterSecrecy.question?.text)
    expect(suggestedAction(afterSecrecy)).toBe(afterSecrecy.question?.text)
    expect(suggestedAction(afterSecrecy)).not.toBe(opener.question?.text)
  })

  it('keeps suggested action on a hard stop and still has no answer chips', () => {
    const stopped: SessionState = {
      ...opener,
      question: null,
      stop: { kind: 'hard', reason: 'enough to escalate' },
      talk_track: { ...opener.talk_track, lines: ['Pause and call the supervisor.'] },
    }
    render(<HomeScreen library={library} session={stopped} demo={demo()} />)
    expect(screen.getByTestId('copilot-action').textContent).toBe('Pause and call the supervisor.')
    expect(screen.queryByTestId('answer-panel')).toBeNull()
    expect(screen.queryByTestId('answer-chip')).toBeNull()
  })

  it('shows one Level row and a raw row only when the server values differ', () => {
    const split: SessionState = {
      ...opener,
      risk: { ...opener.risk, level: 'caution', raw_level: 'high' },
    }
    const { rerender } = render(<HomeScreen library={library} session={opener} demo={demo()} />)
    expect(screen.getByTestId('explain-level').textContent).toBe('Clear')
    expect(screen.queryByTestId('explain-raw-level')).toBeNull()
    rerender(<HomeScreen library={library} session={split} demo={demo()} />)
    expect(screen.getByTestId('explain-level').textContent).toBe('Caution')
    expect(screen.getByTestId('explain-raw-level').textContent).toBe('High')
    expect(screen.getByText('Raw level (before display rules)')).toBeTruthy()
  })

  it('keeps teller confirm and deny on the copilot chips, not on Why this level', () => {
    const onConfirm = vi.fn()
    const onDismiss = vi.fn()
    const visit: SessionState = {
      ...opener,
      context_chips: [{ id: 'chip.on_phone', source: 'observed' }],
    }
    render(
      <HomeScreen
        library={library}
        session={visit}
        postedChipIds={['chip.on_phone']}
        demo={demo({ onConfirmSignal: onConfirm, onDismissSignal: onDismiss })}
      />,
    )
    const card = screen.getByTestId('copilot-strip')
    const panel = screen.getByTestId('explain-panel')
    expect(card.querySelector('[data-testid="signal-confirm"]')).toBeTruthy()
    expect(card.querySelector('[data-testid="signal-dismiss"]')).toBeTruthy()
    expect(panel.querySelector('[data-testid="signal-confirm"]')).toBeNull()
    expect(panel.querySelector('[data-testid="signal-dismiss"]')).toBeNull()
    expect(panel.querySelector('[data-testid="signal-restore"]')).toBeNull()
    fireEvent.click(screen.getByTestId('signal-confirm'))
    fireEvent.click(screen.getByTestId('signal-dismiss'))
    expect(onConfirm).toHaveBeenCalledWith('chip.on_phone')
    expect(onDismiss).toHaveBeenCalledWith('chip.on_phone')
  })

  it('centers confirm and dismiss icons in the round signal buttons', () => {
    const visit: SessionState = {
      ...opener,
      context_chips: [{ id: 'chip.on_phone', source: 'observed' }],
    }
    render(
      <HomeScreen
        library={library}
        session={visit}
        postedChipIds={['chip.on_phone']}
        demo={demo({ onConfirmSignal: () => undefined, onDismissSignal: () => undefined })}
      />,
    )
    const confirm = screen.getByTestId('signal-confirm')
    const dismiss = screen.getByTestId('signal-dismiss')
    for (const button of [confirm, dismiss]) {
      expect(button.style.display).toBe('grid')
      expect(button.style.placeItems).toBe('center')
      expect(button.style.justifyContent).toBe('center')
      expect(button.style.alignContent).toBe('center')
      expect(button.style.lineHeight).toBe('1')
      expect(button.style.padding).toBe('0px')
      expect(button.style.width).toBe(DENSITY.controlHeight)
      expect(button.style.height).toBe(DENSITY.controlHeight)
      expect(button.style.minWidth).toBe(DENSITY.controlHeight)
      expect(button.style.minHeight).toBe(DENSITY.controlHeight)
      expect(button.style.borderRadius).toBe('var(--tc-radius-control, 999px)')
      expect(button.style.boxSizing).toBe('border-box')
      const svg = button.querySelector('svg')
      expect(svg?.getAttribute('width')).toBe('18')
      expect(svg?.getAttribute('height')).toBe('18')
      expect(button.childElementCount).toBe(1)
    }
    expect(confirm.style.backgroundColor).toBe('var(--tc-button, transparent)')
    expect(confirm.style.color).toBe('var(--tc-button-text, #1c1917)')
    expect(confirm.style.borderColor).toBe('transparent')
    expect(dismiss.style.backgroundColor).toBe('var(--tc-secondary-bg, #f8fafc)')
    expect(dismiss.style.color).toBe('var(--tc-secondary-fg, #1c1917)')
    expect(dismiss.style.borderColor).toBe('var(--tc-secondary-border, #1c1917)')
    expect(confirm.querySelector('path')?.getAttribute('d')).toBe('M4.5 12l5 5L19.5 7')
    expect(dismiss.querySelector('path')?.getAttribute('d')).toBe('M7 7l10 10M17 7L7 17')
  })
})
