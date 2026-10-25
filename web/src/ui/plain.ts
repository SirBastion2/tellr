import type { Level, OutcomeId, SuggestedOutcome } from '../types'
import { formatLocalDateTime } from './localTime'

/** Drop a leading "Pattern " so the label column does not read "Pattern Pattern unclear". */
export function patternValue(label: string): string {
  const stripped = label.replace(/^Pattern\s+/i, '').trim()
  if (stripped.length === 0 || stripped.toLowerCase() === 'unclear') {
    return 'Unclear'
  }
  if (stripped === label) {
    return label
  }
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

export function modeLabel(mode: string): string {
  if (mode === 'live') {
    return 'Live'
  }
  if (mode === 'practice') {
    return 'Practice'
  }
  return mode.length === 0 ? mode : mode.charAt(0).toUpperCase() + mode.slice(1)
}

const SUGGESTED: Record<SuggestedOutcome, string> = {
  proceed: 'Proceed',
  slow_down: 'Slow down',
  escalate: 'Escalate',
}

const OUTCOME: Record<OutcomeId, string> = {
  proceed: 'Proceed',
  slow_down: 'Slow down',
  escalate: 'Escalate',
  report: 'Report',
}

export function suggestedLabel(outcome: SuggestedOutcome): string {
  return SUGGESTED[outcome]
}

export function outcomeLabel(outcome: OutcomeId): string {
  return OUTCOME[outcome]
}

export function levelLabel(level: Level): string {
  if (level === 'clear') {
    return 'Clear'
  }
  if (level === 'caution') {
    return 'Caution'
  }
  return 'High'
}

/** First eight characters of a UUID. Shorter ids stay whole so two visits stay distinct. */
export function shortId(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)) {
    return id.slice(0, 8)
  }
  return id
}

/** First letter only. The rest of the engine stop phrase stays as sent. */
export function stopReasonLabel(reason: string): string {
  if (reason.length === 0) {
    return reason
  }
  return reason.charAt(0).toUpperCase() + reason.slice(1)
}

export function actorLabel(actor: string | null): string {
  if (!actor) {
    return 'Not recorded yet'
  }
  if (actor.toLowerCase() === 'teller') {
    return 'Teller'
  }
  return actor.charAt(0).toUpperCase() + actor.slice(1)
}

export function handoffTitle(outcome: OutcomeId | null, actor: string | null): string {
  if (!outcome) {
    return 'Handoff'
  }
  const who = actor && actor.toLowerCase() === 'teller' ? 'teller' : actorLabel(actor).toLowerCase()
  if (outcome === 'escalate') {
    return `Handoff — Escalated by ${who}`
  }
  return `Handoff — ${outcomeLabel(outcome)} by ${who}`
}

/**
 * Plain name for `debug.recommender`. Unknown values stay as sent, and only
 * inside technical details.
 */
export function recommenderPhrase(recommender: string): string {
  const known: Record<string, string> = {
    rules: 'rules engine',
    local: 'on-device model',
    local_llm: 'on-device model',
    hosted: 'hosted model',
    hosted_llm: 'hosted model',
    fake: 'practice stand-in',
  }
  return known[recommender] ?? recommender
}

export function recommenderTitle(recommender: string): string {
  const phrase = recommenderPhrase(recommender)
  return phrase.charAt(0).toUpperCase() + phrase.slice(1)
}

export function isInternalId(value: string): boolean {
  return /^(sig|chip|mit|pat|purpose|q|tt)\./.test(value)
}

/** Structured amount band → words. Unknown bands stay out of the teller row. */
export function amountBandLabel(band: string): string {
  const named: Record<string, string> = {
    under_1000: 'Under $1,000',
    '0_999': 'Under $1,000',
    '1000_4999': '$1,000–$4,999',
    '5000_9999': '$5,000–$9,999',
    '10000_24999': '$10,000–$24,999',
    '10000_plus': '$10,000 or more',
    '25000_plus': '$25,000 or more',
  }
  const known = named[band]
  if (known) {
    return known
  }
  const pair = /^(\d+)_(\d+)$/.exec(band)
  if (!pair) {
    return 'Amount on the visit'
  }
  const low = Number(pair[1])
  const high = Number(pair[2])
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return 'Amount on the visit'
  }
  return `$${low.toLocaleString('en-US')}–$${high.toLocaleString('en-US')}`
}

export function eventTypeLabel(type: string): string {
  const named: Record<string, string> = {
    ContextAdded: 'Noted at the window',
    AnswerRecorded: 'Customer answered',
    SessionOpened: 'Visit opened',
    OutcomeRecorded: 'Decision recorded',
    SessionClosed: 'Visit closed',
    ManagerRequested: 'Handoff opened',
    Truncated: 'Undone',
  }
  return named[type] ?? 'Recorded event'
}

/** Clock label in the teller's local zone. Naive UTC stamps convert first. */
export function activityTime(ts: string, timeZone?: string): string {
  return formatLocalDateTime(ts, timeZone)
}

/** One local-time stamp for the merged explanation. */
export function notedAtLocal(ts: string, timeZone?: string): string {
  return formatLocalDateTime(ts, timeZone)
}
