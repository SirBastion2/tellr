import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { HomeScreen } from './screens/HomeScreen'
import type { Library, SessionState } from './types'
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

function chipLabel(id: string): string {
  return library.chips.find((chip) => chip.id === id)?.label ?? id
}

function purposeLabel(id: string): string {
  return library.purposes.find((purpose) => purpose.id === id)?.label ?? id
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
  it('shows the server question and posts the contract answer body', () => {
    const onAnswer = vi.fn()
    const { rerender } = render(
      <HomeScreen library={library} session={opener} demo={demo()} onAnswer={onAnswer} />,
    )
    expect(screen.getByTestId('copilot-action').textContent).toBe(opener.question?.text)
    expect(suggestedAction(opener)).toBe(opener.question?.text)
    expect(screen.getByTestId('answer-panel')).toBeTruthy()
    expect(screen.getByTestId('explain-panel')).toBeTruthy()
    expect(screen.getByTestId('purpose-row')).toBeTruthy()

    const relayed = chipLabel('relayed_by_caller')
    fireEvent.click(screen.getByRole('button', { name: relayed }))
    expect(onAnswer).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: purposeLabel('purpose.government_payment') }))
    fireEvent.click(screen.getByRole('button', { name: relayed }))
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith({
      question_id: opener.question?.id,
      chip: 'relayed_by_caller',
      purpose: 'purpose.government_payment',
    })

    rerender(<HomeScreen library={library} session={secrecy} demo={demo()} onAnswer={onAnswer} />)
    expect(screen.getByTestId('copilot-action').textContent).toBe(secrecy.question?.text)
    expect(suggestedAction(secrecy)).toBe(secrecy.question?.text)
    expect(screen.queryByTestId('purpose-row')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: chipLabel('confirmed') }))
    expect(onAnswer).toHaveBeenLastCalledWith({
      question_id: secrecy.question?.id,
      chip: 'confirmed',
    })
    expect(onAnswer.mock.calls.at(-1)?.[0]).not.toHaveProperty('purpose')

    rerender(<HomeScreen library={library} session={afterSecrecy} demo={demo()} onAnswer={onAnswer} />)
    expect(screen.getByTestId('copilot-level').textContent).toBe('High')
    expect(screen.getByTestId('copilot-action').textContent).toBe(afterSecrecy.question?.text)
    expect(suggestedAction(afterSecrecy)).toBe(afterSecrecy.question?.text)
    expect(suggestedAction(afterSecrecy)).not.toBe(opener.question?.text)
  })

  it('hides answer buttons on a hard stop', () => {
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
})
