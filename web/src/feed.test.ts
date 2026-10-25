import { describe, expect, it } from 'vitest'
import { factorOrigin, flaggedSignals, handoffReasonBadge, listedChipIds, mergeSignalRows, rememberChipOrder } from './feed'
import type { HandoffProjection, Library, SessionState } from './types'

const chips = [
  { id: 'chip.on_phone', source: 'observed' as const },
  { id: 'chip.cash_only', source: 'observed' as const },
  { id: 'chip.rushed', source: 'teller' as const },
  { id: 'chip.urgency_secrecy', source: 'observed' as const },
  { id: 'chip.someone_directing', source: 'observed' as const },
]

const library = {
  context_chips: chips.map((chip) => ({
    id: chip.id,
    label: chip.id.replace('chip.', '').replaceAll('_', ' '),
    signal: `sig.${chip.id.slice(5)}`,
    probe: null,
  })),
  signals: chips.map((chip) => ({
    id: `sig.${chip.id.slice(5)}`,
    label: chip.id.replace('chip.', '').replaceAll('_', ' '),
    rationale: '',
    direction: 'concern' as const,
  })),
} as Library

function sessionWith(chipsIn: SessionState['context_chips'], reasons: SessionState['risk']['reasons']): SessionState {
  return {
    session_id: 's1',
    mode: 'live',
    answers: 0,
    library_version: '1',
    stated_purpose: null,
    risk: {
      level: 'caution',
      raw_level: 'caution',
      score: 40,
      reasons,
      counterpoint: null,
      pattern: null,
      pattern_label: 'Pattern unclear',
    },
    question: null,
    stop: null,
    talk_track: { stage: 'opener', pattern: null, lines: [], avoid: [] },
    suggested_outcome: 'slow_down',
    available_outcomes: ['proceed', 'slow_down', 'escalate', 'report'],
    context_chips: chipsIn,
  }
}

describe('chip order', () => {
  it('keeps first-seen order across dismiss, restore, and confirm', () => {
    const posted = chips.map((chip) => chip.id)
    const order = rememberChipOrder([], posted)
    expect(listedChipIds(posted, chips, [], order)).toEqual(posted)

    const afterDismiss = listedChipIds(
      posted.filter((id) => id !== 'chip.cash_only'),
      chips.filter((chip) => chip.id !== 'chip.cash_only'),
      ['chip.cash_only'],
      order,
    )
    expect(afterDismiss).toEqual(posted)

    const afterRestore = listedChipIds(posted, chips, [], order)
    expect(afterRestore).toEqual(posted)

    const afterConfirm = listedChipIds(posted, chips, [], order)
    expect(afterConfirm).toEqual(posted)
  })

  it('keeps merged leftover chips in first-seen order after dismiss', () => {
    const posted = chips.map((chip) => chip.id)
    const order = rememberChipOrder([], posted)
    const reasons = [
      { id: 'sig.on_phone', label: 'on phone', rationale: '' },
      { id: 'sig.cash_only', label: 'cash only', rationale: '' },
      { id: 'sig.rushed', label: 'rushed', rationale: '' },
    ]
    const session = sessionWith(chips, reasons)
    const before = mergeSignalRows(library, session, posted, [], [], order)
    const after = mergeSignalRows(
      library,
      sessionWith(
        chips.filter((chip) => chip.id !== 'chip.cash_only'),
        reasons.filter((reason) => reason.id !== 'sig.cash_only'),
      ),
      posted.filter((id) => id !== 'chip.cash_only'),
      ['chip.rushed'],
      ['chip.cash_only'],
      order,
    )
    expect(after.raises.map((row) => row.chipId ?? row.id)).toEqual(before.raises.map((row) => row.chipId ?? row.id))
    expect(after.raises.find((row) => row.chipId === 'chip.cash_only')?.state).toBe('dismissed')
    expect(after.raises.find((row) => row.chipId === 'chip.rushed')?.state).toBe('confirmed')
  })
})

describe('handoff flagged list', () => {
  it('lists the merged session rows, not only the three reasons, and marks dismiss/confirm', () => {
    const reasons = [
      { id: 'sig.on_phone', label: 'On the phone', rationale: '' },
      { id: 'sig.cash_only', label: 'Cash only', rationale: '' },
      { id: 'sig.rushed', label: 'Rushed', rationale: '' },
    ]
    const session = sessionWith(chips, reasons)
    const projection = { risk: session.risk } as HandoffProjection
    const found = flaggedSignals(
      session,
      projection,
      library,
      ['chip.cash_only'],
      ['chip.rushed'],
      chips.map((chip) => chip.id),
      chips.map((chip) => chip.id),
    )
    expect(found.map((item) => item.id)).toEqual(chips.map((chip) => chip.id))
    expect(found.find((item) => item.id === 'chip.cash_only')?.status).toBe('Dismissed')
    expect(found.find((item) => item.id === 'chip.rushed')?.status).toBe('Teller confirmed')
    expect(found.find((item) => item.id === 'chip.on_phone')?.status).toBe('Observed')
  })

  it('falls back to the projection reasons when the session has no chips', () => {
    const reasons = [
      { id: 'sig.a', label: 'Alpha', rationale: '' },
      { id: 'sig.b', label: 'Beta', rationale: '' },
    ]
    const projection = { risk: { reasons } } as HandoffProjection
    expect(flaggedSignals(null, projection, library).map((item) => item.label)).toEqual(['Alpha', 'Beta'])
  })
})

describe('handoff reason badge', () => {
  it('leaves factorOrigin null when no chip matches, and badges that handoff row Observed', () => {
    const answers = [
      { id: 'sig.scripted_secrecy', label: 'Told not to discuss with the bank', rationale: '' },
      { id: 'sig.relayed', label: 'Answer relayed by caller', rationale: '' },
      { id: 'sig.missing', label: 'Missing details', rationale: '' },
    ]
    for (const reason of answers) {
      expect(factorOrigin(library, reason.id, reason.label, [], [])).toBeNull()
    }
    expect(factorOrigin(library, 'sig.rushed', 'rushed', ['chip.rushed'], chips)).toBe('Teller confirmed')
    expect(factorOrigin(library, 'sig.on_phone', 'on phone', ['chip.on_phone'], chips)).toBe('Observed')

    expect(handoffReasonBadge(null)).toBe('Observed')
    expect(handoffReasonBadge('Observed')).toBe('Observed')
    expect(handoffReasonBadge('Teller confirmed')).toBe('Teller confirmed')
    expect(handoffReasonBadge('Dismissed')).toBe('Dismissed')

    const reasons = [...answers, { id: 'sig.rushed', label: 'rushed', rationale: '' }]
    const session = sessionWith([{ id: 'chip.rushed', source: 'teller' }], reasons)
    const found = flaggedSignals(
      session,
      { risk: session.risk } as HandoffProjection,
      library,
      [],
      ['chip.rushed'],
      ['chip.rushed'],
    )
    for (const reason of answers) {
      const row = found.find((item) => item.label === reason.label)
      expect(row?.status).toBeNull()
      expect(handoffReasonBadge(row?.status ?? null)).toBe('Observed')
    }
    const rushed = found.find((item) => item.id === 'chip.rushed')
    expect(rushed?.status).toBe('Teller confirmed')
    expect(handoffReasonBadge(rushed?.status ?? null)).toBe('Teller confirmed')
  })
})
