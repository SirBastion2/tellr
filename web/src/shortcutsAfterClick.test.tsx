import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockRequest, resetMock } from '../mock/replay'
import { App } from './App'

function http(status: number, body: unknown) {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  })
}

function installFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? init.body : undefined
      const path = url.replace(/^https?:\/\/[^/]+/, '')
      const result = mockRequest(method, path, body ? (JSON.parse(body) as unknown) : undefined)
      return http(result.status, result.body)
    }),
  )
}

function themeId(): string | null {
  return screen.getByTestId('theme-root').getAttribute('data-theme')
}

/** A click focuses the control. jsdom does not, so focus it the way the browser does. */
function clickIcon(element: HTMLElement) {
  fireEvent.click(element)
  element.focus()
  expect(document.activeElement).toBe(element)
}

describe('shortcuts after an icon click', () => {
  beforeEach(() => {
    resetMock()
  })
  afterEach(() => {
    resetMock()
    vi.unstubAllGlobals()
  })

  it('fires a shortcut after a toolbar, scheme, or chip button is clicked', async () => {
    installFetch()
    render(<App />)
    expect(themeId()).toBe('tellr')

    const step = screen.getByTestId('demo-step')
    clickIcon(step)
    fireEvent.keyDown(step, { key: 't' })
    expect(themeId()).toBe('pnc')

    const speed = screen.getByTestId('demo-speed-2')
    clickIcon(speed)
    fireEvent.keyDown(speed, { key: 'p' })
    expect(screen.getByTestId('demo-play').getAttribute('aria-pressed')).toBe('true')

    const scheme = screen.getByTestId('scheme-dark')
    clickIcon(scheme)
    scheme.addEventListener('keydown', (event) => event.stopPropagation())
    fireEvent.keyDown(scheme, { key: 't' })
    expect(themeId()).toBe('mtb')

    const picker = screen.getByTestId('customer-picker')
    picker.focus()
    expect(document.activeElement).toBe(picker)
    fireEvent.keyDown(picker, { key: 't' })
    fireEvent.keyDown(picker, { key: 'p' })
    expect(themeId()).toBe('mtb')
    expect(screen.getByTestId('demo-play').getAttribute('aria-pressed')).toBe('true')

    scheme.focus()
    expect(fireEvent.keyDown(scheme, { key: 'Enter' })).toBe(true)
    expect(fireEvent.keyDown(scheme, { key: ' ' })).toBe(true)
    expect(themeId()).toBe('mtb')

    fireEvent.click(screen.getByTestId('demo-step'))
    await screen.findByTestId('event-caption')
    await waitFor(() => {
      expect(screen.getByTestId('event-caption').textContent ?? '').not.toMatch(/^Customer File$/)
    })
    fireEvent.click(screen.getByTestId('demo-step'))
    const confirm = await screen.findByTestId('signal-confirm')
    await waitFor(() => {
      expect((confirm as HTMLButtonElement).disabled).toBe(false)
    })
    clickIcon(confirm)
    confirm.addEventListener('keydown', (event) => event.stopPropagation())
    fireEvent.keyDown(confirm, { key: 't' })
    expect(themeId()).toBe('fnb')

    fireEvent.click(screen.getByTestId('shortcut-help-button'))
    const help = screen.getByTestId('shortcut-help')
    const close = screen.getByTestId('shortcut-close')
    expect(document.activeElement).toBe(close)
    expect(screen.queryByTestId('shortcut-scope')).toBeNull()
    expect(help.textContent ?? '').not.toMatch(/These keys work on every screen/)
    expect(help.textContent ?? '').not.toMatch(/Ctrl, Alt, or Cmd/)
    expect(help.textContent ?? '').toMatch(/Switch bank theme/)
    fireEvent.keyDown(close, { key: 't' })
    expect(themeId()).toBe('tellr')
  })
})
