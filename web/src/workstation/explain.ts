import type { Explanation, Library, SessionState } from '../types'
import { isInternalId } from '../ui/plain'

export type FactorDirection = 'raises' | 'lowers'

export type LevelFactor = {
  id: string
  label: string
  rationale: string
  weight: number | null
  direction: FactorDirection
}

/**
 * Strength is presentation of server weights. It does not score risk, pick a
 * level, or invent a reason.
 *
 * share = |weight| / sum of |weight| across every contribution in this response
 * Strong factor   when share >= 1/3
 * Moderate factor when share >= 1/6
 * Minor factor    otherwise
 * A zero sum yields Minor factor for every item.
 */
export const STRONG_SHARE = 1 / 3
export const MODERATE_SHARE = 1 / 6

export type StrengthWord = 'Strong factor' | 'Moderate factor' | 'Minor factor'

export function strengthWord(weight: number, totalAbs: number): StrengthWord {
  if (!(totalAbs > 0)) {
    return 'Minor factor'
  }
  const share = Math.abs(weight) / totalAbs
  if (share >= STRONG_SHARE) {
    return 'Strong factor'
  }
  if (share >= MODERATE_SHARE) {
    return 'Moderate factor'
  }
  return 'Minor factor'
}

export function strengthShare(weight: number, totalAbs: number): number {
  if (!(totalAbs > 0)) {
    return 0
  }
  return Math.min(1, Math.abs(weight) / totalAbs)
}

export function responseWeightTotal(factors: readonly LevelFactor[]): number {
  return factors.reduce((sum, factor) => sum + (factor.weight == null ? 0 : Math.abs(factor.weight)), 0)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

/**
 * Read `SessionState.explanation`. Accepts the contract keys and the same
 * object if a client sent camelCase (`usedFallback`, `signalId`) or a
 * capitalized `Explanation`. Returns null only when the object is absent,
 * null, or not that shape.
 */
export function readExplanation(session: SessionState): Explanation | null {
  const bag = session as unknown as Record<string, unknown>
  return parseExplanation(bag.explanation ?? bag.Explanation)
}

export function parseExplanation(raw: unknown): Explanation | null {
  const record = asRecord(raw)
  if (!record) {
    return null
  }
  const confidence = record.confidence
  if (confidence !== null && typeof confidence !== 'number') {
    return null
  }
  const used = record.used_fallback ?? record.usedFallback
  if (typeof used !== 'boolean') {
    return null
  }
  if (!Array.isArray(record.contributions)) {
    return null
  }
  const contributions: Explanation['contributions'] = []
  for (const row of record.contributions) {
    const item = asRecord(row)
    if (!item) {
      return null
    }
    const signalId = item.signal_id ?? item.signalId
    const label = item.label
    const weight = item.weight
    const direction = item.direction
    if (typeof signalId !== 'string' || typeof label !== 'string') {
      return null
    }
    if (typeof weight !== 'number' || !Number.isFinite(weight)) {
      return null
    }
    if (direction !== 'raises' && direction !== 'lowers') {
      return null
    }
    contributions.push({ signal_id: signalId, label, weight, direction })
  }
  return {
    confidence: confidence === null ? null : confidence,
    used_fallback: used,
    contributions,
  }
}

export function humanLabel(library: Library | null, id: string, label: string): string {
  if (label && !isInternalId(label)) {
    return label
  }
  const signal = library?.signals.find((item) => item.id === id)
  if (signal && !isInternalId(signal.label)) {
    return signal.label
  }
  const chip = library?.context_chips.find((item) => item.id === id || item.signal === id)
  if (chip && !isInternalId(chip.label)) {
    return chip.label
  }
  const purpose = library?.purposes.find((item) => item.id === id)
  if (purpose && !isInternalId(purpose.label)) {
    return purpose.label
  }
  return 'Noted item'
}

function rationaleFor(session: SessionState, library: Library | null, id: string, label: string): string {
  const reason = session.risk.reasons.find((item) => item.id === id || item.label === label)
  if (reason?.rationale) {
    return reason.rationale
  }
  const counter = session.risk.counterpoint
  if (counter && (counter.id === id || counter.label === label) && counter.rationale) {
    return counter.rationale
  }
  const signal = library?.signals.find((item) => item.id === id)
  return signal?.rationale ?? ''
}

function factorFromReason(
  library: Library | null,
  item: { id: string; label: string; rationale: string },
  direction: FactorDirection,
): LevelFactor {
  return {
    id: item.id,
    label: humanLabel(library, item.id, item.label),
    rationale: item.rationale,
    weight: null,
    direction,
  }
}

/**
 * Group what the server already named. Contributions win when `explanation`
 * is present: `raises` under what raised it, `lowers` under what would lower
 * it. Without an explanation, architecture §6.5 puts mitigating items in
 * `reasons` at Clear and concerning items in `reasons` at Caution and High.
 * The opposite item is `counterpoint`. This does not score or choose a level.
 */
export function groupFactors(session: SessionState, library: Library | null): {
  raises: LevelFactor[]
  lowers: LevelFactor[]
  explanation: Explanation | null
} {
  const explanation = readExplanation(session)
  if (explanation) {
    const raises: LevelFactor[] = []
    const lowers: LevelFactor[] = []
    for (const row of explanation.contributions) {
      const factor: LevelFactor = {
        id: row.signal_id,
        label: humanLabel(library, row.signal_id, row.label),
        rationale: rationaleFor(session, library, row.signal_id, row.label),
        weight: row.weight,
        direction: row.direction,
      }
      if (row.direction === 'lowers') {
        lowers.push(factor)
      } else {
        raises.push(factor)
      }
    }
    return { raises, lowers, explanation }
  }

  const reasonsLower = session.risk.level === 'clear'
  const reasons = session.risk.reasons.map((item) =>
    factorFromReason(library, item, reasonsLower ? 'lowers' : 'raises'),
  )
  const counter = session.risk.counterpoint
    ? [factorFromReason(library, session.risk.counterpoint, reasonsLower ? 'raises' : 'lowers')]
    : []
  const all = [...reasons, ...counter]
  return {
    raises: all.filter((item) => item.direction === 'raises'),
    lowers: all.filter((item) => item.direction === 'lowers'),
    explanation: null,
  }
}
