import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import t3 from '../../contract/fixtures/T3.json'
import t4 from '../../contract/fixtures/T4.json'
import t5 from '../../contract/fixtures/T5.json'
import t6 from '../../contract/fixtures/T6.json'
import t7 from '../../contract/fixtures/T7.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OutcomeScreen } from './screens/OutcomeScreen'
import { THEMES } from './theme/registry'
import type { OutcomeId, SessionState } from './types'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from './ui/urgencyScore'

const fixtures = [t1, t2, t3, t4, t5, t6, t7]
const HIGHLIGHT_BG = 'rgb(199, 210, 254)'
const OUTCOMES: OutcomeId[] = ['proceed', 'slow_down', 'escalate', 'report']
const LABELS: Record<OutcomeId, string> = {
  proceed: 'Proceed',
  slow_down: 'Slow down',
  escalate: 'Escalate',
  report: 'Report',
}
function asSession(response: unknown): SessionState {
  return response as SessionState
}

describe('Outcome screen', () => {
  it('enables all four outcomes at every fixture step and highlights only the suggestion', () => {
    for (const fixture of fixtures) {
      for (const [index, step] of fixture.steps.entries()) {
        const session = asSession(step.response)
        const where = `${fixture.case} step ${index}`
        const { unmount } = render(<OutcomeScreen session={session} />)

        expect(screen.getByText(URGENCY_SCORE_TERM), where).toBeTruthy()
        expect(screen.getByTestId('outcome-score').textContent, where).toBe(formatUrgencyScore(session.risk.score))
        expect(session.available_outcomes, where).toEqual(OUTCOMES)
        expect(session.suggested_outcome, where).not.toBe('report')

        for (const outcome of OUTCOMES) {
          const button = screen.getByTestId(`outcome-${outcome}`)
          expect((button as HTMLButtonElement).disabled, where).toBe(false)
          expect(button.textContent, where).toBe(LABELS[outcome])
          const highlighted = outcome === session.suggested_outcome
          expect(button.getAttribute('data-highlighted'), where).toBe(highlighted ? 'true' : 'false')
          expect(button.getAttribute('data-suggested'), where).toBe(highlighted ? 'true' : 'false')
          if (highlighted) {
            expect(THEMES.tellr!.highlightBg.toLowerCase(), where).not.toBe('#fef3c7')
            expect(getComputedStyle(button).backgroundColor, where).toBe(HIGHLIGHT_BG)
          } else {
            expect(getComputedStyle(button).backgroundColor, where).not.toBe(HIGHLIGHT_BG)
          }
        }

        const report = screen.getByTestId('outcome-report')
        expect(report.getAttribute('data-highlighted'), where).toBe('false')
        expect(getComputedStyle(report).backgroundColor, where).not.toBe(HIGHLIGHT_BG)
        unmount()
      }
    }
  })

  it('never highlights Report, including when a payload suggests it', () => {
    const session = asSession(t2.steps[0]?.response)
    const forged = { ...session, suggested_outcome: 'report' } as unknown as SessionState
    render(<OutcomeScreen session={forged} />)
    for (const outcome of OUTCOMES) {
      const button = screen.getByTestId(`outcome-${outcome}`)
      expect((button as HTMLButtonElement).disabled).toBe(false)
      expect(button.getAttribute('data-highlighted')).toBe('false')
      expect(getComputedStyle(button).backgroundColor).not.toBe(HIGHLIGHT_BG)
    }
  })

  it('does not submit until an actor is entered', () => {
    const session = asSession(t1.steps[0]?.response)
    const onSubmit = vi.fn()
    render(<OutcomeScreen session={session} onSubmit={onSubmit} />)

    for (const outcome of OUTCOMES) {
      expect((screen.getByTestId(`outcome-${outcome}`) as HTMLButtonElement).disabled).toBe(false)
    }

    fireEvent.click(screen.getByTestId('outcome-escalate'))
    const submit = screen.getByTestId('outcome-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.click(submit)
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByTestId('actor'), { target: { value: '   ' } })
    expect(submit.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('actor'), { target: { value: 'teller-1' } })
    expect(submit.disabled).toBe(false)
    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ outcome: 'escalate', actor: 'teller-1' })
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('note')
  })
})
