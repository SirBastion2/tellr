import handoffSchema from '../../../contract/handoff.schema.json'
import sessionSchema from '../../../contract/session_state.schema.json'

/**
 * Display maximum for the server risk score. Not a client-computed score.
 *
 * Sourced from `contract/session_state.schema.json` and
 * `contract/handoff.schema.json` `properties.risk.properties.score.maximum`.
 * That bound is the same clamp as `docs/architecture.md` §6.2:
 * `raw = clamp(Σ_families …, −45, +100)`.
 */
function scoreMaximum(schema: {
  properties: { risk: { properties: { score: { maximum?: number } } } }
}): number {
  const maximum = schema.properties.risk.properties.score.maximum
  if (typeof maximum !== 'number') {
    throw new Error('contract risk.score.maximum is missing')
  }
  return maximum
}

const sessionMax = scoreMaximum(sessionSchema)
const handoffMax = scoreMaximum(handoffSchema)
if (sessionMax !== handoffMax) {
  throw new Error('session and handoff risk.score.maximum disagree')
}

export const URGENCY_SCORE_MAX = sessionMax
export const URGENCY_SCORE_TERM = 'Urgency Score'

/** Presentation of the server score. Does not clamp, scale, or recompute it. */
export function formatUrgencyScore(score: number): string {
  return `${score}/${URGENCY_SCORE_MAX}`
}
