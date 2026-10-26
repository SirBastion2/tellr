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
})