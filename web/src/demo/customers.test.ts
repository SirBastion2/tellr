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

  it('uses the above-threshold chip wording as Type when that chip is on the file', () => {
    const threshold = 'Cash withdrawal above the branch threshold'
    for (const customer of CUSTOMERS) {
      const above = customer.events.some((event) => event.chips.includes('chip.above_threshold'))
      expect(customer.transaction.type, customer.id).toBe(above ? threshold : 'Cash withdrawal')
    }
  })

  it('records teller answers on the fraud scripts only', () => {
    for (const customer of CUSTOMERS) {
      const answers = customer.events.filter((event) => event.answer)
      const benign = customer.id === 'benign-car' || customer.id === 'benign-routine'
      if (benign) {
        expect(answers, customer.id).toHaveLength(0)
        expect(customer.events.every((event) => event.chips.length === 0), customer.id).toBe(true)
      } else {
        expect(answers.length, customer.id).toBeGreaterThan(0)
        for (const event of answers) {
          expect(event.chips, `${customer.id} ${event.id}`).toEqual([])
          expect(event.answer?.question_id, event.id).toBeTruthy()
          expect(event.answer?.chip, event.id).toBeTruthy()
        }
      }
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
