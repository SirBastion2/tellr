/**
 * Which answer-asserted signals get a copilot row.
 *
 * The set is every id `engine.rules.signals_for` can return (question
 * `asserts_on`, plus the chip defaults where that map is silent). A row is
 * kept only when its library label is not already said by a context-chip
 * label. The visible text is the label on the engine contribution.
 */

export const ANSWER_ORIGIN = "From the customer's answer"

export const ANSWER_SIGNAL_DECISION = {
  'sig.answer_relayed': 'keep',
  'sig.specificity_gap': 'keep',
  'sig.story_drift': 'keep',
  'mit.purpose_specific': 'keep',
  'mit.named_counterparty': 'keep',
  'mit.written_estimate': 'keep',
  'mit.own_named_account': 'keep',
  'mit.accepts_alternative': 'keep',
  'sig.secrecy_bank': 'suppress',
  'sig.cash_refusal_unexplained': 'suppress',
} as const

export type AnswerSignalId = keyof typeof ANSWER_SIGNAL_DECISION
export type AnswerSignalDecision = (typeof ANSWER_SIGNAL_DECISION)[AnswerSignalId]

export function answerSignalDecision(signalId: string): AnswerSignalDecision | null {
  if (Object.prototype.hasOwnProperty.call(ANSWER_SIGNAL_DECISION, signalId)) {
    return ANSWER_SIGNAL_DECISION[signalId as AnswerSignalId]
  }
  return null
}

export type ReportedSignal = {
  signal_id: string
  label: string
}

/** Engine order, engine label. Suppressed and non-answer ids are left out. */
export function answerSignalRows<T extends ReportedSignal>(rows: readonly T[]): T[] {
  const kept: T[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (answerSignalDecision(row.signal_id) !== 'keep') {
      continue
    }
    if (seen.has(row.signal_id)) {
      continue
    }
    seen.add(row.signal_id)
    kept.push(row)
  }
  return kept
}
