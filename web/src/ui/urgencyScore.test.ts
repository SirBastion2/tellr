import handoffSchema from '../../../contract/handoff.schema.json'
import sessionSchema from '../../../contract/session_state.schema.json'
import { describe, expect, it } from 'vitest'
import { formatUrgencyScore, URGENCY_SCORE_MAX, URGENCY_SCORE_TERM } from './urgencyScore'

describe('Urgency Score display', () => {
  it('derives the max from the contract score range, matching architecture §6.2', () => {
    expect(sessionSchema.properties.risk.properties.score.maximum).toBe(100)
    expect(handoffSchema.properties.risk.properties.score.maximum).toBe(100)
    expect(sessionSchema.properties.risk.properties.score.minimum).toBe(-45)
    expect(URGENCY_SCORE_MAX).toBe(sessionSchema.properties.risk.properties.score.maximum)
    expect(URGENCY_SCORE_MAX).toBe(handoffSchema.properties.risk.properties.score.maximum)
    expect(URGENCY_SCORE_TERM).toBe('Urgency Score')
  })

  it('renders the server score over that max without clamping', () => {
    expect(formatUrgencyScore(45)).toBe('45/100')
    expect(formatUrgencyScore(-14)).toBe('-14/100')
    expect(formatUrgencyScore(12345)).toBe('12345/100')
  })
})
