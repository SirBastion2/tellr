import t1 from '../../contract/fixtures/T1.json'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App, AppShell } from './App'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import type { SessionState } from './types'

const session = t1.steps[0]?.response as SessionState

function demo(): DemoView {
  return {
    customers: CUSTOMERS,
    customerId: CUSTOMERS[0]?.id ?? '',
    index: 1,
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
  }
}

describe('App', () => {
  it('renders the shell', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Teller Copilot' })).toBeTruthy()
  })

  it('keeps Undo on the workstation signal list and off the customer file', () => {
    const view = demo()
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell library={null} session={session} issues={[]} demo={view} onUndo={() => undefined} />
      </MemoryRouter>,
    )
    const undo = screen.getByTestId('undo')
    expect(screen.getByTestId('copilot-strip').contains(undo)).toBe(true)
    rerender(
      <MemoryRouter initialEntries={['/customer']}>
        <AppShell library={null} session={session} issues={[]} demo={view} onUndo={() => undefined} />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('undo')).toBeNull()
    expect(screen.getByTestId('customer-screen')).toBeTruthy()
  })

  it('leaves a gap between the header and the workstation or outcome heading', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell library={null} session={session} issues={[]} demo={demo()} />
      </MemoryRouter>,
    )
    expect(getComputedStyle(screen.getByTestId('app-shell')).gap).not.toBe('0px')
    rerender(
      <MemoryRouter initialEntries={[`/sessions/${session.session_id}/outcome`]}>
        <AppShell library={null} session={session} issues={[]} />
      </MemoryRouter>,
    )
    expect(getComputedStyle(screen.getByTestId('app-shell')).gap).not.toBe('0px')
    expect(screen.getByTestId('outcome-screen')).toBeTruthy()
  })
})
