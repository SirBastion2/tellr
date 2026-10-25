// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import './index.css'
import { TYPE_ROOT } from './theme/typeScale'
import { DENSITY, VIEWPORT_FIT } from './theme/tokens'
import { revealCurrentStep } from './workstation/TransactionPanel'

const css = () => readFileSync('src/index.css', 'utf8')

function mediaBlock(source: string, query: string): string {
  const marker = `@media (max-height: ${query})`
  const start = source.indexOf(marker)
  if (start < 0) {
    throw new Error(`missing ${marker}`)
  }
  const next = source.indexOf('@media (max-height:', start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

describe('home viewport fit', () => {
  it('locks Home to a viewport-height grid and compact shared tokens', () => {
    const source = css()
    expect(source).toMatch(/height:\s*100dvh/)
    expect(source).toMatch(/\.tc-home\s*\{[^}]*min-height:\s*0/)
    expect(source).toMatch(/\.tc-home\s*\{[^}]*height:\s*100%/)
    expect(source).toMatch(/\.tc-home\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)/)
    expect(source).toMatch(/\.tc-home-column\s*\{[^}]*min-height:\s*0/)
    expect(source).toMatch(/\.tc-home-column\s*\{[^}]*height:\s*100%/)
    expect(source).toMatch(/\.tc-workstation\s*\{[^}]*min-height:\s*0/)
    expect(source).toMatch(/\.tc-workstation\s*\{[^}]*height:\s*100%/)
    expect(source).toMatch(/\.tc-transaction\.tc-screen > \.tc-timeline\s*\{[^}]*overflow-y:\s*auto/)
    expect(source).toMatch(/\.tc-transaction\.tc-screen > \.tc-timeline\s*\{[^}]*scrollbar-width:\s*thin/)
    expect(source).toMatch(/\.tc-strip\s*\{[^}]*height:\s*100%/)
    expect(source).toMatch(/\.tc-strip\s*\{[^}]*max-height:\s*100%/)
    expect(source).toMatch(/\.tc-strip\s*\{[^}]*min-height:\s*0/)
    expect(source).toMatch(/\.tc-strip-body\s*\{[^}]*min-height:\s*0/)
    expect(source).toMatch(/\.tc-strip ul\[aria-label='Signals'\]\s*\{[^}]*overflow-y:\s*auto/)
    expect(source).toMatch(/\.tc-strip ul\[aria-label='Signals'\]\s*\{[^}]*min-height:\s*0/)
    expect(source).toMatch(/\.tc-strip ul\[aria-label='Signals'\]\s*\{[^}]*scrollbar-width:\s*thin/)
    expect(source).toMatch(/\.tc-theme-page\s*\{[^}]*min-height:\s*0/)
    expect(source).toMatch(/\.tc-shell\s*\{[^}]*min-height:\s*0/)

    const compact = mediaBlock(source, VIEWPORT_FIT.compactMaxHeight)
    const short = mediaBlock(source, VIEWPORT_FIT.shortMaxHeight)
    expect(compact).toContain(`--tc-root-font: ${VIEWPORT_FIT.compact.rootFont} !important`)
    expect(short).toContain(`--tc-root-font: ${VIEWPORT_FIT.short.rootFont} !important`)
    expect(VIEWPORT_FIT.compact.rootFont).toBe(TYPE_ROOT.compact)
    expect(VIEWPORT_FIT.short.rootFont).toBe(TYPE_ROOT.short)
    expect(parseFloat(VIEWPORT_FIT.short.rootFont)).toBeGreaterThanOrEqual(81.25)
    expect(parseFloat(VIEWPORT_FIT.compact.controlHeight)).toBeGreaterThanOrEqual(32)
    expect(parseFloat(VIEWPORT_FIT.short.controlHeight)).toBeGreaterThanOrEqual(32)
    expect(parseFloat(VIEWPORT_FIT.short.helpSize)).toBeGreaterThanOrEqual(32)

    for (const [block, step] of [
      [compact, VIEWPORT_FIT.compact],
      [short, VIEWPORT_FIT.short],
    ] as const) {
      expect(block).not.toMatch(/tellr|pnc|mtb|fnb/)
      expect(block).not.toMatch(/--tc-space-4\s*:/)
      expect(block).toContain(`--tc-space-1: ${step.space1} !important`)
      expect(block).toContain(`--tc-space-2: ${step.space2} !important`)
      expect(block).toContain(`--tc-space-3: ${step.space3} !important`)
      expect(block).toContain(`--tc-space-5: ${step.space5} !important`)
      expect(block).toContain(`--tc-space-header-content: ${step.spaceHeaderContent} !important`)
      expect(block).toContain(`--tc-space-body-control: ${step.spaceBodyControl} !important`)
      expect(block).toContain(`--tc-control-h: ${step.controlHeight} !important`)
      expect(block).toContain(`--tc-header-h: ${step.headerMinHeight} !important`)
      expect(block).toContain(`--tc-header-control-h: ${step.headerControlHeight} !important`)
      expect(block).toContain(`--tc-wordmark-h: ${step.wordmarkHeight} !important`)
      expect(block).toContain(`--tc-page-pad-y: ${step.pagePadY} !important`)
      expect(block).toContain(`--tc-page-pad-bottom: ${step.pagePadBottom} !important`)
      expect(block).toContain(`--tc-space-card: ${step.spaceCard} !important`)
      expect(block).toContain(`--tc-space-workstation: ${step.spaceWorkstation} !important`)
      expect(block).toContain(`--tc-timeline-gap: ${step.timelineGap} !important`)
      expect(block).toContain(`--tc-text-base-lh: ${step.lineBase} !important`)
      expect(block).toContain(`--tc-type-line-body: ${step.lineBody} !important`)
      expect(block).toContain(`--tc-text-2xl-lh: ${step.line2xl} !important`)
    }

    expect(source).toContain(`--tc-space-4: ${DENSITY.space4}`)
    expect(DENSITY.space4).toBe('16px')

    render(<App />)
    const home = screen.getByTestId('home-screen')
    expect(home.className).toContain('tc-home')
    expect(screen.getByTestId('theme-root').style.height).toBe('100dvh')
    expect(screen.getByTestId('theme-root').style.maxHeight).toBe('100dvh')
    expect(screen.getByTestId('theme-page').style.height).toBe('100%')
    expect(screen.getByTestId('theme-page').style.minHeight).toBe('0px')
    expect(screen.getByTestId('theme-card').style.flex).toBe('1 1 auto')
    expect(screen.getByTestId('theme-card').style.minHeight).toBe('0px')
    expect(screen.getByTestId('demo-toolbar')).toBeTruthy()
    expect(screen.getByTestId('transaction-panel')).toBeTruthy()
    expect(screen.getByTestId('event-progress')).toBeTruthy()
    expect(screen.getByTestId('theme-footer').textContent).toMatch(/Made for HackPSU 2026/)
  })

  it('scrolls the timeline list to the current step without moving the page', () => {
    const list = document.createElement('ol')
    const item = document.createElement('li')
    item.setAttribute('data-current', 'true')
    list.append(item)
    document.body.append(list)
    const page = document.documentElement
    page.scrollTop = 0
    const box = (top: number, bottom: number): DOMRect =>
      ({
        top,
        bottom,
        left: 0,
        right: 10,
        width: 10,
        height: bottom - top,
        x: 0,
        y: top,
        toJSON() {
          return {}
        },
      }) as DOMRect
    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(box(0, 100))
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(box(80, 140))
    revealCurrentStep(list)
    expect(list.scrollTop).toBe(40)
    expect(page.scrollTop).toBe(0)

    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(box(10, 70))
    const parked = list.scrollTop
    revealCurrentStep(list)
    expect(list.scrollTop).toBe(parked)
    list.remove()
  })
})
