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
import { validateError, validateSessionState } from './validate'

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
})
