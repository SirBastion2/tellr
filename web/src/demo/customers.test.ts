import { describe, expect, it } from 'vitest'
import { CUSTOMERS, scriptSignals } from './customers'

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
    }
  })
})
