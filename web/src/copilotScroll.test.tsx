// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import './index.css'
import type { Library, SessionState } from './types'
import { CopilotStrip } from './workstation/CopilotStrip'

const library = libraryJson as Library
const emptyVisit = t1.steps[0]?.response as SessionState
const phoneVisit = {
  ...emptyVisit,
  context_chips: [{ id: 'chip.on_phone', source: 'observed' as const }],
  risk: {
    ...emptyVisit.risk,
    score: 14,
    counterpoint: {
      id: 'sig.third_party_call',
      label: 'On the phone during the visit',
      rationale: 'Scammers often stay on the line.',
    },
  },
  talk_track: {
    ...emptyVisit.talk_track,
    lines: ['I noticed you have someone on the phone. Would you like a moment?'],
  },
} satisfies SessionState

function css(): string {
  return readFileSync('src/index.css', 'utf8')
}

function rule(source: string, selector: string): string {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))
  if (!match?.[1]) {
    throw new Error(`missing ${selector} rule`)
  }
  return match[1]
}

function forbidsInnerScroll(block: string) {
  expect(block).not.toMatch(/max-height\s*:/)
  expect(block).not.toMatch(/overflow(-y)?\s*:\s*(auto|scroll)/)
}

describe('copilot panel scroll', () => {
  it('grows the panel and script card without an inner overflow scroll or max-height', () => {
    const source = css()
    const stripRule = rule(source, '.tc-strip')
    forbidsInnerScroll(stripRule)
    expect(stripRule).toMatch(/height:\s*auto/)
    expect(stripRule).toMatch(/overflow:\s*visible/)
    expect(stripRule).not.toMatch(/(?<![-\w])height:\s*100%/)

    const bodyRule = rule(source, '.tc-strip-body')
    forbidsInnerScroll(bodyRule)
    expect(bodyRule).toMatch(/overflow:\s*visible/)

    const quoteRule = rule(source, "[data-testid='read-aloud-block']")
    forbidsInnerScroll(quoteRule)
    expect(quoteRule).toMatch(/overflow:\s*visible/)

    forbidsInnerScroll(rule(source, '.tc-factor-list'))
    forbidsInnerScroll(rule(source, '.tc-signal-row'))
    expect(rule(source, '.tc-factor-list')).toMatch(/overflow:\s*visible/)
    expect(rule(source, '.tc-signal-row')).toMatch(/overflow:\s*visible/)

    render(
      <CopilotStrip
        library={library}
        session={phoneVisit}
        postedChipIds={['chip.on_phone']}
        confirmed={[]}
        pending={false}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onEscalate={() => undefined}
        onUndo={() => undefined}
      />,
    )

    const panel = screen.getByTestId('copilot-strip')
    const script = screen.getByTestId('read-aloud-block')
    const signals = screen.getByTestId('signal-row')
    for (const node of [panel, script, signals]) {
      const style = getComputedStyle(node)
      expect(style.maxHeight).toMatch(/^(none|)$/)
      expect(style.overflowY).not.toMatch(/auto|scroll/)
      expect(style.overflow).not.toMatch(/auto|scroll/)
    }
  })
})
