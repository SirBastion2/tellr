// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import libraryJson from '../../contract/library.json'
import t2 from '../../contract/fixtures/T2.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { THEMES } from './theme/registry'
import { LEVEL_WORD } from './ui/LevelIcon'
import type { Library, SessionState } from './types'
import { CopilotStrip } from './workstation/CopilotStrip'

const library = libraryJson as Library
const session = t2.steps[0]?.response as SessionState

describe('copilot theme', () => {
  it('paints the copilot card from surface tokens and keeps level color on the badge', () => {
    const css = readFileSync('src/index.css', 'utf8')
    const strip = css.slice(css.indexOf('.tc-strip {'), css.indexOf('@media (min-width: 900px)'))
    expect(strip).toContain('var(--tc-surface')
    expect(strip).toContain('var(--tc-text')
    expect(css).not.toMatch(/\.tc-strip\[data-level='clear'\]\s*\{[^}]*--tc-risk-clear-bg/)
    expect(css).not.toMatch(/\.tc-strip\[data-level='caution'\]\s*\{[^}]*--tc-risk-caution-bg/)
    expect(css).not.toMatch(/\.tc-strip\[data-level='high'\]\s*\{[^}]*--tc-risk-high-bg/)
    expect(css).toMatch(/\.tc-level-badge[^{]*\{[^}]*--tc-risk-clear-bg|\.tc-level-badge\[data-level='clear'\]|\.tc-strip\[data-level='clear'\]\s+\.tc-level-badge/)
    expect(css).toContain('--tc-risk-caution-bg')
    expect(css).toContain('--tc-risk-high-bg')
  })

  it('follows Light and Dark tokens on the copilot card, script box, badges, and buttons', () => {
    window.localStorage.clear()
    render(<App />)
    const root = screen.getByTestId('theme-root')
    const strip = screen.getByTestId('copilot-strip')
    expect(root.getAttribute('data-scheme')).toBe('dark')
    expect(root.style.getPropertyValue('--tc-surface')).toBe(THEMES.tellr?.surface)
    expect(root.style.getPropertyValue('--tc-quote-bg')).toBe(THEMES.tellr?.quoteBg)
    expect(root.style.getPropertyValue('--tc-action-bg')).toBe(THEMES.tellr?.actionBg)
    expect(root.style.getPropertyValue('--tc-secondary-bg')).toBe(THEMES.tellr?.secondaryBg)
    expect(root.style.getPropertyValue('--tc-chip-bg')).toBe(THEMES.tellr?.chipBg)
    expect(THEMES.tellr?.quoteBg.toLowerCase()).not.toBe('#fffbeb')
    expect(THEMES.tellr?.risk.cautionBg.toLowerCase()).not.toBe(THEMES.tellr?.light.risk.cautionBg.toLowerCase())
    expect(strip.className).toContain('tc-strip')

    fireEvent.click(screen.getByTestId('scheme-light'))
    expect(root.getAttribute('data-scheme')).toBe('light')
    expect(root.style.getPropertyValue('--tc-surface')).toBe(THEMES.tellr?.light.surface)
    expect(root.style.getPropertyValue('--tc-quote-bg')).toBe(THEMES.tellr?.light.quoteBg)
    expect(root.style.getPropertyValue('--tc-action-bg')).toBe(THEMES.tellr?.light.actionBg)
    expect(root.style.getPropertyValue('--tc-secondary-bg')).toBe(THEMES.tellr?.light.secondaryBg)
    expect(root.style.getPropertyValue('--tc-text')).toBe(THEMES.tellr?.light.text)
  })

  it('keeps the server level on the badge and does not invent a score', () => {
    render(
      <CopilotStrip
        library={library}
        session={session}
        postedChipIds={[]}
        confirmed={[]}
        pending={false}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onEscalate={() => undefined}
      />,
    )
    const strip = screen.getByTestId('copilot-strip')
    expect(strip.getAttribute('data-level')).toBe(session.risk.level)
    expect(screen.getByTestId('copilot-level').getAttribute('data-level')).toBe(session.risk.level)
    expect(screen.getByTestId('copilot-level').textContent).toBe(LEVEL_WORD[session.risk.level])
    expect(screen.getByTestId('copilot-reason').textContent).toBe(
      session.risk.reasons[0]?.label ?? session.risk.counterpoint?.label ?? 'No concern flagged',
    )
  })
})
