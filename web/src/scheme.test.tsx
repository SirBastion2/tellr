// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { THEMES } from './theme/registry'
import { schemeNeedsCompact } from './theme/scheme'
import { COLOR_STORAGE_KEY, THEME_STORAGE_KEY } from './theme/tokens'

function isPillRadius(value: string): boolean {
  return value === 'var(--tc-radius-control, 999px)' || value === '999px'
}

describe('color scheme', () => {
  it('collapses the scheme segment from measured content width, not a 1280px breakpoint', () => {
    const wide = {
      available: 1600,
      brand: 260,
      status: 280,
      nav: 420,
      schemeFull: 220,
      help: 48,
      gap: 8,
    }
    expect(schemeNeedsCompact(wide)).toBe(false)
    expect(schemeNeedsCompact({ ...wide, available: 1100 })).toBe(true)
    expect(schemeNeedsCompact({ ...wide, available: 0 })).toBe(false)
  })

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

  it('draws every segment layer as one inset pill and fills the track', () => {
    const css = readFileSync('src/index.css', 'utf8')
    const segment = css.match(/\.tc-segment\s*\{[^}]*\}/)
    const track = css.match(/\.tc-header \.tc-scheme-full\s*\{[^}]*\}/)
    const layers = css.match(
      /\.tc-segment > button,\s*\.tc-segment > button:hover,[\s\S]*?\.tc-segment > button\[aria-pressed='false'\]\s*\{[^}]*\}/,
    )
    const generated = css.match(
      /\.tc-segment > button::before,[\s\S]*?\.tc-segment > button\[aria-pressed='false'\]::after\s*\{[^}]*\}/,
    )
    const radius = /border-radius:\s*var\(--tc-radius-control,\s*999px\)\s*!important/
    expect(segment?.[0]).toMatch(/border-radius:\s*var\(--tc-radius-control,\s*999px\)/)
    expect(segment?.[0]).toMatch(/background:\s*var\(--tc-secondary-bg,\s*#f8fafc\)/)
    expect(segment?.[0]).toMatch(/padding:\s*var\(--tc-space-1,\s*4px\)/)
    expect(segment?.[0]).toMatch(/overflow:\s*hidden/)
    expect(track?.[0]).toMatch(/padding:\s*var\(--tc-space-1,\s*4px\)/)
    expect(track?.[0]).toMatch(/background:\s*var\(--tc-secondary-bg,\s*#f8fafc\)/)
    expect(track?.[0]).toMatch(/overflow:\s*visible/)
    expect(track?.[0]).not.toMatch(/overflow:\s*hidden/)
    expect(layers?.[0]).toMatch(/:focus/)
    expect(layers?.[0]).toMatch(/:focus-visible/)
    expect(layers?.[0]).toMatch(/:active/)
    expect(layers?.[0]).toMatch(/appearance:\s*none/)
    expect(layers?.[0]).toMatch(radius)
    expect(layers?.[0]).not.toMatch(/clip-path/)
    expect(layers?.[0]).not.toMatch(/:first-child|:last-child|nth-child/)
    expect(generated?.[0]).toMatch(/::before/)
    expect(generated?.[0]).toMatch(/::after/)
    expect(generated?.[0]).toMatch(radius)
    expect(css).toMatch(/--tc-space-1:\s*4px/)
    expect(css).toMatch(/--tc-radius-control:\s*999px/)
    expect(css).not.toMatch(/\[data-theme=(?:tellr|pnc|mtb|fnb)\][^{]*tc-segment/)
    expect(css).not.toMatch(/border-radius:\s*0/)

    const style = document.createElement('style')
    style.textContent = `:root{--tc-space-1:4px;--tc-radius-control:999px;--tc-header-radius:999px}${segment?.[0] ?? ''}${track?.[0] ?? ''}${layers?.[0] ?? ''}${generated?.[0] ?? ''}`
    document.head.appendChild(style)
    try {
      for (const themeId of ['tellr', 'pnc', 'mtb', 'fnb'] as const) {
        window.localStorage.clear()
        window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
        window.history.replaceState({}, '', `/?theme=${themeId}`)
        const { unmount } = render(<App />)
        const root = screen.getByTestId('theme-root')
        const trackEl = screen.getByTestId('color-scheme')
        const trackStyle = getComputedStyle(trackEl)
        expect(root.style.getPropertyValue('--tc-secondary-bg'), themeId).toBe(THEMES[themeId]?.secondaryBg)
        expect(root.style.getPropertyValue('--tc-secondary-border'), themeId).toBe(THEMES[themeId]?.secondaryBorder)
        expect(trackStyle.overflow, themeId).toBe('visible')
        expect(isPillRadius(trackStyle.borderRadius), themeId).toBe(true)
        expect(screen.queryByTestId('speed-control'), themeId).toBeNull()

        fireEvent.click(screen.getByTestId('scheme-light'))
        expect(root.style.getPropertyValue('--tc-secondary-bg'), `${themeId} light`).toBe(
          THEMES[themeId]?.light.secondaryBg,
        )
        expect(root.style.getPropertyValue('--tc-secondary-border'), `${themeId} light`).toBe(
          THEMES[themeId]?.light.secondaryBorder,
        )

        for (const id of ['dark', 'light', 'system'] as const) {
          fireEvent.click(screen.getByTestId(`scheme-${id}`))
          for (const option of ['light', 'dark', 'system']) {
            const button = screen.getByTestId(`scheme-${option}`)
            const label = option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System'
            expect(button.getAttribute('aria-pressed'), `${themeId} ${option}`).toBe(option === id ? 'true' : 'false')
            expect(button.textContent, `${themeId} ${option}`).toBe(label)
            expect(button.style.borderRadius, `${themeId} ${option} inline`).toContain('999px')
            expect(button.style.backgroundColor, `${themeId} ${option}`).toBe(
              option === id ? 'var(--tc-button)' : 'var(--tc-secondary-bg)',
            )
            const painted = getComputedStyle(button)
            expect(isPillRadius(painted.borderRadius), `${themeId} ${id} ${option}`).toBe(true)
            button.focus()
            expect(isPillRadius(getComputedStyle(button).borderRadius), `${themeId} ${option} focus`).toBe(true)
          }
        }

        unmount()
      }
    } finally {
      style.remove()
      window.history.replaceState({}, '', '/')
    }
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
