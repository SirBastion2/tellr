import { describe, expect, it } from 'vitest'
import { THEME_LIST } from './theme/registry'

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

describe('theme contrast', () => {
  it('keeps text, buttons, and risk states at WCAG AA for every bank', () => {
    expect(THEME_LIST.map((theme) => theme.id)).toEqual(['fnb', 'mtb', 'pnc', 'tellr'])
    for (const theme of THEME_LIST) {
      const page = theme.background.color
      const glass = channels(theme.glass.fill)
      const card = composite(`rgba(${glass[0]}, ${glass[1]}, ${glass[2]}, ${glass[3]})`, page)
      expect(contrast(theme.text, page), `${theme.id} text on field`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.text, card), `${theme.id} text on glass`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.mutedText, page), `${theme.id} muted on field`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.buttonText, theme.button), `${theme.id} primary button`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.text, theme.glass.fallback), `${theme.id} text on fallback`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.risk.clearFg, theme.risk.clearBg), `${theme.id} clear`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.risk.cautionFg, theme.risk.cautionBg), `${theme.id} caution`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.risk.highFg, theme.risk.highBg), `${theme.id} high`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
