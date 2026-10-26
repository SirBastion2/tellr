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
import { themeForScheme } from './theme/palette'
import { THEMES } from './theme/registry'
import { ThemeProvider } from './theme/ThemeProvider'
import { COLOR_STORAGE_KEY, THEME_STORAGE_KEY } from './theme/tokens'
import type { OutcomeId, SessionState } from './types'
const fixtures = [t1, t2, t3, t4, t5, t6, t7]
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

function hexRgb(hex: string): string {
  const body = hex.replace('#', '')
  const full = body.length === 3 ? body.split('').map((part) => part + part).join('') : body
  return `rgb(${parseInt(full.slice(0, 2), 16)}, ${parseInt(full.slice(2, 4), 16)}, ${parseInt(full.slice(4, 6), 16)})`
}

const RECOMMENDATION = "Copilot's recommendation"

describe('Outcome screen', () => {
  it('enables all four outcomes at every fixture step and highlights only the suggestion', () => {
    for (const fixture of fixtures) {
      for (const [index, step] of fixture.steps.entries()) {
        const session = asSession(step.response)
        const where = `${fixture.case} step ${index}`
        const { unmount } = render(<OutcomeScreen session={session} />)

        expect(screen.getByText('Urgency'), where).toBeTruthy()
        expect(screen.getByTestId('outcome-score').textContent, where).toContain(`${session.risk.score}%`)
        expect(screen.getByTestId('outcome-score').textContent, where).not.toMatch(/\//)
        expect(screen.getByTestId('outcome-answers').textContent, where).toBe(`${session.answers} Questions Answered`)
        expect(session.available_outcomes, where).toEqual(OUTCOMES)
        expect(session.suggested_outcome, where).not.toBe('report')

        for (const outcome of OUTCOMES) {
          const button = screen.getByTestId(`outcome-${outcome}`)
          expect((button as HTMLButtonElement).disabled, where).toBe(false)
          expect(button.querySelector('.tc-outcome-name')?.textContent, where).toBe(LABELS[outcome])
          const highlighted = outcome === session.suggested_outcome
          expect(button.getAttribute('title'), where).toBe(highlighted ? "Copilot's recommendation" : null)
          expect(button.getAttribute('aria-pressed'), where).toBe('false')
          expect(button.getAttribute('data-highlighted'), where).toBe(highlighted ? 'true' : 'false')
          expect(button.getAttribute('data-suggested'), where).toBe(highlighted ? 'true' : 'false')
          if (highlighted) {
            expect(THEMES.tellr!.highlightBg.toLowerCase(), where).not.toBe('#fef3c7')
            expect(getComputedStyle(button).borderTopColor, where).toBe(hexRgb(THEMES.tellr!.highlightBg))
            expect(getComputedStyle(button).backgroundColor, where).toBe(hexRgb(THEMES.tellr!.surface))
            expect(getComputedStyle(button).color, where).toBe(hexRgb(THEMES.tellr!.text))
          } else {
            expect(getComputedStyle(button).borderTopColor, where).not.toBe(hexRgb(THEMES.tellr!.highlightBg))
            expect(getComputedStyle(button).backgroundColor, where).not.toBe(hexRgb(THEMES.tellr!.highlightBg))
          }
        }

        const report = screen.getByTestId('outcome-report')
        expect(report.getAttribute('data-highlighted'), where).toBe('false')
        expect(getComputedStyle(report).borderTopColor, where).not.toBe(hexRgb(THEMES.tellr!.highlightBg))
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
      expect(getComputedStyle(button).borderTopColor).not.toBe(hexRgb(THEMES.tellr!.highlightBg))
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
    expect(submit.getAttribute('aria-label')).toBe('Record decision')
    expect(screen.getByTestId('actor').getAttribute('placeholder')).toBe('Type your Name here...')
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

  it('marks the teller choice and keeps the copilot recommendation visible', () => {
    const session = asSession(t1.steps[1]?.response)
    expect(session.suggested_outcome).toBe('slow_down')
    const { rerender } = render(<OutcomeScreen session={session} />)

    expect(screen.queryByTestId('outcome-help')).toBeNull()

    const suggested = screen.getByTestId('outcome-slow_down')
    const chosen = screen.getByTestId('outcome-proceed')
    expect(suggested.getAttribute('data-highlighted')).toBe('true')
    expect(suggested.getAttribute('aria-pressed')).toBe('false')
    expect(suggested.textContent).toContain(RECOMMENDATION)
    expect(suggested.getAttribute('title')).toBe(RECOMMENDATION)
    expect(suggested.querySelector('[data-testid="outcome-check"]')).toBeNull()
    expect(chosen.style.borderRadius).toContain('28px')
    expect(suggested.style.borderRadius).toBe(chosen.style.borderRadius)

    fireEvent.click(chosen)
    expect(chosen.getAttribute('aria-pressed')).toBe('true')
    expect(chosen.getAttribute('data-selected')).toBe('true')
    expect(chosen.querySelector('[data-testid="outcome-check"]')).toBeTruthy()
    expect(getComputedStyle(chosen).backgroundColor).toBe(hexRgb(THEMES.tellr!.button))
    expect(getComputedStyle(chosen).color).toBe(hexRgb(THEMES.tellr!.buttonText))
    expect(suggested.getAttribute('aria-pressed')).toBe('false')
    expect(suggested.getAttribute('data-highlighted')).toBe('true')
    expect(suggested.textContent).toContain(RECOMMENDATION)
    expect(getComputedStyle(suggested).backgroundColor).toBe(hexRgb(THEMES.tellr!.surface))
    expect(getComputedStyle(suggested).color).toBe(hexRgb(THEMES.tellr!.text))
    expect(getComputedStyle(suggested).borderTopColor).toBe(hexRgb(THEMES.tellr!.highlightBg))
    for (const outcome of OUTCOMES) {
      expect((screen.getByTestId(`outcome-${outcome}`) as HTMLButtonElement).disabled).toBe(false)
    }

    fireEvent.keyDown(screen.getByTestId('outcome-escalate'), { key: 'Enter' })
    expect(screen.getByTestId('outcome-escalate').getAttribute('aria-pressed')).toBe('true')
    expect(chosen.getAttribute('aria-pressed')).toBe('false')
    fireEvent.keyDown(screen.getByTestId('outcome-report'), { key: ' ' })
    expect(screen.getByTestId('outcome-report').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('outcome-report').getAttribute('data-highlighted')).toBe('false')
    expect(screen.getByTestId('outcome-report').textContent).not.toContain(RECOMMENDATION)

    fireEvent.click(suggested)
    expect(suggested.getAttribute('aria-pressed')).toBe('true')
    expect(suggested.getAttribute('data-selected')).toBe('true')
    expect(suggested.querySelector('[data-testid="outcome-check"]')).toBeTruthy()
    expect(suggested.textContent).toContain(RECOMMENDATION)
    expect(getComputedStyle(suggested).backgroundColor).toBe(hexRgb(THEMES.tellr!.button))
    expect(getComputedStyle(suggested).backgroundColor).not.toBe(hexRgb(THEMES.tellr!.highlightBg))

    rerender(<OutcomeScreen session={{ ...session }} />)
    expect(screen.getByTestId('outcome-slow_down').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('outcome-slow_down').querySelector('[data-testid="outcome-check"]')).toBeTruthy()
  })

  it('keeps the posted outcome selected across a re-render', () => {
    const session = asSession(t2.steps[0]?.response)
    const { rerender } = render(<OutcomeScreen session={session} />)
    fireEvent.click(screen.getByTestId('outcome-proceed'))
    expect(screen.getByTestId('outcome-proceed').getAttribute('aria-pressed')).toBe('true')

    rerender(<OutcomeScreen session={{ ...session }} recordedOutcome="report" />)
    const report = screen.getByTestId('outcome-report')
    expect(report.getAttribute('aria-pressed')).toBe('true')
    expect(report.getAttribute('data-selected')).toBe('true')
    expect(report.querySelector('[data-testid="outcome-check"]')).toBeTruthy()
    expect(screen.getByTestId('outcome-proceed').getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(screen.getByTestId('outcome-escalate'))
    fireEvent.keyDown(screen.getByTestId('outcome-proceed'), { key: 'Enter' })
    expect(screen.getByTestId('outcome-report').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('outcome-escalate').getAttribute('aria-pressed')).toBe('false')

    rerender(
      <OutcomeScreen
        session={{ ...session }}
        recordedOutcome="report"
        recorded={{ outcome: 'escalate', actor: 'teller-1' }}
      />,
    )
    expect(screen.getByTestId('outcome-escalate').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('outcome-report').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByTestId('outcome-escalate').querySelector('[data-testid="outcome-check"]')).toBeTruthy()
  })

  it('uses the same selected and suggested treatment on every bank', () => {
    const session = asSession(t1.steps[1]?.response)
    expect(session.suggested_outcome).not.toBe('proceed')
    for (const id of ['tellr', 'pnc', 'mtb', 'fnb'] as const) {
      for (const scheme of ['dark', 'light'] as const) {
        window.history.replaceState({}, '', `/?theme=${id}`)
        window.localStorage.setItem(THEME_STORAGE_KEY, id)
        window.localStorage.setItem(COLOR_STORAGE_KEY, scheme)
        const painted = themeForScheme(THEMES[id]!, scheme)
        const { unmount } = render(
          <ThemeProvider>
            <OutcomeScreen session={session} />
          </ThemeProvider>,
        )
        const where = `${id} ${scheme}`
        const suggested = screen.getByTestId('outcome-slow_down')
        const other = screen.getByTestId('outcome-proceed')
        expect(suggested.textContent, where).toContain(RECOMMENDATION)
        expect(suggested.getAttribute('title'), where).toBe(RECOMMENDATION)
        expect(other.getAttribute('title'), where).toBeNull()
        expect(other.style.borderRadius, where).toContain('28px')
        expect(suggested.style.borderRadius, where).toBe(other.style.borderRadius)
        expect(suggested.className, where).toBe(other.className)
        fireEvent.click(other)
        expect(other.getAttribute('aria-pressed'), where).toBe('true')
        expect(other.querySelector('[data-testid="outcome-check"]'), where).toBeTruthy()
        expect(getComputedStyle(other).backgroundColor, where).toBe(hexRgb(painted.button))
        expect(getComputedStyle(other).color, where).toBe(hexRgb(painted.buttonText))
        expect(suggested.getAttribute('aria-pressed'), where).toBe('false')
        expect(getComputedStyle(suggested).backgroundColor, where).toBe(hexRgb(painted.surface))
        expect(getComputedStyle(suggested).color, where).toBe(hexRgb(painted.text))
        expect(getComputedStyle(suggested).borderTopColor, where).toBe(hexRgb(painted.highlightBg))
        expect(suggested.querySelector('.tc-text-xs')?.textContent, where).toBe(RECOMMENDATION)
        unmount()
      }
    }
  })
})
