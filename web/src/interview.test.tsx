import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import t3 from '../../contract/fixtures/T3.json'
import t4 from '../../contract/fixtures/T4.json'
import t5 from '../../contract/fixtures/T5.json'
import t6 from '../../contract/fixtures/T6.json'
import t7 from '../../contract/fixtures/T7.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './App'
import { InterviewScreen } from './screens/InterviewScreen'
import type { Library, SessionState } from './types'
import { TYPE_SIZE } from './theme/typeScale'
import { formatUrgencyScore } from './ui/urgencyScore'

const library = libraryJson as Library
const fixtures = [t1, t2, t3, t4, t5, t6, t7]

const LEVEL_ORDER = ['clear', 'caution', 'high'] as const
const LEVEL_TEXT = { clear: 'Clear', caution: 'Caution', high: 'High' } as const
const LEVEL_COLOUR = {
  clear: 'rgb(22, 101, 52)',
  caution: 'rgb(180, 83, 9)',
  high: 'rgb(153, 27, 27)',
} as const

function asSession(response: unknown): SessionState {
  return response as SessionState
}

function answerSteps(fixture: (typeof fixtures)[number]): SessionState[] {
  return fixture.steps.filter((step) => step.endpoint.endsWith('/answers')).map((step) => asSession(step.response))
}

function chipLabel(id: string): string {
  const chip = library.chips.find((item) => item.id === id)
  if (!chip) {
    throw new Error(`chip ${id} missing from library`)
  }
  return chip.label
}

function counterpointPrefix(level: SessionState['risk']['level']): string {
  return level === 'clear' ? 'Still noted:' : 'In their favor:'
}

