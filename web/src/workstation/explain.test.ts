import { describe, expect, it } from 'vitest'
import { parseExplanation, strengthWord } from './explain'

describe('explanation parsing and strength words', () => {
  it('reads contract keys and camelCase without inventing a score', () => {
    expect(parseExplanation(null)).toBeNull()
    expect(parseExplanation({ confidence: null, usedFallback: false, contributions: [] })).toEqual({
      confidence: null,
      used_fallback: false,
      contributions: [],
    })
    expect(
      parseExplanation({
        confidence: null,
        used_fallback: false,
        contributions: [{ signalId: 'sig.third_party_call', label: 'On the phone', weight: 14, direction: 'raises' }],
      })?.contributions[0],
    ).toEqual({
      signal_id: 'sig.third_party_call',
      label: 'On the phone',
      weight: 14,
      direction: 'raises',
    })
    expect(parseExplanation({ confidence: 'high', used_fallback: false, contributions: [] })).toBeNull()
  })

  it('buckets share of the summed absolute weights in this response', () => {
    const total = 18 + 16 + 14 + 12 + 6
    expect(strengthWord(18, total)).toBe('Moderate factor')
    expect(strengthWord(14, total)).toBe('Moderate factor')
    expect(strengthWord(6, total)).toBe('Minor factor')
    expect(strengthWord(14, 14)).toBe('Strong factor')
    expect(strengthWord(2, 3)).toBe('Strong factor')
    expect(strengthWord(1, 3)).toBe('Strong factor')
    expect(strengthWord(1, 0)).toBe('Minor factor')
  })
})
