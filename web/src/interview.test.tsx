import libraryJson from '../../contract/library.json'
import t2 from '../../contract/fixtures/T2.json'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from './App'
import { InterviewScreen } from './screens/InterviewScreen'
import type { Library, SessionState } from './types'

const library = libraryJson as Library

function secondAnswer(): SessionState {
  const answers = t2.steps.filter((step) => step.endpoint.endsWith('/answers'))
  const step = answers[1]
  if (!step) {
    throw new Error('T2 has no second answer')
  }
  return step.response as SessionState
}

describe('Interview shell', () => {
  it('renders raw fields from T2 after the second answer', () => {
    const session = secondAnswer()
    render(<InterviewScreen library={library} session={session} />)
    expect(screen.getByTestId('risk-level').textContent).toBe(session.risk.level)
    expect(screen.getByTestId('risk-raw-level').textContent).toBe(session.risk.raw_level)
    expect(screen.getByTestId('risk-score').textContent).toBe(String(session.risk.score))
    expect(screen.getByTestId('pattern-label').textContent).toBe(session.risk.pattern_label)
    expect(screen.getByTestId('question-text').textContent).toBe(session.question?.text)
    expect(screen.getByTestId('question-why').textContent).toBe(session.question?.why)
    expect(screen.getByTestId('suggested-outcome').textContent).toBe(session.suggested_outcome)
    const reasons = screen.getAllByTestId('reason').map((node) => node.textContent)
    expect(reasons).toEqual(session.risk.reasons.map((reason) => reason.label))
    expect(screen.getByTestId('stated-purpose').textContent).toBe(
      library.purposes.find((purpose) => purpose.id === session.stated_purpose)?.label,
    )
  })

  it('reads answer-chip labels from the library', () => {
    const session = secondAnswer()
    const altered = structuredClone(library)
    const chipId = session.question?.chips[0]
    const chip = altered.chips.find((item) => item.id === chipId)
    if (!chip) {
      throw new Error('chip missing from library')
    }
    const original = chip.label
    chip.label = 'SENTINEL_CHIP_LABEL'
    render(<InterviewScreen library={altered} session={session} />)
    expect(screen.getByText('SENTINEL_CHIP_LABEL')).toBeTruthy()
    expect(screen.queryByText(original)).toBeNull()
  })

  it('shows the live badge only when mode is live', () => {
    const session = secondAnswer()
    const shell = (mode: SessionState['mode']) => (
      <MemoryRouter initialEntries={[`/sessions/${session.session_id}`]}>
        <AppShell
          library={library}
          session={{ ...session, mode }}
          issues={[]}
          cases={[]}
          onStart={() => undefined}
        />
      </MemoryRouter>
    )
    const { rerender } = render(shell('practice'))
    expect(screen.queryByText('LIVE — no scenario loaded')).toBeNull()
    rerender(shell('live'))
    expect(screen.getByText('LIVE — no scenario loaded')).toBeTruthy()
  })
})
