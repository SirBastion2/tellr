export type Mode = 'live' | 'practice'

export type Level = 'clear' | 'caution' | 'high'

export type AnswerChipId =
  | 'specific'
  | 'vague'
  | 'no_answer'
  | 'changed'
  | 'relayed_by_caller'
  | 'confirmed'
  | 'denied'

export type RiskItem = {
  id: string
  label: string
  rationale: string
}

export type PatternRef = {
  kind: 'pattern' | 'look_alike'
  id: string
  label: string
}

export type QuestionView = {
  id: string
  text: string
  why: string
  kind: 'open' | 'yes_no'
  chips: AnswerChipId[]
  stage: 'opener' | 'verify' | 'probe'
  source: 'fixed' | 'rules' | 'model'
}

export type StopView = {
  kind: 'hard' | 'recommended'
  reason: string
}

export type TalkTrackView = {
  stage: string
  pattern: string | null
  lines: string[]
  avoid: string[]
}

export type OutcomeId = 'proceed' | 'slow_down' | 'escalate' | 'report'

export type SuggestedOutcome = Exclude<OutcomeId, 'report'>

export type HandoffProjection = {
  session_id: string
  mode: Mode
  stated_purpose: string | null
  risk: SessionState['risk']
  suggested_outcome: SuggestedOutcome
  answers: number
  stop: SessionState['stop']
}

export type DebugView = {
  recommender: string
  latency_ms: number
  rejections: number
}

export type SessionState = {
  session_id: string
  mode: Mode
  answers: number
  library_version: string
  stated_purpose: string | null
  risk: {
    level: Level
    raw_level: Level
    score: number
    reasons: RiskItem[]
    counterpoint: RiskItem | null
    pattern: PatternRef | null
    pattern_label: string
  }
  question: QuestionView | null
  stop: StopView | null
  talk_track: TalkTrackView
  suggested_outcome: SuggestedOutcome
  available_outcomes: ['proceed', 'slow_down', 'escalate', 'report']
  debug?: DebugView
}

export type LibraryChip = {
  id: AnswerChipId
  label: string
  used_on: 'open' | 'yes_no' | 'any'
}

export type Library = {
  library_version: string
  copy_status: string
  chips: LibraryChip[]
  purposes: { id: string; label: string }[]
  context_chips: { id: string; label: string; signal: string | null; probe: string | null }[]
  questions: {
    id: string
    intent: string
    kind: 'open' | 'yes_no'
    role: 'opener' | 'verify' | 'probe'
    text: string
    why: string
    chips: AnswerChipId[]
  }[]
  signals: { id: string; label: string; rationale: string; direction: 'concern' | 'mitigating' }[]
  patterns: { id: string; label: string }[]
  look_alikes: { id: string; label: string; pattern: string }[]
  talk_tracks: { id: string; lines: string[]; avoid: string[] }[]
}

export type AnswerPost = {
  question_id: string
  chip: AnswerChipId
  purpose?: string
}

export type ErrorCode =
  | 'outcome_requires_actor'
  | 'close_without_outcome'
  | 'purpose_required_on_opener'
  | 'purpose_not_allowed'
  | 'session_closed'
  | 'scenario_on_live_session'

export type ErrorResponse = {
  error: {
    code: ErrorCode
    message: string
  }
}