describe('Interview screen', () => {
  it('renders every fixture step from the server fields', () => {
    for (const fixture of fixtures) {
      for (const [index, step] of fixture.steps.entries()) {
        const session = asSession(step.response)
        const where = `${fixture.case} step ${index}`
        const { unmount } = render(<InterviewScreen library={library} session={session} />)

        const level = screen.getByTestId('risk-level')
        expect(level.textContent, where).toBe(LEVEL_TEXT[session.risk.level])
        expect(level.getAttribute('data-level'), where).toBe(session.risk.level)
        expect(level.getAttribute('data-position'), where).toBe(String(LEVEL_ORDER.indexOf(session.risk.level)))
        expect(getComputedStyle(level).color, where).toBe(LEVEL_COLOUR[session.risk.level])

        const slots = screen.getAllByTestId('level-slot')
        expect(slots.map((slot) => slot.getAttribute('data-level')), where).toEqual([...LEVEL_ORDER])
        const active = slots.filter((slot) => slot.getAttribute('data-active') === 'true')
        expect(active, where).toHaveLength(1)
        const activeSlot = active[0]
        if (!activeSlot) {
          throw new Error(`${where}: no active level`)
        }
        expect(activeSlot.getAttribute('data-level'), where).toBe(session.risk.level)
        expect(activeSlot.getAttribute('data-position'), where).toBe(String(LEVEL_ORDER.indexOf(session.risk.level)))
        expect(getComputedStyle(activeSlot).backgroundColor, where).toBe(LEVEL_COLOUR[session.risk.level])
        for (const slot of slots) {
          if (slot !== activeSlot) {
            expect(getComputedStyle(slot).backgroundColor, where).not.toBe(LEVEL_COLOUR[session.risk.level])
          }
        }

        const pattern = screen.getByTestId('pattern-label')
        expect(pattern.textContent, where).toBe(session.risk.pattern_label)
        expect(level.compareDocumentPosition(pattern) & Node.DOCUMENT_POSITION_FOLLOWING, where).not.toBe(0)
        expect(pattern.className, where).toContain('tc-fact-value')
        expect(level.className, where).toContain('tc-text-2xl')
        expect(parseFloat(TYPE_SIZE.sm), where).toBeLessThan(parseFloat(TYPE_SIZE['2xl']))

        expect(screen.getByTestId('risk-score').textContent, where).toBe(formatUrgencyScore(session.risk.score))

        const reasons = screen.queryAllByTestId('reason')
        expect(reasons.length, where).toBeLessThanOrEqual(3)
        expect(reasons.map((reason) => reason.textContent), where).toEqual(
          session.risk.reasons.map((reason) => reason.label),
        )

        if (session.risk.counterpoint) {
          const line = screen.getByTestId('counterpoint')
          expect(line.tagName, where).toBe('P')
          expect(line.closest('[data-testid="reason-list"]'), where).toBeNull()
          expect(line.textContent?.startsWith(counterpointPrefix(session.risk.level)), where).toBe(true)
          expect(line.textContent, where).toContain(session.risk.counterpoint.label)
        } else {
          expect(screen.queryByTestId('counterpoint'), where).toBeNull()
        }

        if (session.stated_purpose) {
          const purpose = library.purposes.find((item) => item.id === session.stated_purpose)
          expect(screen.getByTestId('stated-purpose').textContent, where).toBe(purpose?.label)
        } else {
          expect(screen.queryByTestId('stated-purpose'), where).toBeNull()
        }

        if (session.question) {
          expect(screen.getByTestId('question-text').textContent, where).toBe(session.question.text)
          expect(screen.getByTestId('question-why').textContent, where).toBe(session.question.why)
          const row = screen.getByTestId('chip-row')
          expect(row.childElementCount, where).toBe(5)
          expect(getComputedStyle(row).height, where).toBe('72px')
          expect(screen.getAllByTestId('answer-chip').map((chip) => chip.textContent), where).toEqual(
            session.question.chips.map((id) => chipLabel(id)),
          )
          if (session.question.stage === 'opener') {
            const purposes = screen.getAllByTestId('purpose')
            expect(purposes.map((purpose) => purpose.textContent), where).toEqual(
              library.purposes.map((purpose) => purpose.label),
            )
            const firstPurpose = purposes[0]
            if (!firstPurpose) {
              throw new Error(`${where}: opener has no purposes`)
            }
            expect(firstPurpose.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING, where).not.toBe(0)
          } else {
            expect(screen.queryByTestId('purpose'), where).toBeNull()
          }
          if (session.stop?.kind === 'recommended') {
            expect(screen.getByTestId('recommended-stop').textContent, where).toBe(
              'You have enough to decide, or ask one more',
            )
            expect(Number(getComputedStyle(screen.getByTestId('question-card')).opacity), where).toBeLessThan(1)
          } else {
            expect(screen.queryByTestId('recommended-stop'), where).toBeNull()
            expect(Number(getComputedStyle(screen.getByTestId('question-card')).opacity), where).toBe(1)
          }
          expect(screen.queryByTestId('hard-stop'), where).toBeNull()
        } else {
          expect(session.stop?.kind, where).toBe('hard')
          expect(screen.queryByTestId('question-card'), where).toBeNull()
          expect(screen.queryByTestId('question-text'), where).toBeNull()
          expect(screen.queryByTestId('chip-row'), where).toBeNull()
          expect(screen.getByTestId('hard-stop'), where).toBeTruthy()
        }

        unmount()
      }
    }
  })

  it('T1 after the first answer shows Caution at score 16', () => {
    const session = answerSteps(t1)[0]
    if (!session) {
      throw new Error('T1 has no first answer')
    }
    expect(session.answers).toBe(1)
    expect(session.risk.raw_level).toBe('clear')
    render(<InterviewScreen library={library} session={session} />)
    const level = screen.getByTestId('risk-level')
    expect(level.textContent).toBe('Caution')
    expect(level.getAttribute('data-level')).toBe('caution')
    expect(screen.getByTestId('risk-score').textContent).toBe(formatUrgencyScore(16))
    const active = screen.getAllByTestId('level-slot').find((slot) => slot.getAttribute('data-active') === 'true')
    expect(active?.getAttribute('data-level')).toBe('caution')
    expect(active?.textContent).toBe('Caution')
  })

  it('T3 after the third answer shows Looks like: bank impersonation', () => {
    const session = answerSteps(t3)[2]
    if (!session) {
      throw new Error('T3 has no third answer')
    }
    expect(session.answers).toBe(3)
    render(<InterviewScreen library={library} session={session} />)
    expect(screen.getByTestId('pattern-label').textContent).toBe('Looks like: bank impersonation')
    expect(screen.getByTestId('risk-level').textContent).toBe('Caution')
  })

  it("T6's last step is a hard stop with no question", () => {
    const session = asSession(t6.steps.at(-1)?.response)
    expect(session.stop?.kind).toBe('hard')
    expect(session.question).toBeNull()
    render(<InterviewScreen library={library} session={session} />)
    expect(screen.getByTestId('hard-stop')).toBeTruthy()
    expect(screen.queryByTestId('question-card')).toBeNull()
    expect(screen.queryByTestId('question-text')).toBeNull()
    expect(screen.queryByTestId('question-why')).toBeNull()
    expect(screen.queryByTestId('chip-row')).toBeNull()
    expect(screen.queryByTestId('recommended-stop')).toBeNull()
  })

  it('capitalizes only the first letter of the hard-stop reason', () => {
    const session = structuredClone(asSession(t6.steps.at(-1)?.response))
    expect(session.stop?.kind).toBe('hard')
    session.stop = { kind: 'hard', reason: 'enough to escalate; nothing left to ask' }
    render(<InterviewScreen library={library} session={session} />)
    const stop = screen.getByTestId('hard-stop')
    expect(stop.getAttribute('data-reason')).toBe('enough to escalate; nothing left to ask')
    expect(stop.textContent).toBe('Enough to escalate; nothing left to ask')
  })

  it('posts purpose and chip from the opener, then chip alone', () => {
    const onAnswer = vi.fn()
    const opener = asSession(t1.steps[0]?.response)
    const purpose = library.purposes[0]
    const chipId = opener.question?.chips[0]
    if (!purpose || !chipId || !opener.question) {
      throw new Error('opener fixture is incomplete')
    }
    const { rerender } = render(<InterviewScreen library={library} session={opener} onAnswer={onAnswer} />)
    fireEvent.click(screen.getByRole('button', { name: chipLabel(chipId) }))
    expect(onAnswer).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: purpose.label }))
    fireEvent.click(screen.getByRole('button', { name: chipLabel(chipId) }))
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith({
      question_id: opener.question.id,
      chip: chipId,
      purpose: purpose.id,
    })

    const later = answerSteps(t1)[0]
    const laterChip = later?.question?.chips[1]
    if (!later?.question || !laterChip) {
      throw new Error('T1 follow-up question missing')
    }
    rerender(<InterviewScreen library={library} session={later} onAnswer={onAnswer} />)
    expect(screen.queryByTestId('purpose')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: chipLabel(laterChip) }))
    expect(onAnswer).toHaveBeenLastCalledWith({
      question_id: later.question.id,
      chip: laterChip,
    })
    expect(onAnswer.mock.calls.at(-1)?.[0]).not.toHaveProperty('purpose')
  })

  it('reads answer-chip and purpose labels from the library', () => {
    const session = asSession(t1.steps[0]?.response)
    const altered = structuredClone(library)
    const chipId = session.question?.chips[0]
    const chip = altered.chips.find((item) => item.id === chipId)
    const purpose = altered.purposes[0]
    if (!chip || !purpose) {
      throw new Error('library missing chip or purpose')
    }
    const originalChip = chip.label
    const originalPurpose = purpose.label
    chip.label = 'SENTINEL_CHIP_LABEL'
    purpose.label = 'SENTINEL_PURPOSE_LABEL'
    render(<InterviewScreen library={altered} session={session} />)
    expect(screen.getByText('SENTINEL_CHIP_LABEL')).toBeTruthy()
    expect(screen.getByText('SENTINEL_PURPOSE_LABEL')).toBeTruthy()
    expect(screen.queryByText(originalChip)).toBeNull()
    expect(screen.queryByText(originalPurpose)).toBeNull()
  })

  it('renders a replaced level, score, reasons, and pattern instead of deriving them', () => {
    const session = structuredClone(asSession(t2.steps[3]?.response))
    session.risk.level = 'high'
    session.risk.score = 3
    session.risk.pattern_label = 'SENTINEL_PATTERN'
    session.risk.reasons = [{ id: 'sig.sentinel', label: 'SENTINEL_REASON', rationale: 'unused' }]
    session.risk.counterpoint = { id: 'mit.sentinel', label: 'SENTINEL_COUNTER', rationale: 'unused' }
    render(<InterviewScreen library={library} session={session} />)
    expect(screen.getByTestId('risk-level').textContent).toBe('High')
    expect(screen.getByTestId('risk-score').textContent).toBe(formatUrgencyScore(3))
    expect(screen.getByTestId('pattern-label').textContent).toBe('SENTINEL_PATTERN')
    expect(screen.getByTestId('reason').textContent).toBe('SENTINEL_REASON')
    expect(screen.getByTestId('counterpoint').textContent).toContain('In their favor:')
    expect(screen.getByTestId('counterpoint').textContent).toContain('SENTINEL_COUNTER')
  })

  it('shows the live badge only when mode is live', () => {
    const session = asSession(t2.steps[3]?.response)
    const shell = (mode: SessionState['mode']) => (
      <MemoryRouter initialEntries={[`/sessions/${session.session_id}`]}>
        <AppShell
          library={library}
          session={{ ...session, mode }}
          issues={[]}
        />
      </MemoryRouter>
    )
    const { rerender } = render(shell('practice'))
    expect(screen.queryByText('LIVE — no scenario loaded')).toBeNull()
    rerender(shell('live'))
    expect(screen.getByText('LIVE — no scenario loaded')).toBeTruthy()
  })
})
