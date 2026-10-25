import { describe, expect, it } from 'vitest'
import { CUSTOMERS, SCRIPT_TARGETS_MS, scriptDurationMs, scriptSignals } from './customers'

describe('synthetic customers', () => {
  it('ships five original files, including two with no signals', () => {
    expect(CUSTOMERS).toHaveLength(5)
    const benign = CUSTOMERS.filter((customer) => scriptSignals(customer).length === 0)
    expect(benign.map((customer) => customer.id).sort()).toEqual(['benign-car', 'benign-routine'])
    const coached = CUSTOMERS.filter((customer) => scriptSignals(customer).length > 0)
    expect(coached.length).toBe(3)
    for (const customer of CUSTOMERS) {
      expect(customer.profile.name.length).toBeGreaterThan(0)
      expect(customer.profile.ageBand.length).toBeGreaterThan(0)
      expect(customer.transaction.amountBand).toBe('5000_9999')
      expect(customer.activity.every((row) => row.amount.length > 0)).toBe(true)
    }
  })

  it('paces scripts for a narrated demo and halves them at 2×', () => {
    for (const customer of CUSTOMERS) {
      const target = SCRIPT_TARGETS_MS[customer.id]
      if (target === undefined) {
        throw new Error(`missing target for ${customer.id}`)
      }
      expect(scriptDurationMs(customer, 1), customer.id).toBe(target)
      expect(scriptDurationMs(customer, 2), customer.id).toBe(target / 2)
      expect(scriptDurationMs(customer, 4), customer.id).toBe(target / 4)
    }
  })
})
