// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './App'
import './index.css'
import { InterviewScreen } from './screens/InterviewScreen'
import type { Library, SessionState } from './types'

const library = libraryJson as Library
const opener = t1.steps[0]?.response as SessionState
const recommended = t2.steps.find((step) => {
  const session = step.response as SessionState
  return session.stop?.kind === 'recommended' && session.question !== null
})?.response as SessionState

const PAGE_BG = '#fafaf9'
const INK = '#1c1917'
const VIEWPORTS = [768, 800] as const

function shell(path: string, session: SessionState | null = opener) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <AppShell
        library={library}
        session={session}
        issues={[]}
        onAnswer={() => undefined}
        onPostContext={() => undefined}
        onSubmitOutcome={() => undefined}
      />
    </MemoryRouter>
  )
}

function channels(color: string): [number, number, number] {
  const hex = color.trim()
  if (hex.startsWith('#')) {
    return [0, 2, 4].map((index) => parseInt(hex.slice(index + 1, index + 3), 16)) as [
      number,
      number,
      number,
    ]
  }
  const match = hex.match(/rgba?\(([^)]+)\)/)
  if (!match?.[1]) {
    throw new Error(`unparsed color ${color}`)
  }
  const parts = match[1].split(',').map((part) => Number(part.trim()))
  const red = parts[0]
  const green = parts[1]
  const blue = parts[2]
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`unparsed color ${color}`)
  }
  return [red, green, blue]
}

