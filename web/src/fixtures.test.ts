import library from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import t2 from '../../contract/fixtures/T2.json'
import t3 from '../../contract/fixtures/T3.json'
import t4 from '../../contract/fixtures/T4.json'
import t5 from '../../contract/fixtures/T5.json'
import t6 from '../../contract/fixtures/T6.json'
import t7 from '../../contract/fixtures/T7.json'
import { describe, expect, it } from 'vitest'
import { validateError, validateLibrary, validateSessionState } from './validate'

const fixtures = [t1, t2, t3, t4, t5, t6, t7]

describe('contract fixtures', () => {
  it('validates the library', () => {
    expect(validateLibrary(library)).toEqual([])
  })

  it('validates every step of every fixture', () => {
    const failures: string[] = []
    for (const fixture of fixtures) {
      for (const [index, step] of fixture.steps.entries()) {
        const issues = validateSessionState(step.response)
        if (issues.length > 0) {
          failures.push(`${fixture.case} step ${index}: ${JSON.stringify(issues)}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('rejects a session that breaks the schema', () => {
    const issues = validateSessionState({ session_id: 1 })
    expect(issues.length).toBeGreaterThan(0)
  })

  it('rejects debug keys outside the contract', () => {
    const session = structuredClone(t2.steps[0]?.response) as Record<string, unknown>
    const debug = session.debug
    session.debug = { ...(debug && typeof debug === 'object' ? debug : {}), extra: true }
    expect(validateSessionState(session).length).toBeGreaterThan(0)
  })

  it('accepts the exhaustive 409 codes and rejects an unknown code', () => {
    for (const code of [
      'outcome_requires_actor',
      'close_without_outcome',
      'purpose_required_on_opener',
      'purpose_not_allowed',
      'session_closed',
      'scenario_on_live_session',
    ]) {
      expect(validateError({ error: { code, message: 'rejected' } })).toEqual([])
    }
    expect(validateError({ error: { code: 'not_a_code', message: 'rejected' } }).length).toBeGreaterThan(0)
  })
})
