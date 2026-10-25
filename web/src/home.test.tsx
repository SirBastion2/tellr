import libraryJson from '../../contract/library.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { HomeScreen } from './screens/HomeScreen'
import './index.css'
import { THEME_IDS } from './theme/registry'
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
    const onToggleCase = vi.fn()
    render(<HomeScreen library={library} session={null} demo={demo({ onPlay, onToggleCase })} />)
    const home = screen.getByTestId('home-screen')
    const toolbar = screen.getByTestId('demo-toolbar')
    expect(screen.queryByRole('heading', { name: 'Workstation' })).toBeNull()
    expect(screen.queryByText('Workstation')).toBeNull()
    expect(screen.queryByTestId('library-version')).toBeNull()
    expect(screen.queryByTestId('copy-status')).toBeNull()
    expect(screen.queryByText(/Copy status/)).toBeNull()
    const grid = home.querySelector(':scope > .tc-workstation')
    const column = grid?.querySelector(':scope > .tc-home-column')
    expect(grid).toBe(home.children[0])
    expect(column?.firstElementChild).toBe(toolbar)
    expect(grid?.children[1]).toBe(screen.getByTestId('copilot-strip'))
    expect(home.querySelector(':scope > .tc-toolbar')).toBeNull()
    const link = screen.getByTestId('case-file-toggle')
    expect(screen.getAllByTestId('case-file-toggle')).toHaveLength(1)
    expect(toolbar.contains(link)).toBe(false)
    const heading = screen.getByRole('heading', { name: 'Transaction' })
    expect(heading.parentElement).toBe(link.parentElement)
    expect(screen.getByTestId('transaction-panel').contains(link)).toBe(true)
    expect(screen.getByText('Simulated customer')).toBeTruthy()
    expect(screen.getByTestId('customer-picker')).toBeTruthy()
    expect(screen.queryByTestId('scenario-picker')).toBeNull()
    expect(screen.getByTestId('synthetic-banner').textContent).toBe('Practice data.')
    fireEvent.click(screen.getByTestId('demo-play'))
    expect(onPlay).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByTestId('case-file-toggle'))
    expect(onToggleCase).toHaveBeenCalledOnce()
  })

  it('starts at the simulated customer bar with no extra top margin', () => {
    for (const themeId of THEME_IDS) {
      window.history.replaceState({}, '', `/?theme=${themeId}`)
      const view = render(<App />)
      const home = screen.getByTestId('home-screen')
      const toolbar = screen.getByTestId('demo-toolbar')
      expect(screen.getByTestId('theme-root').getAttribute('data-theme'), themeId).toBe(themeId)
      expect(screen.queryByRole('heading', { name: 'Workstation' }), themeId).toBeNull()
      expect(screen.getByRole('heading', { name: 'Teller Copilot' }), themeId).toBeTruthy()
      const grid = home.querySelector(':scope > .tc-workstation')
      const column = grid?.querySelector(':scope > .tc-home-column')
      const panel = screen.getByTestId('transaction-panel')
      const link = screen.getByTestId('case-file-toggle')
      expect(grid, themeId).toBe(home.children[0])
      expect(column?.firstElementChild, themeId).toBe(toolbar)
      expect(grid?.children[1], themeId).toBe(screen.getByTestId('copilot-strip'))
      expect(toolbar.contains(link), themeId).toBe(false)
      expect(screen.getAllByTestId('case-file-toggle'), themeId).toHaveLength(1)
      expect(panel.contains(link), themeId).toBe(true)
      expect(screen.getByRole('heading', { name: 'Transaction' }).parentElement, themeId).toBe(link.parentElement)
      const homeStyle = getComputedStyle(home)
      const toolbarStyle = getComputedStyle(toolbar)
      const panelStyle = getComputedStyle(panel)
      expect(Number.parseFloat(homeStyle.marginTop), themeId).toBe(0)
      expect(Number.parseFloat(homeStyle.paddingTop), themeId).toBe(0)
      expect(Number.parseFloat(toolbarStyle.marginTop), themeId).toBe(0)
      expect(Number.parseFloat(toolbarStyle.paddingTop), themeId).toBe(0)
      expect(Number.parseFloat(panelStyle.paddingTop), themeId).toBe(0)
      expect(Number.parseFloat(getComputedStyle(screen.getByTestId('copilot-strip')).marginTop), themeId).toBe(0)
      view.unmount()
    }
  })
})
