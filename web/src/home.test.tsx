import libraryJson from '../../contract/library.json'
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { HomeScreen } from './screens/HomeScreen'
import './index.css'
import { THEME_IDS } from './theme/registry'
import { DENSITY } from './theme/tokens'
import type { Library } from './types'

const library = libraryJson as Library

function demo(overrides: Partial<DemoView> = {}): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: CUSTOMERS[0]?.id ?? '',
    index: 0,
    playing: false,
    speed: 1,
    pending: false,
    showCase: false,
    confirmed: [],
    presenter: false,
    elapsedMs: 0,
    onSelectCustomer: () => undefined,
    onPlay: () => undefined,
    onPause: () => undefined,
    onStep: () => undefined,
    onRestart: () => undefined,
    onSpeed: () => undefined,
    onToggleCase: () => undefined,
    onConfirmSignal: () => undefined,
    onDismissSignal: () => undefined,
    onRestoreSignal: () => undefined,
    onEscalate: () => undefined,
    ...overrides,
  }
}

describe('Home shell', () => {
  it('renders the simulated customer controls', () => {
    const onPlay = vi.fn()
    render(<HomeScreen library={library} session={null} demo={demo({ onPlay })} />)
    expect(screen.getByRole('heading', { name: 'Workstation' })).toBeTruthy()
    expect(screen.queryByTestId('library-version')).toBeNull()
    expect(screen.queryByTestId('copy-status')).toBeNull()
    expect(screen.queryByText(/Copy status/)).toBeNull()
    expect(screen.getByTestId('customer-picker')).toBeTruthy()
    expect(screen.queryByTestId('scenario-picker')).toBeNull()
    expect(screen.getByTestId('synthetic-banner').textContent).toBe('Practice data.')
    fireEvent.click(screen.getByTestId('demo-play'))
    expect(onPlay).toHaveBeenCalledOnce()
  })

  it('uses the shared screen gap between the Workstation heading and the toolbar', () => {
    const screenRule = readFileSync('src/index.css', 'utf8').match(/\.tc-screen\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(screenRule).toMatch(/display:\s*grid/)
    expect(screenRule).toMatch(/gap:\s*var\(--tc-space-body-control/)
    expect(screenRule).not.toMatch(/min-height/)

    const gaps: string[] = []
    for (const themeId of THEME_IDS) {
      window.history.replaceState({}, '', `/?theme=${themeId}`)
      const view = render(<App />)
      const home = screen.getByTestId('home-screen')
      const heading = screen.getByRole('heading', { name: 'Workstation' })
      const toolbar = screen.getByTestId('demo-toolbar')
      expect(screen.getByTestId('theme-root').getAttribute('data-theme'), themeId).toBe(themeId)
      expect(home.className, themeId).toContain('tc-screen')
      expect(heading.className, themeId).toContain('tc-title')
      expect(heading.parentElement, themeId).toBe(home)
      expect(heading.nextElementSibling, themeId).toBe(toolbar)
      expect(home.children[0], themeId).toBe(heading)
      expect(home.children[1], themeId).toBe(toolbar)
      const headingStyle = getComputedStyle(heading)
      expect(Number.parseFloat(headingStyle.marginTop), themeId).toBe(0)
      expect(Number.parseFloat(headingStyle.marginBottom), themeId).toBe(0)
      const token = getComputedStyle(home).getPropertyValue('--tc-space-body-control').trim()
      expect(token, themeId).toBe(DENSITY.spaceBodyControl)
      gaps.push(`${themeId}:${token}`)
      view.unmount()
    }
    expect(gaps).toEqual(THEME_IDS.map((themeId) => `${themeId}:${DENSITY.spaceBodyControl}`))
  })
})
