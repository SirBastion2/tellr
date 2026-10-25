// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { THEMES } from './theme/registry'
import { COLOR_STORAGE_KEY } from './theme/tokens'

describe('color scheme', () => {
  it('toggles light and dark and opts out of forced darkening', () => {
    const html = readFileSync('index.html', 'utf8')
    const css = readFileSync('src/index.css', 'utf8')
    expect(html).toMatch(/<meta name="color-scheme" content="light dark"\s*\/?>/)
    expect(html).toMatch(/<meta name="darkreader-lock"\s*\/?>/)
    expect(css).toMatch(/color-scheme:\s*light dark/)
    expect(css).toMatch(/@media \(forced-colors:\s*active\)/)
    expect(css).toMatch(/@media \(prefers-contrast:\s*more\)/)
    expect(css).toMatch(/ButtonText/)
    expect(css).toMatch(/CanvasText/)

    window.localStorage.clear()
    render(<App />)
    const root = screen.getByTestId('theme-root')
    expect(root.getAttribute('data-scheme')).toBe('dark')
    expect(root.style.getPropertyValue('--tc-text')).toBe(THEMES.tellr?.text)
    expect(root.style.colorScheme).toBe('dark')

    fireEvent.click(screen.getByTestId('scheme-light'))
    expect(root.getAttribute('data-scheme')).toBe('light')
    expect(document.documentElement.getAttribute('data-color-scheme')).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(root.style.getPropertyValue('--tc-text')).toBe(THEMES.tellr?.light.text)
    expect(root.style.getPropertyValue('--tc-bg-color')).toBe(THEMES.tellr?.light.background.color)
    expect(window.localStorage.getItem(COLOR_STORAGE_KEY)).toBe('light')

    fireEvent.click(screen.getByTestId('scheme-dark'))
    expect(root.getAttribute('data-scheme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-color-scheme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(root.style.getPropertyValue('--tc-secondary-fg')).toBe(THEMES.tellr?.secondaryFg)
    expect(root.style.getPropertyValue('--tc-secondary-bg')).toBe(THEMES.tellr?.secondaryBg)

    fireEvent.click(screen.getByTestId('scheme-system'))
    expect(root.getAttribute('data-scheme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-color-scheme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(window.localStorage.getItem(COLOR_STORAGE_KEY)).toBe('system')
  })

  it('paints every select popup from theme tokens in both schemes and forced colors', () => {
    const css = readFileSync('src/index.css', 'utf8')
    expect(css).toContain("html[data-color-scheme='dark'] select")
    expect(css).toContain("[data-scheme='dark'] select")
    expect(css).toContain("html[data-color-scheme='light'] select")
    expect(css).toContain("[data-scheme='light'] select")
    expect(css).toMatch(/color-scheme:\s*dark\s*;/)
    expect(css).toMatch(/color-scheme:\s*light\s*;/)

    const popup = css.slice(css.indexOf('Native select popup'), css.indexOf(':root {'))
    expect(popup).toContain('select option')
    expect(popup).toContain('var(--tc-surface')
    expect(popup).toContain('var(--tc-text')
    expect(popup).toContain('option:hover')
    expect(popup).toContain('option:checked')
    expect(popup).toContain('var(--tc-button')
    expect(popup).toContain('var(--tc-button-text')
    expect(popup).not.toContain('--tc-input')

    const contrast = css.slice(css.indexOf('@media (prefers-contrast: more)'), css.indexOf('@media (forced-colors: active)'))
    expect(contrast).toContain('select option')
    expect(contrast).toContain('var(--tc-surface')
    expect(contrast).toContain('var(--tc-button-text')

    const forced = css.slice(css.indexOf('@media (forced-colors: active)'), css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(forced).toContain('select option')
    expect(forced).toContain('FieldText')
    expect(forced).toContain('HighlightText')
    expect(forced).toContain('color-scheme: light dark')

    window.localStorage.clear()
    render(<App />)
    const picker = screen.getByTestId('customer-picker')
    expect(picker.tagName).toBe('SELECT')
    expect(picker.querySelectorAll('option').length).toBeGreaterThan(1)
    expect(screen.getByTestId('theme-root').getAttribute('data-scheme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-color-scheme')).toBe('dark')
  })
})
