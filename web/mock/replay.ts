import library from '../../contract/library.json' with { type: 'json' }
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
  steps: FixtureStep[]
}

const fixtures = [t1, t2, t3, t4, t5, t6, t7] as Fixture[]
const byCase = new Map(fixtures.map((fixture) => [fixture.case, fixture]))

type Replay = {
  caseId: string
  index: number
}

const sessions = new Map<string, Replay>()

export type MockResult = {
  status: number
  body: unknown
  warnings: string[]
}

export function resetMock(): void {
  sessions.clear()
}

export function listCases(): { id: string }[] {
  return fixtures.map((fixture) => ({ id: fixture.case }))
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

function currentBody(fixture: Fixture, index: number): unknown {
  return fixture.steps[index]?.response ?? null
}

export function mockRequest(method: string, url: string, body?: unknown): MockResult {
  const parsed = new URL(url, 'http://teller.local')
  const path = parsed.pathname
  const verb = method.toUpperCase()

  if (verb === 'GET' && path === '/library') {
    return { status: 200, body: library, warnings: [] }
  }

  if (verb === 'POST' && path === '/sessions') {
    const caseId = parsed.searchParams.get('case')
    if (!caseId) {
      return { status: 404, body: null, warnings: ['case query is required'] }
    }
    const fixture = byCase.get(caseId)
    const first = fixture?.steps[0]
    if (!fixture || !first) {
      return { status: 404, body: null, warnings: [`unknown case ${caseId}`] }
    }
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
    const warnings: string[] = []
    if (!same(body, first.request)) {
      warnings.push('payload differs from the fixture request')
    }
    sessions.set(first.response.session_id, { caseId, index: 0 })
    return { status: 200, body: first.response, warnings }
  }

  const match = /^\/sessions\/([^/]+)(?:\/(context|answers|undo))?$/.exec(path)
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

  if (verb === 'GET' && !action) {
    return { status: 200, body: currentBody(fixture, replay.index), warnings: [] }
  }

  if (verb === 'POST' && action === 'undo') {
    if (replay.index <= 0) {
      return {
        status: 200,
        body: currentBody(fixture, replay.index),
        warnings: ['no previous step'],
      }
    }
    replay.index -= 1
    return { status: 200, body: currentBody(fixture, replay.index), warnings: [] }
  }

  if (verb === 'POST' && (action === 'context' || action === 'answers')) {
    const next = fixture.steps[replay.index + 1]
    if (!next) {
      return {
        status: 200,
        body: currentBody(fixture, replay.index),
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
    return { status: 200, body: next.response, warnings }
  }

  return { status: 404, body: null, warnings: ['not a replay route'] }
}
