import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App, AppShell } from './App'
import { THEME_IDS, THEMES } from './theme/registry'
import { resolveThemeId } from './theme/resolve'
import { DEFAULT_THEME_ID, FOOTER_TEXT, THEME_STORAGE_KEY } from './theme/tokens'
import type { Library, SessionState } from './types'

const library = libraryJson as Library
const opener = t1.steps[0]?.response as SessionState
const known = ['tellr', 'mtb', 'fnb', 'pnc'] as const

function at(search: string) {
  const path = search.length > 0 ? `/${search}` : '/'
  window.history.replaceState({}, '', path)
  return render(<App />)
}

describe('theme selection', () => {
  it('resolves the query, then storage, then tellr', () => {
    expect(resolveThemeId(null, null, known)).toBe(DEFAULT_THEME_ID)
    expect(resolveThemeId('mtb', 'fnb', known)).toBe('mtb')
    expect(resolveThemeId('MTB', null, known)).toBe('mtb')
    expect(resolveThemeId('  pnc  ', 'tellr', known)).toBe('pnc')
    expect(resolveThemeId(null, 'fnb', known)).toBe(DEFAULT_THEME_ID)
    expect(resolveThemeId('', 'pnc', known)).toBe(DEFAULT_THEME_ID)
    expect(resolveThemeId('not-a-bank', null, known)).toBe(DEFAULT_THEME_ID)
    expect(resolveThemeId('not-a-bank', 'fnb', known)).toBe('fnb')
    expect(resolveThemeId('not-a-bank', 'also-missing', known)).toBe(DEFAULT_THEME_ID)
  })

  it('registers one theme file per bank', () => {
    expect([...THEME_IDS]).toEqual(['tellr', 'pnc', 'mtb', 'fnb'])
    for (const id of THEME_IDS) {
      const theme = THEMES[id]
      expect(theme?.id, id).toBe(id)
      expect(theme?.footerText, id).toBe(FOOTER_TEXT)
      expect(theme?.fontFamily.length, id).toBeGreaterThan(0)
      expect(theme?.fontWeight, id).toBeGreaterThan(0)
      expect(theme?.headingWeight, id).toBeGreaterThan(0)
      expect(theme?.radius.card.length, id).toBeGreaterThan(0)
      expect(theme?.radius.control.length, id).toBeGreaterThan(0)
      expect(theme?.border.width.length, id).toBeGreaterThan(0)
      expect(theme?.shadow.card.length, id).toBeGreaterThan(0)
      expect(theme?.space.gap.length, id).toBeGreaterThan(0)
      expect(theme?.glass.fallback.length, id).toBeGreaterThan(0)
      expect(theme?.risk.clearFg.length, id).toBeGreaterThan(0)
      for (const image of [theme?.background.image ?? '', theme?.light.background.image ?? '']) {
        expect(image.includes('transparent'), id).toBe(false)
        expect(image.includes('oklch'), id).toBe(false)
        expect(image.includes('color-mix'), id).toBe(false)
        expect(/ellipse\s+\d+(?:\.\d+)?%/.test(image), id).toBe(false)
        expect(image.includes('linear-gradient'), id).toBe(true)
      }
      expect(theme?.background.color.startsWith('#'), id).toBe(true)
      expect(theme?.light.background.color.startsWith('#'), id).toBe(true)
      expect(theme?.light.text.length, id).toBeGreaterThan(0)
      expect(theme?.secondaryFg.length, id).toBeGreaterThan(0)
      expect(theme?.name.length, id).toBeGreaterThan(0)
      expect(theme?.wordmark.length, id).toBeGreaterThan(0)
      expect(theme?.background.image.length, id).toBeGreaterThan(0)
      expect(theme?.glass.fill.length, id).toBeGreaterThan(0)
      expect(theme?.glass.border.length, id).toBeGreaterThan(0)
      expect(theme?.glass.blur.length, id).toBeGreaterThan(0)
      expect(theme?.text.length, id).toBeGreaterThan(0)
      expect(theme?.mutedText.length, id).toBeGreaterThan(0)
      expect(theme?.inputFill.length, id).toBeGreaterThan(0)
      expect(theme?.accent.length, id).toBeGreaterThan(0)
      expect(theme?.button.length, id).toBeGreaterThan(0)
      expect(theme?.progress.active.length, id).toBeGreaterThan(0)
      expect(theme?.progress.inactive.length, id).toBeGreaterThan(0)
    }
    expect(THEMES.tellr?.fontFamily.startsWith('Poppins')).toBe(true)
    expect(THEMES.tellr?.logo).toBe('image')
    expect(THEMES.tellr?.mark).toBe('logo')
    expect(THEMES.mtb?.mark).toBe('text')
    expect(THEMES.mtb?.markPlacement).toBe('bottom-left')
    expect(THEMES.mtb?.footerPlacement).toBe('end')
  })

  it('uses tellr when nothing is chosen', () => {
    window.localStorage.clear()
    at('')
    const root = screen.getByTestId('theme-root')
    expect(root.getAttribute('data-theme')).toBe('tellr')
    expect(root.style.getPropertyValue('--tc-text')).toBe(THEMES.tellr?.text)
    expect(root.style.getPropertyValue('--tc-accent')).toBe(THEMES.tellr?.accent)
    expect(root.style.getPropertyValue('--tc-font')).toContain('Poppins')
    expect(screen.getByTestId('theme-wordmark').textContent).toContain('tellr')
    expect(screen.getByTestId('theme-logo')).toBeTruthy()
    expect(screen.getByTestId('theme-footer').textContent).toBe(FOOTER_TEXT)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('selects a theme from the query and stores it', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'fnb')
    at('?theme=mtb')
    const root = screen.getByTestId('theme-root')
    expect(root.getAttribute('data-theme')).toBe('mtb')
    expect(root.style.getPropertyValue('--tc-text')).toBe(THEMES.mtb?.text)
    expect(root.style.getPropertyValue('--tc-glass-fill')).toBe(THEMES.mtb?.glass.fill)
    expect(root.style.getPropertyValue('--tc-button')).toBe(THEMES.mtb?.button)
    expect(screen.getByTestId('theme-wordmark').textContent).toContain('M&T Bank')
    expect(screen.queryByTestId('theme-logo')).toBeNull()
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('mtb')
  })

  it('keeps stored theme for an unknown query but first load without a query is tellr', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'pnc')
    at('')
    expect(screen.getByTestId('theme-root').getAttribute('data-theme')).toBe('tellr')
    expect(screen.getByTestId('theme-wordmark').textContent).toContain('tellr')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('pnc')
  })

  it('falls back to the stored theme when the query is unknown', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'fnb')
    at('?theme=not-a-bank')
    expect(screen.getByTestId('theme-root').getAttribute('data-theme')).toBe('fnb')
    expect(screen.getByTestId('theme-wordmark').textContent).toContain('F.N.B.')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('fnb')
  })

  it('falls back to tellr when the query and storage are both unknown', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'casino')
    at('?theme=nope')
    expect(screen.getByTestId('theme-root').getAttribute('data-theme')).toBe('tellr')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('casino')
  })

  it('keeps the page in normal flow without an unlabeled dot column', () => {
    const session = { ...opener, answers: 2 }
    render(
      <MemoryRouter>
        <AppShell
          library={library}
          session={session}
          issues={[]}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('theme-progress')).toBeNull()
    expect(screen.queryByTestId('theme-progress-dot')).toBeNull()
    expect(getComputedStyle(screen.getByTestId('theme-page')).alignItems).toBe('stretch')
    expect(getComputedStyle(screen.getByTestId('theme-page')).flexDirection).toBe('column')
    expect(screen.getByTestId('theme-card')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Teller Copilot' })).toBeTruthy()
  })
})
