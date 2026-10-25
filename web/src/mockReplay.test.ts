import library from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import t3 from '../../contract/fixtures/T3.json'
import t4 from '../../contract/fixtures/T4.json'
import t5 from '../../contract/fixtures/T5.json'
import t6 from '../../contract/fixtures/T6.json'
import t7 from '../../contract/fixtures/T7.json'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockRequest, resetMock } from '../mock/replay'
import { validateError, validateHandoff, validateSessionState } from './validate'

const fixtures = [t1, t2, t3, t4, t5, t6, t7]

describe('fixture replay', () => {
  beforeEach(() => {
    resetMock()
  })

  it('serves the library document', () => {
    const result = mockRequest('GET', '/library')
    expect(result.status).toBe(200)
    expect(result.body).toEqual(library)
    expect(result.warnings).toEqual([])
  })

  it('replays each fixture in order and undoes one step', () => {
    for (const fixture of fixtures) {
      resetMock()
      const created = mockRequest('POST', `/sessions?case=${fixture.case}`, fixture.steps[0]?.request)
      expect(created.warnings, fixture.case).toEqual([])
      expect(created.body).toEqual(fixture.steps[0]?.response)
      expect(validateSessionState(created.body)).toEqual([])
      const sessionId = fixture.steps[0]?.response.session_id
      for (const [index, step] of fixture.steps.entries()) {
        if (index === 0) {
          continue
        }
        const action = step.endpoint.endsWith('/context') ? 'context' : 'answers'
        const result = mockRequest('POST', `/sessions/${sessionId}/${action}`, step.request)
        expect(result.status, `${fixture.case} ${index}`).toBe(200)
        expect(result.warnings, `${fixture.case} ${index}`).toEqual([])
        expect(result.body).toEqual(step.response)
      }
      const current = mockRequest('GET', `/sessions/${sessionId}`)
      expect(current.body).toEqual(fixture.steps.at(-1)?.response)
      const undone = mockRequest('POST', `/sessions/${sessionId}/undo`)
      expect(undone.warnings).toEqual([])
      expect(undone.body).toEqual(fixture.steps.at(-2)?.response)
    }
  })

  it('returns the next step and warns when the payload differs', () => {
    mockRequest('POST', '/sessions?case=T2', t2.steps[0]?.request)
    const result = mockRequest('POST', '/sessions/fixture-T2/context', { chips: ['chip.other'] })
    expect(result.status).toBe(200)
    expect(result.body).toEqual(t2.steps[1]?.response)
    expect(result.warnings.some((warning) => warning.includes('differs'))).toBe(true)
  })

  it('derives the handoff projection from the current fixture step', () => {
    for (const fixture of fixtures) {
      resetMock()
      const created = mockRequest('POST', `/sessions?case=${fixture.case}`, fixture.steps[0]?.request)
      expect(created.status, fixture.case).toBe(200)
      const sessionId = fixture.steps[0]?.response.session_id
      if (!sessionId) {
        throw new Error(`${fixture.case} has no session`)
      }
      for (const [index, step] of fixture.steps.entries()) {
        if (index > 0) {
          const action = step.endpoint.endsWith('/context') ? 'context' : 'answers'
          const posted = mockRequest('POST', `/sessions/${sessionId}/${action}`, step.request)
          expect(posted.warnings, `${fixture.case} ${index}`).toEqual([])
        }
        const handoff = mockRequest('GET', `/sessions/${sessionId}/handoff`)
        expect(handoff.status, `${fixture.case} ${index}`).toBe(200)
        expect(handoff.warnings, `${fixture.case} ${index}`).toEqual([])
        expect(handoff.body, `${fixture.case} ${index}`).toEqual({
          session_id: step.response.session_id,
          mode: step.response.mode,
          stated_purpose: step.response.stated_purpose,
          risk: step.response.risk,
          suggested_outcome: step.response.suggested_outcome,
          answers: step.response.answers,
          stop: step.response.stop,
          outcome: null,
          actor: null,
        })
        expect(validateHandoff(handoff.body), `${fixture.case} ${index}`).toEqual([])
        const current = mockRequest('GET', `/sessions/${sessionId}`)
        expect(current.body, `${fixture.case} ${index}`).toEqual(step.response)
      }
    }
  })

  it('rejects an outcome without an actor and keeps the fixture state', () => {
    const created = mockRequest('POST', '/sessions?case=T1', t1.steps[0]?.request)
    expect(created.status).toBe(200)
    const sessionId = t1.steps[0]?.response.session_id
    const missing = mockRequest('POST', `/sessions/${sessionId}/outcome`, { outcome: 'proceed' })
    expect(missing.status).toBe(409)
    expect(validateError(missing.body)).toEqual([])
    expect(missing.body).toMatchObject({ error: { code: 'outcome_requires_actor' } })
    const blank = mockRequest('POST', `/sessions/${sessionId}/outcome`, { outcome: 'proceed', actor: '' })
    expect(blank.status).toBe(409)
    expect(blank.body).toMatchObject({ error: { code: 'outcome_requires_actor' } })
    const recorded = mockRequest('POST', `/sessions/${sessionId}/outcome`, {
      outcome: 'slow_down',
      actor: 'teller-1',
    })
    expect(recorded.status).toBe(200)
    expect(recorded.body).toEqual(t1.steps[0]?.response)
    const handoff = mockRequest('GET', `/sessions/${sessionId}/handoff`)
    expect(handoff.status).toBe(200)
    expect(handoff.body).toMatchObject({ outcome: 'slow_down', actor: 'teller-1' })
    expect(validateHandoff(handoff.body)).toEqual([])
    const closed = mockRequest('POST', `/sessions/${sessionId}/outcome`, {
      outcome: 'proceed',
      actor: 'teller-1',
    })
    expect(closed.status).toBe(409)
    expect(closed.body).toMatchObject({ error: { code: 'session_closed' } })
    expect(mockRequest('GET', `/sessions/${sessionId}`).body).toEqual(t1.steps[0]?.response)
  })

  it('replays a live session without a scenario and keeps mode live', () => {
    const amount = (t1.steps[0]?.request as { amount_band: string }).amount_band
    const opened = mockRequest('POST', '/sessions', { mode: 'live', amount_band: amount })
    expect(opened.status).toBe(200)
    expect(opened.warnings).toEqual([])
    expect(validateSessionState(opened.body)).toEqual([])
    const sessionId = (opened.body as { session_id: string }).session_id
    expect(opened.body).toEqual({ ...(t1.steps[0]?.response as object), mode: 'live' })
    const context = t1.steps[1]
    const posted = mockRequest('POST', `/sessions/${sessionId}/context`, context?.request)
    expect(posted.warnings).toEqual([])
    expect(posted.body).toEqual({ ...(context?.response as object), mode: 'live' })
    const undone = mockRequest('POST', `/sessions/${sessionId}/undo`)
    expect(undone.warnings).toEqual([])
    expect(undone.body).toEqual({ ...(t1.steps[0]?.response as object), mode: 'live' })

    resetMock()
    const named = mockRequest('POST', '/sessions?case=T2', {
      mode: 'live',
      amount_band: (t2.steps[0]?.request as { amount_band: string }).amount_band,
    })
    expect(named.warnings).toEqual([])
    expect(named.body).toEqual({ ...(t2.steps[0]?.response as object), mode: 'live' })

    resetMock()
    const practice = mockRequest('POST', '/sessions?case=T2', {
      ...(t2.steps[0]?.request as object),
      scenario_id: 'T2',
    })
    expect(practice.warnings).toEqual([])
    expect(practice.body).toEqual(t2.steps[0]?.response)
  })

  it('rejects scenario_id on a live session with the contract error', () => {
    const result = mockRequest('POST', '/sessions?case=T2', {
      mode: 'live',
      amount_band: '5000_9999',
      scenario_id: 'T2',
    })
    expect(result.status).toBe(409)
    expect(validateError(result.body)).toEqual([])
    expect(result.body).toMatchObject({ error: { code: 'scenario_on_live_session' } })
    expect(mockRequest('GET', '/sessions/fixture-T2').status).toBe(404)
  })

  it('lists live sessions by default and practice on request', () => {
    const liveBody = {
      mode: 'live' as const,
      amount_band: (t1.steps[0]?.request as { amount_band: string }).amount_band,
    }
    const live = mockRequest('POST', '/sessions', liveBody)
    expect(live.status).toBe(200)
    const practice = mockRequest('POST', '/sessions?case=T2', {
      ...(t2.steps[0]?.request as object),
      scenario_id: 'T2',
    })
    expect(practice.status).toBe(200)
    const liveId = (live.body as { session_id: string }).session_id
    const practiceId = (practice.body as { session_id: string }).session_id
    const listed = mockRequest('GET', '/sessions')
    expect(listed.status).toBe(200)
    const liveIds = (listed.body as { sessions: { session_id: string; mode: string }[] }).sessions.map(
      (row) => row.session_id,
    )
    expect(liveIds).toContain(liveId)
    expect(liveIds).not.toContain(practiceId)
    const practiceList = mockRequest('GET', '/sessions?mode=practice')
    const practiceIds = (practiceList.body as { sessions: { session_id: string; mode: string }[] }).sessions.map(
      (row) => row.session_id,
    )
    expect(practiceIds).toEqual([practiceId])
    const health = mockRequest('GET', '/health')
    expect(health.status).toBe(200)
    expect(health.body).toMatchObject({ recommender: 'rules', model_id: null, fallback_rate: 0 })
    expect(mockRequest('POST', '/health').status).toBe(404)
  })

  it('projects live context chips that are not the next fixture step', () => {
    const opened = mockRequest('POST', '/sessions', { mode: 'live', amount_band: '5000_9999' })
    const sessionId = (opened.body as { session_id: string }).session_id
    const posted = mockRequest('POST', `/sessions/${sessionId}/context`, {
      chips: ['chip.on_phone', 'chip.someone_directing', 'chip.cash_only'],
    })
    expect(posted.status).toBe(200)
    expect(posted.warnings).toEqual([])
    expect(validateSessionState(posted.body)).toEqual([])
    expect(posted.body).toMatchObject({ mode: 'live', session_id: sessionId, risk: { level: 'caution' } })
    const undone = mockRequest('POST', `/sessions/${sessionId}/undo`)
    expect(undone.body).toMatchObject({ risk: { level: 'clear', score: 0 } })
  })
})
