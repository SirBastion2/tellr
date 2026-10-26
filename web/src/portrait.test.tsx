// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function portraitCss(): string {
  const source = readFileSync('src/index.css', 'utf8')
  const marker = '@media (max-width: 480px)'
  const start = source.indexOf(marker)
  if (start < 0) {
    throw new Error(`missing ${marker}`)
  }
  return source.slice(start)
}

describe('portrait phone layout', () => {
  it('stacks Home, keeps playback tappable, and fits the score overlay', () => {
    const block = portraitCss()
    expect(block).toMatch(/flex-direction:\s*column !important/)
    expect(block).toMatch(/flex-wrap:\s*wrap !important/)
    expect(block).toMatch(/overflow-y:\s*auto !important/)
    expect(block).toMatch(/min-width:\s*44px !important/)
    expect(block).toMatch(/min-height:\s*44px !important/)
    expect(block).toMatch(/position:\s*fixed !important/)
    expect(block).toMatch(/height:\s*100dvh !important/)
    expect(block).toMatch(/\.tc-explain-overlay\[hidden\][\s\S]*display:\s*none !important/)
    expect(block).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\) !important/)
    expect(block).not.toMatch(/\b(tellr|pnc|mtb|fnb)\b/)
    expect(block).not.toMatch(/min-height:\s*min-content/)
  })

  it('keeps the case file, suggested action, playback, and Close apart at phone width', () => {
    const block = portraitCss()
    expect(block).toMatch(/\.tc-step-swap\[data-phase='exit'\]\s*\{[^}]*display:\s*none !important/)
    expect(block).toMatch(/\.tc-step-zone \.tc-step-viewport[\s\S]*?\.tc-step-block \.tc-step-viewport\s*\{[^}]*overflow:\s*hidden !important/)
    expect(block).toMatch(/\.tc-copilot-head\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) !important/)
    expect(block).toMatch(/\.tc-copilot-head > \.tc-action-copy\s*\{[^}]*grid-row:\s*2 !important/)
    expect(block).toMatch(/\.tc-copilot-head > \.tc-copilot-pin\s*\{[^}]*grid-row:\s*3 !important/)
    expect(block).toMatch(/\.tc-dots\s*\{[^}]*flex-wrap:\s*nowrap !important/)
    expect(block).toMatch(/\.tc-dots\s*\{[^}]*overflow-x:\s*auto !important/)
    expect(block).toMatch(/\.tc-playback \.tc-mini-transport\s*\{[^}]*position:\s*absolute !important/)
    expect(block).toMatch(/\.tc-footer-utilities\s*\{[^}]*position:\s*absolute !important/)
    expect(block).toMatch(/min-width:\s*44px !important/)
    expect(block).toMatch(/min-height:\s*44px !important/)
    expect(block).toMatch(/:has\(\.tc-explain-overlay:not\(\[hidden\]\)\)\s*\{[^}]*z-index:\s*50 !important/)
    expect(block).toMatch(/:has\(\.tc-explain-overlay:not\(\[hidden\]\)\)\s*\{[^}]*backdrop-filter:\s*none !important/)
    expect(block).toMatch(/\.tc-explain-overlay:not\(\[hidden\]\)\s*\{[^}]*position:\s*fixed !important/)
    expect(block).toMatch(/\.tc-explain-overlay:not\(\[hidden\]\)\s*\{[^}]*height:\s*100dvh !important/)
  })

  it('keeps signal buttons on one row and separates the handoff title from the flag list', () => {
    const block = portraitCss()
    expect(block).toMatch(/\.tc-stage \.tc-signal-row\s*\{[^}]*flex-wrap:\s*nowrap !important/)
    expect(block).not.toMatch(/\.tc-stage \.tc-signal-row\s*\{[^}]*flex-wrap:\s*wrap !important/)
    expect(block).toMatch(/\.tc-stage \.tc-signal-meta\s*\{[^}]*min-width:\s*0 !important/)
    expect(block).toMatch(/\.tc-stage \.tc-signal-label\s*\{[^}]*overflow-wrap:\s*anywhere !important/)
    expect(block).toMatch(/\.tc-stage \.tc-signal-actions\s*\{[^}]*flex:\s*0 0 auto !important/)
    expect(block).toMatch(/\.tc-stage \.tc-signal-actions\s*\{[^}]*flex-wrap:\s*nowrap !important/)
    expect(block).toMatch(/\.tc-handoff-head\s*\{[^}]*padding-top:\s*16px !important/)
    expect(block).toMatch(/\.tc-handoff-flags\s*\{[^}]*padding-top:\s*24px !important/)
    expect(block).not.toMatch(/\b(tellr|pnc|mtb|fnb)\b/)
  })
})