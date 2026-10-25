// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CUSTOMERS } from './demo/customers'
import { TransactionPanel } from './workstation/TransactionPanel'

function contractor() {
  const customer = CUSTOMERS.find((item) => item.id === 'contractor-cash')
  if (!customer) {
    throw new Error('missing contractor-cash')
  }
  return customer
}

function pastRule(css: string): string {
  const match = css.match(/\.tc-timeline > \[data-past='true'\]\s*\{([^}]*)\}/)
  if (!match?.[1]) {
    throw new Error('missing past-step timeline rule')
  }
  return match[1]
}

describe('home timeline previous steps', () => {
  it('dims steps before the current step and leaves the current step at full brightness', () => {
    const customer = contractor()
    expect(customer.events.length).toBeGreaterThan(5)
    const css = readFileSync('src/index.css', 'utf8')
    const rule = pastRule(css)
    expect(rule).toMatch(/opacity:\s*0\.55/)
    const style = document.createElement('style')
    style.textContent = `.tc-timeline > [data-past='true'] { ${rule} }`
    document.head.appendChild(style)

    try {
      const mid = render(<TransactionPanel customer={customer} fired={3} showCase={false} onToggleCase={() => undefined} />)
      const early = screen.getAllByTestId('demo-event')
      expect(early).toHaveLength(3)
      expect(early[0]?.getAttribute('data-past')).toBe('true')
      expect(early[1]?.getAttribute('data-past')).toBe('true')
      expect(Number(getComputedStyle(early[0]!).opacity)).toBeCloseTo(0.55, 2)
      expect(Number(getComputedStyle(early[1]!).opacity)).toBeCloseTo(0.55, 2)
      expect(early[2]?.getAttribute('data-current')).toBe('true')
      expect(early[2]?.hasAttribute('data-past')).toBe(false)
      expect(Number(getComputedStyle(early[2]!).opacity)).toBe(1)
      expect(screen.getAllByTestId('event-marker').map((row) => row.textContent ?? '')).toEqual([
        expect.stringMatching(/^Step 1 ·/),
        expect.stringMatching(/^Step 2 ·/),
        expect.stringMatching(/^Step 3 ·/),
      ])
      mid.unmount()

      render(<TransactionPanel customer={customer} fired={customer.events.length} showCase={false} onToggleCase={() => undefined} />)
      const steps = screen.getAllByTestId('demo-event')
      expect(steps).toHaveLength(customer.events.length)
      for (const [index, step] of steps.slice(0, -1).entries()) {
        expect(step.getAttribute('data-past'), `step ${index + 1}`).toBe('true')
        expect(step.getAttribute('data-current'), `step ${index + 1}`).toBe('false')
        expect(Number(getComputedStyle(step).opacity), `step ${index + 1}`).toBeCloseTo(0.55, 2)
      }
      const current = steps.at(-1)
      if (!current) {
        throw new Error('missing current step')
      }
      expect(current.getAttribute('data-current')).toBe('true')
      expect(current.hasAttribute('data-past')).toBe(false)
      expect(Number(getComputedStyle(current).opacity)).toBe(1)
      expect(screen.getAllByTestId('event-marker').map((row) => row.textContent ?? '')).toEqual(
        customer.events.map((_, index) => expect.stringMatching(new RegExp(`^Step ${index + 1} ·`))),
      )
    } finally {
      style.remove()
    }
  })
})
