import { formatOffsetIso } from '../src/ui/localTime'
import library from '../../contract/library.json' with { type: 'json' }
import liveAnswers from './live_answers.json' with { type: 'json' }
import liveLevels from './live_levels.json' with { type: 'json' }
import t1 from '../../contract/fixtures/T1.json' with { type: 'json' }
import t2 from '../../contract/fixtures/T2.json' with { type: 'json' }
import t3 from '../../contract/fixtures/T3.json' with { type: 'json' }
import t4 from '../../contract/fixtures/T4.json' with { type: 'json' }
import t5 from '../../contract/fixtures/T5.json' with { type: 'json' }
import t6 from '../../contract/fixtures/T6.json' with { type: 'json' }
import t7 from '../../contract/fixtures/T7.json' with { type: 'json' }

type FixtureStep = {
  endpoint: string
  request: unknown
  response: { session_id: string }
}

type Fixture = {
  case: string
  label?: string
  steps: FixtureStep[]
}

const fixtures = [t1, t2, t3, t4, t5, t6, t7] as Fixture[]
const byCase = new Map(fixtures.map((fixture) => [fixture.case, fixture]))

type ChipSource = 'observed' | 'teller'

type LiveAnswer = { kind: 'answer'; question_id: string; chip: string; purpose?: string }
type LiveStep = { kind: 'context'; chips: string[]; source: ChipSource } | LiveAnswer

type Replay = {
  caseId: string
  index: number
  closed: boolean
  outcome: string | null
  actor: string | null
  mode: 'live' | 'practice'
  openedAt: string
  closedAt: string | null
  libraryVersion: string
  amountBand: string
  liveLog: LiveStep[]
}

const recordedLevels = liveLevels as Record<string, Record<string, unknown>>
const recordedAnswers = liveAnswers as Record<string, Record<string, unknown>>
const libraryQuestions = (library as { questions: { id: string; role: string }[] }).questions

let openedCount = 0

const OUTCOME_IDS = new Set(['proceed', 'slow_down', 'escalate', 'report'])

const sessions = new Map<string, Replay>()

export type MockResult = {
  status: number
  body: unknown
  warnings: string[]
}

export function resetMock(): void {
  sessions.clear()
  openedCount = 0
}

function nextOpenedAt(): string {
  openedCount += 1
  const stamp = new Date()
  stamp.setUTCSeconds(stamp.getUTCSeconds() + openedCount)
  return formatOffsetIso(stamp)
}

function libraryVersionOf(body: unknown): string {
  const record = recordOf(body)
  return typeof record?.library_version === 'string' ? record.library_version : ''
}

export function listCases(): { id: string; label: string }[] {
  return fixtures.map((fixture) => ({ id: fixture.case, label: fixture.label ?? fixture.case }))
}

export function openingRequest(caseId: string): unknown {
  return byCase.get(caseId)?.steps[0]?.request ?? null
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stable)
  }
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) {
        sorted[key] = stable(source[key])
      }
    }
    return sorted
  }
  return value
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right))
}

function stepKind(endpoint: string): 'context' | 'answers' | 'other' {
  if (endpoint.endsWith('/context')) {
    return 'context'
  }
  if (endpoint.endsWith('/answers')) {
    return 'answers'
  }
  return 'other'
}

function liveScenario(body: unknown): boolean {
  if (!body || typeof body !== 'object') {
    return false
  }
  const record = body as Record<string, unknown>
  return record.mode === 'live' && typeof record.scenario_id === 'string'
}

function recordOf(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }
  return body as Record<string, unknown>
}

function openedMode(body: unknown): 'live' | 'practice' {
  return recordOf(body)?.mode === 'live' ? 'live' : 'practice'
}

function comparableOpen(body: unknown): unknown {
  const record = recordOf(body)
  if (!record) {
    return body
  }
  const copy = { ...record }
  delete copy.scenario_id
  delete copy.opened_at
  delete copy.timezone
  if (copy.mode === 'live') {
    copy.mode = 'practice'
  }
  return copy
}

function present(body: unknown, mode: 'live' | 'practice'): unknown {
  if (mode !== 'live' || !body || typeof body !== 'object') {
    return body ?? null
  }
  return { ...(body as Record<string, unknown>), mode: 'live' }
}

function currentBody(fixture: Fixture, index: number, mode: 'live' | 'practice'): unknown {
  return present(fixture.steps[index]?.response ?? null, mode)
}

function amountBandOf(body: unknown): string {
  const record = recordOf(body)
  return typeof record?.amount_band === 'string' ? record.amount_band : ''
}

function chipSourceOf(body: unknown): ChipSource {
  const source = recordOf(body)?.source
  return source === 'observed' || source === 'teller' ? source : 'teller'
}

