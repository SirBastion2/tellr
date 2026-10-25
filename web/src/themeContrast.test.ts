import { describe, expect, it } from 'vitest'
import { darkPalette } from './theme/palette'
import { THEME_LIST } from './theme/registry'
import type { ThemePalette } from './theme/types'

function channels(color: string): [number, number, number, number] {
  const hex = color.trim()
  if (hex.startsWith('#')) {
    const body = hex.slice(1)
    const expanded = body.length === 3 ? body.split('').map((part) => part + part).join('') : body
    return [
      parseInt(expanded.slice(0, 2), 16),
      parseInt(expanded.slice(2, 4), 16),
      parseInt(expanded.slice(4, 6), 16),
      1,
    ]
  }
  const match = hex.match(/rgba?\(([^)]+)\)/)
  if (!match?.[1]) {
    throw new Error(`unparsed color ${color}`)
  }
  const parts = match[1].split(',').map((part) => Number(part.trim()))
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1]
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

function composite(foreground: string, background: string): string {
  const fg = channels(foreground)
  const bg = channels(background)
  const alpha = fg[3]
  const mixed = [0, 1, 2].map((index) => Math.round((fg[index] ?? 0) * alpha + (bg[index] ?? 0) * (1 - alpha)))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function checkPalette(label: string, palette: ThemePalette) {
  const page = palette.background.color
  const glass = channels(palette.glass.fill)
  const card = composite(`rgba(${glass[0]}, ${glass[1]}, ${glass[2]}, ${glass[3]})`, page)
  const input = composite(palette.inputFill, palette.glass.fallback)
  expect(contrast(palette.text, page), `${label} text on field`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.text, card), `${label} text on glass`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.mutedText, page), `${label} muted on field`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.mutedText, card), `${label} muted on glass`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.mutedText, palette.glass.fallback), `${label} muted on fallback`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.text, palette.glass.fallback), `${label} text on fallback`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.text, palette.surface), `${label} text on surface`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.text, input), `${label} text on input`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.buttonText, palette.button), `${label} primary button`).toBeGreaterThanOrEqual(4.5)
  expect(channels(palette.surface)[3], `${label} option surface opaque`).toBe(1)
  expect(channels(palette.button)[3], `${label} option active opaque`).toBe(1)
  expect(palette.surface.toLowerCase(), `${label} option active distinct`).not.toBe(palette.button.toLowerCase())
  expect(contrast(palette.text, palette.surface), `${label} option`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.buttonText, palette.button), `${label} option selected`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.secondaryFg, palette.secondaryBg), `${label} secondary`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.chipFg, palette.chipBg), `${label} badge`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.actionFg, palette.actionBg), `${label} action`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.quoteFg, palette.quoteBg), `${label} quote`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.link, page), `${label} link on field`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.link, palette.glass.fallback), `${label} link on fallback`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.link, card), `${label} link on glass`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.wordmarkColor, page), `${label} wordmark on field`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.wordmarkColor, palette.glass.fallback), `${label} wordmark on fallback`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.risk.clearFg, palette.risk.clearBg), `${label} clear`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.risk.cautionFg, palette.risk.cautionBg), `${label} caution`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.risk.highFg, palette.risk.highBg), `${label} high`).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.highlightFg, palette.highlightBg), `${label} outcome highlight`).toBeGreaterThanOrEqual(4.5)
}

describe('theme contrast', () => {
  it('keeps text, buttons, and risk states at WCAG AA for every bank and color scheme', () => {
    expect(THEME_LIST.map((theme) => theme.id)).toEqual(['tellr', 'pnc', 'mtb', 'fnb'])
    for (const theme of THEME_LIST) {
      checkPalette(`${theme.id} dark`, darkPalette(theme))
      checkPalette(`${theme.id} light`, theme.light)
    }
  })
})
