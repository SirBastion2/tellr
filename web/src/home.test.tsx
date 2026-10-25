import libraryJson from '../../contract/library.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CUSTOMERS } from './demo/customers'
import type { DemoView } from './demo/types'
import { HomeScreen } from './screens/HomeScreen'
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
  it('renders labeled library fields and the simulated customer controls', () => {
    const onPlay = vi.fn()
    render(<HomeScreen library={library} session={null} demo={demo({ onPlay })} />)
    expect(screen.getByTestId('library-version').textContent).toBe(library.library_version)
    expect(screen.getByTestId('copy-status').textContent).toBe(library.copy_status)
    expect(screen.getByText(/Library/)).toBeTruthy()
    expect(screen.getByTestId('customer-picker')).toBeTruthy()
    expect(screen.queryByTestId('scenario-picker')).toBeNull()
    expect(screen.getByTestId('synthetic-banner').textContent).toMatch(/Practice data/)
    expect(screen.getByTestId('synthetic-banner').textContent).toMatch(/not sent to the copilot/)
    fireEvent.click(screen.getByTestId('demo-play'))
    expect(onPlay).toHaveBeenCalledOnce()
  })
})