function liveAnswersOf(replay: Replay): Omit<LiveAnswer, 'kind'>[] {
  const answers: Omit<LiveAnswer, 'kind'>[] = []
  for (const step of replay.liveLog) {
    if (step.kind !== 'answer') {
      continue
    }
    const item: Omit<LiveAnswer, 'kind'> = { question_id: step.question_id, chip: step.chip }
    if (step.purpose !== undefined) {
      item.purpose = step.purpose
    }
    answers.push(item)
  }
  return answers
}

function answerLookupKey(chips: string[], answers: readonly Omit<LiveAnswer, 'kind'>[]): string {
  const chipPart = [...chips].sort().join('|')
  const answerPart = answers
    .map((answer) =>
      answer.purpose ? `${answer.question_id}:${answer.chip}:${answer.purpose}` : `${answer.question_id}:${answer.chip}`,
    )
    .join('|')
  return `${chipPart}||${answerPart}`
}

function recordedAnswerBody(replay: Replay, sessionId: string): unknown | null {
  const chips = liveChips(replay)
  const answers = liveAnswersOf(replay)
  if (answers.length === 0) {
    return null
  }
  for (let length = answers.length; length > 0; length -= 1) {
    const recorded = recordedAnswers[answerLookupKey(chips, answers.slice(0, length))]
    if (recorded) {
      return { ...recorded, session_id: sessionId, mode: replay.mode }
    }
  }
  return null
}

function parseAnswer(body: unknown): Omit<LiveAnswer, 'kind'> | null {
  const record = recordOf(body)
  if (!record || typeof record.question_id !== 'string' || typeof record.chip !== 'string') {
    return null
  }
  const answer: Omit<LiveAnswer, 'kind'> = { question_id: record.question_id, chip: record.chip }
  if (typeof record.purpose === 'string') {
    answer.purpose = record.purpose
  }
  return answer
}

function answerRejection(body: unknown): MockResult | null {
  const parsed = parseAnswer(body)
  if (!parsed) {
    return { status: 422, body: null, warnings: ['answer is missing question_id or chip'] }
  }
  const question = libraryQuestions.find((item) => item.id === parsed.question_id)
  const opener = question?.role === 'opener'
  if (opener && parsed.purpose === undefined) {
    return {
      status: 409,
      body: { error: { code: 'purpose_required_on_opener', message: 'opener answer requires a purpose' } },
      warnings: [],
    }
  }
  if (question && !opener && parsed.purpose !== undefined) {
    return {
      status: 409,
      body: { error: { code: 'purpose_not_allowed', message: 'purpose is only recorded on the opener' } },
      warnings: [],
    }
  }
  return null
}

function liveChips(replay: Replay): string[] {
  const seen = new Set<string>()
  const chips: string[] = []
  for (const step of replay.liveLog) {
    if (step.kind !== 'context') {
      continue
    }
    for (const chip of step.chips) {
      if (!seen.has(chip)) {
        seen.add(chip)
        chips.push(chip)
      }
    }
  }
  return chips
}

function contextEcho(replay: Replay): { id: string; source: ChipSource }[] {
  const echo: { id: string; source: ChipSource }[] = []
  for (const step of replay.liveLog) {
    if (step.kind !== 'context') {
      continue
    }
    for (const id of step.chips) {
      echo.push({ id, source: step.source })
    }
  }
  return echo
}

function withOptionalFields(body: unknown, replay: Replay): unknown {
  const record = recordOf(body)
  if (!record) {
    return body
  }
  const echo = contextEcho(replay)
  if (echo.length === 0 || record.context_chips !== undefined) {
    return body
  }
  return { ...record, context_chips: echo }
}

function sessionBody(replay: Replay, fixture: Fixture, sessionId: string): unknown {
  const body =
    replay.mode === 'live' && (liveChips(replay).length > 0 || liveAnswersOf(replay).length > 0)
      ? liveBody(replay, fixture, sessionId)
      : currentBody(fixture, replay.index, replay.mode)
  return withOptionalFields(body, replay)
}

function projectActivity(replay: Replay, fixture: Fixture, sessionId: string): { session_id: string; rows: { ts: string; channel: string; amount_band: string; type: string }[] } {
  const rows: { ts: string; channel: string; amount_band: string; type: string }[] = []
  if (!replay.amountBand) {
    return { session_id: sessionId, rows }
  }
  if (replay.liveLog.length > 0) {
    replay.liveLog.forEach((step, index) => {
      if (step.kind !== 'context') {
        return
      }
      const ts = `2026-10-24T00:00:${String(index).padStart(2, '0')}Z`
      for (const chip of step.chips) {
        rows.push({ ts, channel: chip, amount_band: replay.amountBand, type: 'ContextAdded' })
      }
    })
    return { session_id: sessionId, rows }
  }
  fixture.steps.slice(0, replay.index + 1).forEach((step, index) => {
    if (!step.endpoint.endsWith('/context')) {
      return
    }
    const ts = `2026-10-24T00:00:${String(index).padStart(2, '0')}Z`
    for (const chip of chipList(step.request)) {
      rows.push({ ts, channel: chip, amount_band: replay.amountBand, type: 'ContextAdded' })
    }
  })
  return { session_id: sessionId, rows }
}

