import type { ErrorCode, ErrorResponse } from './types'

const FRIENDLY: Record<ErrorCode, string> = {
  session_closed: 'This visit is already closed. Start a new customer to continue.',
  outcome_requires_actor: 'Enter the teller name before recording the decision.',
  close_without_outcome: 'Record a decision before closing this visit.',
  purpose_required_on_opener: 'Choose what the withdrawal is for before answering.',
  purpose_not_allowed: 'That answer does not take a purpose.',
  scenario_on_live_session: 'A live visit cannot load a practice scenario.',
}

const GENERIC = 'The copilot could not complete that step. Try again, or start a new customer.'

/** Teller-facing sentence. Never includes an HTTP status or an error code. */
export function friendlyApiError(error: ErrorResponse | null, status: number | null): string | null {
  if (error) {
    return FRIENDLY[error.error.code] ?? GENERIC
  }
  if (status == null || status === 200) {
    return null
  }
  if (status === 0) {
    return 'The copilot service is not reachable.'
  }
  return GENERIC
}
