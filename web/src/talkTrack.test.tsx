import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import t3 from '../../contract/fixtures/T3.json'
import t4 from '../../contract/fixtures/T4.json'
import t5 from '../../contract/fixtures/T5.json'
import t6 from '../../contract/fixtures/T6.json'
import t7 from '../../contract/fixtures/T7.json'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InterviewScreen } from './screens/InterviewScreen'
import type { Library, SessionState } from './types'

const library = libraryJson as Library
const fixtures = [t1, t2, t3, t4, t5, t6, t7]

function asSession(response: unknown): SessionState {
  return response as SessionState
}

function track(lib: Library, id: string) {
  const found = lib.talk_tracks.find((item) => item.id === id)
  if (!found) {
    throw new Error(`talk track ${id} missing`)
  }
  return found
}

function expectedCopy(session: SessionState, lib: Library) {
  const stage = track(lib, session.talk_track.stage)
  const patternDisplayed = session.risk.pattern?.kind === 'pattern'
  const pattern =
    patternDisplayed && session.talk_track.pattern ? track(lib, session.talk_track.pattern) : undefined
  return {
    stageLines: stage.lines,
    patternLines: pattern?.lines ?? [],
    avoid: stage.avoid,
  }
}

describe('talk track panel', () => {
  it('shows stage lines, adds pattern lines only while a pattern is displayed, and lists avoid phrases', () => {
    for (const fixture of fixtures) {
      for (const [index, step] of fixture.steps.entries()) {
        const session = asSession(step.response)
        const where = `${fixture.case} step ${index}`
        const copy = expectedCopy(session, library)
        expect(session.talk_track.lines, where).toEqual([...copy.stageLines, ...copy.patternLines])
        expect(session.talk_track.avoid, where).toEqual(copy.avoid)
        const { unmount } = render(<InterviewScreen library={library} session={session} />)
        expect(screen.getAllByTestId('talk-stage-line').map((line) => line.textContent), where).toEqual(copy.stageLines)
        expect(screen.queryAllByTestId('talk-pattern-line').map((line) => line.textContent), where).toEqual(
          copy.patternLines,
        )
        expect(screen.queryAllByTestId('avoid-phrase').map((line) => line.textContent), where).toEqual(copy.avoid)
        if (copy.patternLines.length > 0) {
          const stageLine = screen.getAllByTestId('talk-stage-line').at(-1)
          const patternLine = screen.getAllByTestId('talk-pattern-line')[0]
          if (!stageLine || !patternLine) {
            throw new Error(`${where}: missing talk lines`)
          }
          expect(stageLine.compareDocumentPosition(patternLine) & Node.DOCUMENT_POSITION_FOLLOWING, where).not.toBe(0)
        }
        unmount()
      }
    }
  })

  it('reads the lines from the library and omits pattern lines when no pattern is displayed', () => {
    const session = structuredClone(asSession(t2.steps.at(-1)?.response))
    const altered = structuredClone(library)
    const stage = altered.talk_tracks.find((item) => item.id === session.talk_track.stage)
    const pattern = altered.talk_tracks.find((item) => item.id === session.talk_track.pattern)
    if (!stage || !pattern) {
      throw new Error('T2 talk tracks missing')
    }
    stage.lines = ['SENTINEL_STAGE']
    stage.avoid = ['SENTINEL_AVOID']
    pattern.lines = ['SENTINEL_PATTERN_LINE']
    const { rerender } = render(<InterviewScreen library={altered} session={session} />)
    expect(screen.getByTestId('talk-stage-line').textContent).toBe('SENTINEL_STAGE')
    expect(screen.getByTestId('talk-pattern-line').textContent).toBe('SENTINEL_PATTERN_LINE')
    expect(screen.getByTestId('avoid-phrase').textContent).toBe('SENTINEL_AVOID')

    session.risk.pattern = null
    session.risk.pattern_label = 'Pattern unclear'
    session.talk_track.lines = ['SENTINEL_STAGE', 'SENTINEL_PATTERN_LINE']
    rerender(<InterviewScreen library={altered} session={session} />)
    expect(screen.getByTestId('talk-stage-line').textContent).toBe('SENTINEL_STAGE')
    expect(screen.queryByText('SENTINEL_PATTERN_LINE')).toBeNull()
    expect(screen.getByTestId('avoid-phrase').textContent).toBe('SENTINEL_AVOID')
  })
})
