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
    expect(root.style.getPropertyValue('--tc-text')).toBe(THEMES.tellr?.light.text)
    expect(root.style.getPropertyValue('--tc-bg-color')).toBe(THEMES.tellr?.light.background.color)
    expect(window.localStorage.getItem(COLOR_STORAGE_KEY)).toBe('light')

    fireEvent.click(screen.getByTestId('scheme-dark'))
    expect(root.getAttribute('data-scheme')).toBe('dark')
    expect(root.style.getPropertyValue('--tc-secondary-fg')).toBe(THEMES.tellr?.secondaryFg)
    expect(root.style.getPropertyValue('--tc-secondary-bg')).toBe(THEMES.tellr?.secondaryBg)
  })
})