function liveBody(replay: Replay, fixture: Fixture, sessionId: string): unknown {
  const answered = recordedAnswerBody(replay, sessionId)
  if (answered) {
    return answered
  }
  const chips = liveChips(replay)
  if (chips.length === 0) {
    return currentBody(fixture, replay.index, replay.mode)
  }
  const recorded = recordedLevels[[...chips].sort().join('|')]
  if (!recorded) {
    return currentBody(fixture, replay.index, replay.mode)
  }
  return { ...recorded, session_id: sessionId, mode: replay.mode }
}

function chipList(body: unknown): string[] {
  const record = recordOf(body)
  const chips = record?.chips
  if (!Array.isArray(chips)) {
    return []
  }
  return chips.filter((chip): chip is string => typeof chip === 'string')
}

export function mockRequest(method: string, url: string, body?: unknown): MockResult {
  const parsed = new URL(url, 'http://teller.local')
  const path = parsed.pathname
  const verb = method.toUpperCase()

  if (verb === 'GET' && path === '/library') {
    return { status: 200, body: library, warnings: [] }
  }

  if (verb === 'POST' && path === '/sessions') {
    if (liveScenario(body)) {
      return {
        status: 409,
        body: {
          error: {
            code: 'scenario_on_live_session',
            message: 'scenario_id is rejected when mode is live',
          },
        },
        warnings: [],
      }
    }
    const record = recordOf(body)
    const scenarioId = typeof record?.scenario_id === 'string' ? record.scenario_id : null
    const caseId = parsed.searchParams.get('case') ?? scenarioId ?? (record?.mode === 'live' ? 'T1' : null)
    if (!caseId) {
      return { status: 404, body: null, warnings: ['case query is required'] }
    }
    const fixture = byCase.get(caseId)
    const first = fixture?.steps[0]
    if (!fixture || !first) {
      return { status: 404, body: null, warnings: [`unknown case ${caseId}`] }
    }
    const warnings: string[] = []
    if (!same(comparableOpen(body), first.request)) {
      warnings.push('payload differs from the fixture request')
    }
    const mode = openedMode(body)
    const presented = present(first.response, mode)
    sessions.set(first.response.session_id, {
      caseId,
      index: 0,
      closed: false,
      outcome: null,
      actor: null,
      mode,
      openedAt: typeof record?.opened_at === 'string' && record.opened_at.length > 0 ? record.opened_at : nextOpenedAt(),
      closedAt: null,
      libraryVersion: libraryVersionOf(presented),
      amountBand: amountBandOf(body),
      liveLog: [],
    })
    return { status: 200, body: presented, warnings }
  }

  if (verb === 'GET' && path === '/health') {
    return {
      status: 200,
      body: {
        recommender: 'rules',
        model_id: null,
        p50: null,
        p95: null,
        last_p95: null,
        fallback_rate: 0,
        rejection_count: 0,
        agreement_rate: null,
      },
      warnings: [],
    }
  }

  if (verb === 'GET' && path === '/sessions') {
    const mode = parsed.searchParams.get('mode')
    const rows = [...sessions.entries()]
      .filter(([, replay]) => {
        if (mode === 'practice') {
          return replay.mode === 'practice'
        }
        if (mode === 'all') {
          return true
        }
        return replay.mode === 'live'
      })
      .sort(([, left], [, right]) => right.openedAt.localeCompare(left.openedAt))
      .map(([sessionId, replay]) => ({
        session_id: sessionId,
        mode: replay.mode,
        opened_at: replay.openedAt,
        closed_at: replay.closedAt,
        library_version: replay.libraryVersion,
      }))
    return { status: 200, body: { sessions: rows }, warnings: [] }
  }

  const match = /^\/sessions\/([^/]+)(?:\/(context|answers|undo|outcome|handoff|activity))?$/.exec(path)
  if (!match) {
    return { status: 404, body: null, warnings: ['not a replay route'] }
  }
  const sessionId = match[1]
  const action = match[2]
  if (!sessionId) {
    return { status: 404, body: null, warnings: ['unknown session'] }
  }
  const replay = sessions.get(sessionId)
  const fixture = replay ? byCase.get(replay.caseId) : undefined
  if (!replay || !fixture) {
    return { status: 404, body: null, warnings: ['unknown session'] }
  }

  if (replay.closed && verb === 'POST' && (action === 'context' || action === 'answers' || action === 'undo' || action === 'outcome')) {
    return {
      status: 409,
      body: { error: { code: 'session_closed', message: 'session is closed' } },
      warnings: [],
    }
  }

  if (verb === 'GET' && !action) {
    return { status: 200, body: sessionBody(replay, fixture, sessionId), warnings: [] }
  }

  if (verb === 'GET' && action === 'activity') {
    return { status: 200, body: projectActivity(replay, fixture, sessionId), warnings: [] }
  }

  if (verb === 'GET' && action === 'handoff') {
    const response = sessionBody(replay, fixture, sessionId)
    if (!response || typeof response !== 'object') {
      return { status: 404, body: null, warnings: ['no fixture step'] }
    }
    const state = response as {
      session_id: string
      mode: unknown
      stated_purpose: unknown
      risk: unknown
      suggested_outcome: unknown
      answers: unknown
      stop: unknown
    }
    return {
      status: 200,
      body: {
        session_id: state.session_id,
        mode: state.mode,
        stated_purpose: state.stated_purpose,
        risk: state.risk,
        suggested_outcome: state.suggested_outcome,
        answers: state.answers,
        stop: state.stop,
        outcome: replay.outcome,
        actor: replay.actor,
      },
      warnings: [],
    }
  }

  if (verb === 'POST' && action === 'outcome') {
    const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
    const actor = record?.actor
    if (typeof actor !== 'string' || actor.length === 0) {
      return {
        status: 409,
        body: { error: { code: 'outcome_requires_actor', message: 'outcome requires an actor' } },
        warnings: [],
      }
    }
    const outcome = record?.outcome
    if (typeof outcome !== 'string' || !OUTCOME_IDS.has(outcome)) {
      return { status: 422, body: null, warnings: ['outcome is not one of the four'] }
    }
    replay.closed = true
    replay.closedAt = '2026-10-24T00:01:00'
    replay.outcome = outcome
    replay.actor = actor
    return {
      status: 200,
      body: sessionBody(replay, fixture, sessionId),
      warnings: ['outcome is not in the fixture; returning the current SessionState'],
    }
  }

  if (verb === 'POST' && action === 'undo') {
    if (replay.mode === 'live' && replay.liveLog.length > 0) {
      replay.liveLog.pop()
      return { status: 200, body: sessionBody(replay, fixture, sessionId), warnings: [] }
    }
    if (replay.index <= 0) {
      return {
        status: 200,
        body: currentBody(fixture, replay.index, replay.mode),
        warnings: ['no previous step'],
      }
    }
    replay.index -= 1
    return { status: 200, body: currentBody(fixture, replay.index, replay.mode), warnings: [] }
  }

  if (verb === 'POST' && (action === 'context' || action === 'answers')) {
    const next = fixture.steps[replay.index + 1]
    const matched =
      replay.liveLog.length === 0 &&
      Boolean(next && stepKind(next.endpoint) === action && same(body, next.request))
    if (replay.mode === 'live' && !matched) {
      const warnings: string[] = []
      if (action === 'context') {
        replay.liveLog.push({ kind: 'context', chips: chipList(body), source: chipSourceOf(body) })
        const key = [...liveChips(replay)].sort().join('|')
        if (liveChips(replay).length > 0 && !recordedLevels[key]) {
          warnings.push('no recorded level for these chips')
        }
      } else {
        const rejected = answerRejection(body)
        if (rejected) {
          return rejected
        }
        const parsed = parseAnswer(body)
        if (!parsed) {
          return { status: 422, body: null, warnings: ['answer is missing question_id or chip'] }
        }
        replay.liveLog.push({ kind: 'answer', ...parsed })
        if (!recordedAnswerBody(replay, sessionId)) {
          warnings.push('no recorded SessionState for these answers')
        }
      }
      return { status: 200, body: sessionBody(replay, fixture, sessionId), warnings }
    }
    if (!next) {
      return {
        status: 200,
        body: currentBody(fixture, replay.index, replay.mode),
        warnings: ['no further fixture step'],
      }
    }
    const warnings: string[] = []
    if (stepKind(next.endpoint) !== action) {
      warnings.push(`next fixture step is ${next.endpoint}`)
    }
    if (!same(body, next.request)) {
      warnings.push('payload differs from the fixture request')
    }
    replay.index += 1
    return { status: 200, body: present(next.response, replay.mode), warnings }
  }

  return { status: 404, body: null, warnings: ['not a replay route'] }
}