function linear(channel: number): number {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function luminance(color: string): number {
  const [red, green, blue] = channels(color)
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function blend(foreground: string, background: string, alpha: number): string {
  const fg = channels(foreground)
  const bg = channels(background)
  const mixed = fg.map((channel, index) => Math.round(channel * alpha + (bg[index] ?? 0) * (1 - alpha)))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/** jsdom leaves `var(--token, 48px)` and `min-content` uncomputed. Read the token fallback. */
function tokenPx(value: string, fallback = 48): number {
  const fromVar = value.match(/,\s*([0-9.]+)px\s*\)/)
  if (fromVar?.[1]) {
    return Number(fromVar[1])
  }
  const parsed = parseFloat(value)
  if (Number.isFinite(parsed)) {
    return parsed
  }
  if (value === 'min-content' || value === 'max-content' || value === 'auto') {
    return fallback
  }
  return Number.NaN
}

function tapSize(element: Element): { minHeight: number; minWidth: number } {
  const style = getComputedStyle(element)
  return {
    minHeight: tokenPx(style.minHeight),
    minWidth: tokenPx(style.minWidth),
  }
}

describe('counter polish', () => {
  it('gives buttons, links, and fields a 48px target', () => {
    const paths = [
      '/',
      '/sessions',
      '/health',
      `/sessions/${opener.session_id}`,
      `/sessions/${opener.session_id}/context`,
      `/sessions/${opener.session_id}/outcome`,
    ]
    for (const path of paths) {
      const { unmount } = render(shell(path))
      const controls = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link'),
        ...screen.queryAllByRole('textbox'),
      ]
      expect(controls.length, path).toBeGreaterThan(0)
      for (const control of controls) {
        const size = tapSize(control)
        expect(size.minHeight, `${path} ${control.textContent}`).toBeGreaterThanOrEqual(48)
        expect(size.minWidth, `${path} ${control.textContent}`).toBeGreaterThanOrEqual(48)
      }
      unmount()
    }
  })

  it('keeps the level, question, and chips in view at 1024×768 and 1280×800', () => {
    render(shell(`/sessions/${opener.session_id}`))
    const fold = screen.getByTestId('counter-fold')
    const level = screen.getByTestId('risk-level')
    const question = screen.getByTestId('question-text')
    const chips = screen.getByTestId('chip-row')
    const purposes = screen.getByTestId('purpose-row')
    expect(fold.contains(level)).toBe(true)
    expect(fold.contains(question)).toBe(true)
    expect(fold.contains(chips)).toBe(true)
    expect(fold.contains(purposes)).toBe(true)
    const talk = screen.getByTestId('talk-track')
    expect(fold.contains(talk)).toBe(false)
    expect(fold.compareDocumentPosition(talk) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(purposes.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)

    const header = screen.getByTestId('app-header')
    expect(getComputedStyle(header).flexWrap).toBe('nowrap')
    const purposeHeight = parseFloat(getComputedStyle(purposes).height)
    const chipHeight = parseFloat(getComputedStyle(chips).height)
    const headerHeight = tokenPx(getComputedStyle(header).minHeight)
    expect(purposeHeight).toBeLessThanOrEqual(48)
    expect(chipHeight).toBe(72)
    expect(headerHeight).toBeGreaterThanOrEqual(48)
    expect(getComputedStyle(screen.getByTestId('app-nav')).flexWrap).toBe('nowrap')
    expect(getComputedStyle(screen.getByTestId('app-nav')).overflow).toBe('visible')

    const chrome = 8 + headerHeight + 8
    const foldHeight = 32 + 56 + 8 + purposeHeight + 8 + chipHeight
    for (const viewport of VIEWPORTS) {
      expect(chrome + foldHeight, `viewport ${viewport}`).toBeLessThanOrEqual(viewport)
    }
  })

  it('keeps every control on the keyboard path', () => {
    const onAnswer = vi.fn()
    render(
      <MemoryRouter initialEntries={[`/sessions/${opener.session_id}`]}>
        <AppShell
          library={library}
          session={opener}
          issues={[]}
          onAnswer={onAnswer}
        />
      </MemoryRouter>,
    )
    const controls = [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]
    for (const control of controls) {
      expect(control.tabIndex, control.textContent ?? '').toBeGreaterThanOrEqual(0)
      if (control instanceof HTMLButtonElement) {
        expect(control.disabled, control.textContent ?? '').toBe(false)
      }
      control.focus()
      expect(document.activeElement).toBe(control)
    }
    const chip = screen.getAllByTestId('answer-chip')[0]
    const purpose = screen.getAllByTestId('purpose')[0]
    if (!chip || !purpose) {
      throw new Error('opener controls missing')
    }
    fireEvent.click(chip)
    expect(onAnswer).not.toHaveBeenCalled()
    expect(chip.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(purpose)
    expect(chip.getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(chip)
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })

  it('keeps text and the de-emphasized question at WCAG AA', () => {
    if (!recommended?.question) {
      throw new Error('fixture has no recommended question')
    }
    const quiet = render(<InterviewScreen library={library} session={recommended} />)
    const card = screen.getByTestId('question-card')
    const opacity = Number(getComputedStyle(card).opacity)
    expect(opacity).toBeLessThan(1)
    expect(contrast(blend(INK, PAGE_BG, opacity), PAGE_BG)).toBeGreaterThanOrEqual(4.5)
    quiet.unmount()

    const shown = render(<InterviewScreen library={library} session={opener} />)
    const level = screen.getAllByTestId('risk-level').at(-1)
    const slots = screen.getAllByTestId('level-slot')
    if (!level) {
      throw new Error('level missing')
    }
    expect(contrast(getComputedStyle(level).color, PAGE_BG)).toBeGreaterThanOrEqual(4.5)
    for (const slot of slots) {
      const style = getComputedStyle(slot)
      const background = style.backgroundColor
      const foreground = style.color
      if (background === 'transparent' || background === 'rgba(0, 0, 0, 0)') {
        expect(contrast(foreground, PAGE_BG)).toBeGreaterThanOrEqual(4.5)
      } else {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
      }
    }
    shown.unmount()

    render(shell(`/sessions/${opener.session_id}/outcome`))
    const suggested = screen.getByTestId('outcome-slow_down')
    if (opener.suggested_outcome) {
      const highlighted = screen.getByTestId(`outcome-${opener.suggested_outcome}`)
      const style = getComputedStyle(highlighted)
      expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5)
    }
    expect(suggested).toBeTruthy()
  })

  it('draws a visible focus ring and honours reduced motion', () => {
    const css = readFileSync('src/index.css', 'utf8')
    expect(css).toMatch(/:focus-visible/)
    expect(css).toMatch(/outline:\s*2px solid #1c1917/)
    expect(css).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/)
    expect(css).toMatch(/animation-duration:\s*0\.01ms !important/)
    expect(css).toMatch(/transition-duration:\s*0\.01ms !important/)
  })

  it('names the context action and shows which chips are selected', () => {
    render(shell(`/sessions/${opener.session_id}/context`))
    const post = screen.getByTestId('post-context')
    expect(post.textContent?.trim().length).toBeGreaterThan(0)
    expect(post.getAttribute('aria-label') ?? post.textContent).not.toMatch(/^chip\./)
    const chip = screen.getAllByTestId('context-chip')[0]
    if (!chip) {
      throw new Error('context chip missing')
    }
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(chip)
    expect(chip.getAttribute('aria-pressed')).toBe('true')
  })
})
