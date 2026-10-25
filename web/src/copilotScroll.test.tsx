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
import { TYPE_WEIGHT } from './theme/typeScale'
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
  it('bounds the panel and scrolls only the signal list', () => {
    const source = css()
    const stripRule = rule(source, '.tc-strip')
    expect(stripRule).toMatch(/height:\s*100%/)
    expect(stripRule).toMatch(/max-height:\s*100%/)
    expect(stripRule).toMatch(/min-height:\s*0/)
    expect(stripRule).toMatch(/overflow:\s*hidden/)
    expect(stripRule).not.toMatch(/overflow(-y)?\s*:\s*(auto|scroll)/)

    const bodyRule = rule(source, '.tc-strip-body')
    expect(bodyRule).toMatch(/min-height:\s*0/)
    expect(bodyRule).toMatch(/overflow-y:\s*auto/)
    expect(bodyRule).toMatch(/overscroll-behavior:\s*contain/)
    expect(rule(source, '.tc-strip-body > :not(ul)')).toMatch(/flex:\s*0 0 auto/)

    const listRule = rule(source, ".tc-strip ul[aria-label='Signals']")
    expect(listRule).toMatch(/min-height:\s*0/)
    expect(listRule).toMatch(/align-content:\s*start/)
    expect(listRule).toMatch(/overflow:\s*visible/)
    expect(listRule).not.toMatch(/overflow-y:\s*auto/)
    expect(listRule).not.toMatch(/max-height\s*:/)

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
    const signals = screen.getByRole('list', { name: 'Signals' })
    const row = screen.getByTestId('signal-row')
    const level = screen.getByTestId('copilot-level')
    const action = screen.getByText('Suggested action')
    const undo = screen.getByTestId('undo')
    const escalate = screen.getByTestId('escalate')
    expect(signals.contains(row)).toBe(true)
    expect(signals.contains(level)).toBe(false)
    expect(signals.contains(action)).toBe(false)
    expect(signals.contains(undo)).toBe(false)
    expect(signals.contains(escalate)).toBe(false)
    expect(action.parentElement?.nextElementSibling).toBe(signals)
    const actions = panel.querySelector('.tc-copilot-actions')
    expect(actions?.contains(undo)).toBe(true)
    expect(actions?.contains(escalate)).toBe(true)
    expect(panel.querySelector('.tc-strip-body')?.contains(undo)).toBe(false)
    expect(panel.querySelector('.tc-strip-body')?.contains(escalate)).toBe(false)
    expect(panel.querySelector('.tc-strip-heading')?.parentElement).toBe(panel)

    for (const node of [panel, row]) {
      const style = getComputedStyle(node as Element)
      expect(style.overflowY).not.toMatch(/auto|scroll/)
    }
    expect(rule(css(), '.tc-strip-body')).toMatch(/overflow-y:\s*auto/)
    expect(signals.getAttribute('style') ?? '').not.toMatch(/overflow/)
    expect(screen.queryByTestId('read-aloud-block')).toBeNull()
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

  it('pins a centered bold Copilot heading above the level badge', () => {
    const source = css()
    const headingRule = rule(source, '.tc-strip-heading')
    expect(source.match(/\.tc-strip-heading/g)).toHaveLength(1)
    expect(headingRule).toMatch(/text-align:\s*center/)
    expect(headingRule).toMatch(/font-weight:\s*var\(--tc-strong-weight\)/)
    expect(headingRule).toMatch(/font-size:\s*var\(--tc-type-title\)/)
    expect(headingRule).toMatch(/line-height:\s*var\(--tc-type-line-heading\)/)
    expect(headingRule).toMatch(/margin:\s*0/)
    expect(headingRule).toMatch(/flex:\s*0 0 auto/)
    expect(headingRule).not.toMatch(/tellr|pnc|mtb|fnb|font-size:\s*[\d.]+(?:px|rem|em)/)
    expect(TYPE_WEIGHT.strong).toBe('700')

    for (const themeId of THEME_IDS) {
      for (const scheme of ['dark', 'light'] as const) {
        const theme = THEMES[themeId]
        const vars = themeVars(themeForScheme(theme!, scheme))
        expect(vars['--tc-strong-weight'], `${themeId} ${scheme}`).toBe(TYPE_WEIGHT.strong)
        expect(vars['--tc-type-title'], `${themeId} ${scheme}`).toBe(vars['--tc-text-xl'])
        const { unmount } = render(
          <div data-testid="theme-pad" style={themeVars(themeForScheme(theme!, scheme)) as CSSProperties}>
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
            />
          </div>,
        )
        const panel = screen.getByTestId('copilot-strip')
        expect(panel.getAttribute('aria-label'), `${themeId} ${scheme}`).toBe('Copilot')
        const heading = screen.getByRole('heading', { name: 'Copilot' })
        expect(heading.tagName, `${themeId} ${scheme}`).toBe('H2')
        expect(heading.textContent, `${themeId} ${scheme}`).toBe('Copilot')
        expect(heading.className, `${themeId} ${scheme}`).toContain('tc-strip-heading')
        const level = screen.getByTestId('copilot-level')
        const body = panel.querySelector('.tc-strip-body')
        const signals = screen.getByRole('list', { name: 'Signals' })
        expect(panel.firstElementChild, `${themeId} ${scheme}`).toBe(heading)
        expect(heading.compareDocumentPosition(level) & Node.DOCUMENT_POSITION_FOLLOWING, `${themeId} ${scheme}`).toBeTruthy()
        expect(signals.parentElement, `${themeId} ${scheme}`).toBe(body)
        expect(signals.contains(heading), `${themeId} ${scheme}`).toBe(false)
        expect(signals.contains(level), `${themeId} ${scheme}`).toBe(false)
        unmount()
      }
    }
  })
})
