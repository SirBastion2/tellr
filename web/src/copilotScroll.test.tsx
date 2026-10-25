// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import './index.css'
import type { CSSProperties } from 'react'
import { themeForScheme } from './theme/palette'
import { THEME_IDS, THEMES } from './theme/registry'
import { themeVars } from './theme/vars'
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
  it('grows the panel without an inner overflow scroll or max-height', () => {
    const source = css()
    const stripRule = rule(source, '.tc-strip')
    forbidsInnerScroll(stripRule)
    expect(stripRule).toMatch(/height:\s*auto/)
    expect(stripRule).toMatch(/overflow:\s*visible/)
    expect(stripRule).not.toMatch(/(?<![-\w])height:\s*100%/)

    const bodyRule = rule(source, '.tc-strip-body')
    forbidsInnerScroll(bodyRule)
    expect(bodyRule).toMatch(/overflow:\s*visible/)

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
    const signals = screen.getByTestId('signal-row')
    for (const node of [panel, signals]) {
      const style = getComputedStyle(node)
      expect(style.maxHeight).toMatch(/^(none|)$/)
      expect(style.overflowY).not.toMatch(/auto|scroll/)
      expect(style.overflow).not.toMatch(/auto|scroll/)
    }
    expect(screen.queryByTestId('read-aloud-block')).toBeNull()
    expect(panel.querySelector('details')).toBeNull()
  })

  it('leaves no empty read-aloud slot in any bank theme', () => {
    const longLine = 'Pause and read this back. '.repeat(24).trim()
    for (const themeId of THEME_IDS) {
      for (const scheme of ['dark', 'light'] as const) {
        const theme = THEMES[themeId]
        expect(theme, themeId).toBeTruthy()
        const { unmount } = render(
          <div data-testid="theme-pad" style={themeVars(themeForScheme(theme!, scheme)) as CSSProperties}>
            <CopilotStrip
              library={library}
              session={{ ...phoneVisit, talk_track: { ...phoneVisit.talk_track, lines: [longLine] } }}
              postedChipIds={['chip.on_phone']}
              confirmed={[]}
              pending={false}
              onConfirm={() => undefined}
              onDismiss={() => undefined}
              onEscalate={() => undefined}
            />
          </div>,
        )
        const panel = screen.getByTestId('copilot-strip')
        const body = panel.querySelector('.tc-strip-body')
        expect(screen.queryByTestId('read-aloud-block'), `${themeId} ${scheme}`).toBeNull()
        expect(screen.queryByTestId('read-aloud'), `${themeId} ${scheme}`).toBeNull()
        expect(screen.queryByText(/read-aloud script/i), `${themeId} ${scheme}`).toBeNull()
        expect(panel.textContent, `${themeId} ${scheme}`).not.toContain(longLine)
        expect(panel.querySelector('details'), `${themeId} ${scheme}`).toBeNull()
        expect(body, `${themeId} ${scheme}`).toBeTruthy()
        for (const child of Array.from(body?.children ?? [])) {
          expect(child.textContent?.trim(), `${themeId} ${scheme}`).not.toBe('')
        }
        expect(screen.getByTestId('copilot-action').textContent, `${themeId} ${scheme}`).toBe(phoneVisit.talk_track.action)
        const actionCard = screen.getByText('Suggested action').parentElement
        const signals = screen.getByRole('list', { name: 'Signals' })
        expect(actionCard?.nextElementSibling, `${themeId} ${scheme}`).toBe(signals)
        unmount()
      }
    }
  })
})
