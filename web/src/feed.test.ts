import { describe, expect, it } from 'vitest'
import {
  flaggedSignals,
  listedChipIds,
  rememberActivityRows,
  rememberChipOrder,
  visibleActivityRows,
} from './feed'
import type { ActivityRow, HandoffProjection, Library, SessionState } from './types'

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
})

describe('activity memory', () => {
  const rows: ActivityRow[] = chips.map((chip, index) => ({
    ts: `2026-10-24T00:00:0${index}Z`,
    channel: chip.id,
    amount_band: '5000_9999',
    type: 'ContextAdded',
  }))

  it('keeps dismissed rows in the same first-seen order', () => {
    const seen = rememberActivityRows([], rows)
    const current = rows.filter((row) => row.channel !== 'chip.rushed')
    const visible = visibleActivityRows(seen, current, ['chip.rushed'])
    expect(visible.map((row) => row.channel)).toEqual(rows.map((row) => row.channel))
  })
})

describe('handoff flagged list', () => {
  it('lists the session chips, not only the three reasons, and marks dismiss/confirm', () => {
    const reasons = [
      { id: 'sig.on_phone', label: 'On the phone', rationale: '' },
      { id: 'sig.cash_only', label: 'Cash only', rationale: '' },
      { id: 'sig.rushed', label: 'Rushed', rationale: '' },
    ]
    const session = sessionWith(chips, reasons)
    const projection = { risk: session.risk } as HandoffProjection
    const found = flaggedSignals(session, projection, library, ['chip.cash_only'], ['chip.rushed'])
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
