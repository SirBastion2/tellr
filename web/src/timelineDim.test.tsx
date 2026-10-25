import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CUSTOMERS } from './demo/customers'
import { StepCard } from './workstation/TransactionPanel'

function contractor() {
  const customer = CUSTOMERS.find((item) => item.id === 'contractor-cash')
  if (!customer) {
    throw new Error('missing contractor-cash')
  }
  return customer
}

describe('home current step card', () => {
  it('shows only the current step, not the earlier timeline rows', () => {
    const customer = contractor()
    expect(customer.events.length).toBeGreaterThan(5)
    render(<StepCard customer={customer} fired={3} />)
    expect(screen.getAllByTestId('demo-event')).toHaveLength(1)
    expect(screen.getByTestId('event-marker').textContent).toMatch(/^Step 3 · 0:32/)
    expect(screen.queryByText(/Step 1 ·/)).toBeNull()
    expect(screen.queryByText(/Step 2 ·/)).toBeNull()
    expect(screen.queryByTestId('demo-timeline')).toBeNull()
    expect(screen.queryByTestId('event-progress')).toBeNull()
  })
})
