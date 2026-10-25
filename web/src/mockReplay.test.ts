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
import { CUSTOMERS } from './demo/customers'
import { validateActivity, validateError, validateHandoff, validateSessionState } from './validate'

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
    expect(health.body).toMatchObject({
      recommender: 'rules',
      model_id: null,
      fallback_rate: 0,
      level_bands: [
        { level: 'clear', label: 'Clear', min: 0, max: 24 },
        { level: 'caution', label: 'Caution', min: 25, max: 59 },
        { level: 'high', label: 'High concern', min: 60, max: 100 },
      ],
    })
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
    expect(posted.body).toMatchObject({
      mode: 'live',
      session_id: sessionId,
      risk: { level: 'caution' },
      question: { text: "What's the money for today?" },
      talk_track: {
        stage: 'tt.slow_down',
        action: 'Pause the cash. Verify the story, and offer a cashier\'s check.',
      },
    })
    const undone = mockRequest('POST', `/sessions/${sessionId}/undo`)
    expect(undone.body).toMatchObject({ risk: { level: 'clear', score: 0 } })
  })

  it('echoes context source and serves activity without inventing an explanation', () => {
    const opened = mockRequest('POST', '/sessions', { mode: 'live', amount_band: '5000_9999' })
    const sessionId = (opened.body as { session_id: string }).session_id
    expect(mockRequest('GET', '/sessions/missing/activity').status).toBe(404)
    const empty = mockRequest('GET', `/sessions/${sessionId}/activity`)
    expect(empty.status).toBe(200)
    expect(validateActivity(empty.body)).toEqual([])
    expect(empty.body).toEqual({ session_id: sessionId, rows: [] })
    expect(opened.body).not.toHaveProperty('explanation')

    const posted = mockRequest('POST', `/sessions/${sessionId}/context`, {
      chips: ['chip.on_phone'],
      source: 'observed',
    })
    expect(validateSessionState(posted.body)).toEqual([])
    expect(posted.body).toMatchObject({
      context_chips: [{ id: 'chip.on_phone', source: 'observed' }],
    })
    expect(posted.body).not.toHaveProperty('explanation')
    const activity = mockRequest('GET', `/sessions/${sessionId}/activity`)
    expect(validateActivity(activity.body)).toEqual([])
    expect(activity.body).toEqual({
      session_id: sessionId,
      rows: [
        {
          ts: '2026-10-24T00:00:00Z',
          channel: 'chip.on_phone',
          amount_band: '5000_9999',
          type: 'ContextAdded',
        },
      ],
    })

    resetMock()
    const practice = mockRequest('POST', '/sessions?case=T1', t1.steps[0]?.request)
    const practiceId = t1.steps[0]?.response.session_id
    const context = t1.steps[1]
    const replayed = mockRequest('POST', `/sessions/${practiceId}/context`, context?.request)
    expect(replayed.body).toEqual(context?.response)
    expect(replayed.body).not.toHaveProperty('context_chips')
    const projected = mockRequest('GET', `/sessions/${practiceId}/activity`)
    expect(validateActivity(projected.body)).toEqual([])
    expect(projected.body).toMatchObject({ session_id: practiceId })
    expect((projected.body as { rows: { channel: string; type: string }[] }).rows.length).toBeGreaterThan(0)
    expect(practice.status).toBe(200)
  })

  it('scores a live government-impersonation answer path 45 → 52 → 62 → 75 → 93 → 100', () => {
    const opened = mockRequest('POST', '/sessions', { mode: 'live', amount_band: '5000_9999' })
    const sessionId = (opened.body as { session_id: string }).session_id
    const chips = [
      'chip.on_phone',
      'chip.someone_directing',
      'chip.urgency_secrecy',
      'chip.cash_only',
      'chip.above_threshold',
    ]
    const context = mockRequest('POST', `/sessions/${sessionId}/context`, { chips, source: 'observed' })
    expect(context.status).toBe(200)
    expect(validateSessionState(context.body)).toEqual([])
    expect(context.body).toMatchObject({
      answers: 0,
      risk: { level: 'caution', score: 45 },
      question: { id: 'q.purpose.open', text: "What's the money for today?" },
    })

    const missingPurpose = mockRequest('POST', `/sessions/${sessionId}/answers`, {
      question_id: 'q.purpose.open',
      chip: 'relayed_by_caller',
    })
    expect(missingPurpose.status).toBe(409)
    expect(validateError(missingPurpose.body)).toEqual([])
    expect(missingPurpose.body).toMatchObject({ error: { code: 'purpose_required_on_opener' } })

    const opener = mockRequest('POST', `/sessions/${sessionId}/answers`, {
      question_id: 'q.purpose.open',
      chip: 'relayed_by_caller',
      purpose: 'purpose.government_payment',
    })
    expect(opener.status).toBe(200)
    expect(opener.warnings).toEqual([])
    expect(validateSessionState(opener.body)).toEqual([])
    expect(opener.body).toMatchObject({
      answers: 1,
      stated_purpose: 'purpose.government_payment',
      risk: { level: 'caution', score: 52 },
      question: { id: 'q.secrecy.told_not_to_tell' },
    })
    expect((opener.body as { question: { text: string } }).question.text).not.toBe("What's the money for today?")

    const secrecy = mockRequest('POST', `/sessions/${sessionId}/answers`, {
      question_id: 'q.secrecy.told_not_to_tell',
      chip: 'confirmed',
    })
    expect(secrecy.status).toBe(200)
    expect(secrecy.warnings).toEqual([])
    expect(validateSessionState(secrecy.body)).toEqual([])
    expect(secrecy.body).toMatchObject({
      answers: 2,
      risk: { level: 'high', raw_level: 'high', score: 62 },
      question: { id: 'q.alternative.cashiers_check' },
    })

    const denied = mockRequest('POST', `/sessions/${sessionId}/answers`, {
      question_id: 'q.alternative.cashiers_check',
      chip: 'denied',
    })
    expect(denied.status).toBe(200)
    expect(denied.warnings).toEqual([])
    expect(validateSessionState(denied.body)).toEqual([])
    expect(denied.body).toMatchObject({
      answers: 3,
      risk: { level: 'high', raw_level: 'high', score: 75 },
    })

    const gap = mockRequest('POST', `/sessions/${sessionId}/answers`, {
      question_id: 'q.recipient.account_details',
      chip: 'no_answer',
    })
    expect(gap.status).toBe(200)
    expect(gap.warnings).toEqual([])
    expect(validateSessionState(gap.body)).toEqual([])
    expect(gap.body).toMatchObject({
      answers: 4,
      risk: { level: 'high', raw_level: 'high', score: 93 },
    })

    const changed = mockRequest('POST', `/sessions/${sessionId}/answers`, {
      question_id: 'q.homerepair.contractor_name',
      chip: 'changed',
    })
    expect(changed.status).toBe(200)
    expect(changed.warnings).toEqual([])
    expect(validateSessionState(changed.body)).toEqual([])
    expect(changed.body).toMatchObject({
      answers: 5,
      risk: { level: 'high', raw_level: 'high', score: 100 },
    })
    const contributions = (
      changed.body as {
        explanation: { contributions: { signal_id: string; label: string }[] }
      }
    ).explanation.contributions
    expect(contributions.map((row) => [row.signal_id, row.label])).toEqual(
      expect.arrayContaining([
        ['sig.secrecy_bank', 'Told not to discuss with the bank'],
        ['sig.answer_relayed', 'Answer relayed by caller'],
        ['sig.specificity_gap', 'Missing details'],
        ['sig.cash_refusal_unexplained', 'Turned down a safer option'],
        ['sig.story_drift', 'Story changed'],
      ]),
    )
  })

  it('plays each demo script to an engine-recorded score', () => {
    const ladders: Record<string, { score: number; level: string }[]> = {
      'contractor-cash': [
        { score: 14, level: 'clear' },
        { score: 22, level: 'clear' },
        { score: 34, level: 'caution' },
        { score: 45, level: 'caution' },
        { score: 58, level: 'caution' },
        { score: 76, level: 'high' },
        { score: 86, level: 'high' },
      ],
      'romance-crypto': [
        { score: 16, level: 'clear' },
        { score: 28, level: 'caution' },
        { score: 45, level: 'caution' },
        { score: 45, level: 'caution' },
        { score: 60, level: 'high' },
        { score: 73, level: 'high' },
      ],
      'government-impersonation': [
        { score: 14, level: 'clear' },
        { score: 22, level: 'clear' },
        { score: 40, level: 'caution' },
        { score: 45, level: 'caution' },
        { score: 52, level: 'caution' },
        { score: 62, level: 'high' },
        { score: 75, level: 'high' },
        { score: 93, level: 'high' },
        { score: 100, level: 'high' },
      ],
    }
    for (const customer of CUSTOMERS) {
      resetMock()
      const opened = mockRequest('POST', '/sessions', { mode: 'live', amount_band: customer.transaction.amountBand })
      expect(opened.status, customer.id).toBe(200)
      const sessionId = (opened.body as { session_id: string }).session_id
      expect(opened.body).toMatchObject({ risk: { level: 'clear', score: 0 } })
      const posts = customer.events.filter((event) => event.chips.length > 0 || event.answer)
      if (customer.id === 'benign-car' || customer.id === 'benign-routine') {
        expect(posts, customer.id).toHaveLength(0)
        continue
      }
      const seen: { score: number; level: string }[] = []
      for (const event of posts) {
        if (event.chips.length > 0) {
          const posted = mockRequest('POST', `/sessions/${sessionId}/context`, {
            chips: event.chips,
            source: 'observed',
          })
          expect(posted.warnings, `${customer.id} ${event.id}`).toEqual([])
          expect(validateSessionState(posted.body), `${customer.id} ${event.id}`).toEqual([])
          const risk = (posted.body as { risk: { score: number; level: string } }).risk
          seen.push({ score: risk.score, level: risk.level })
        }
        if (event.answer) {
          const body: { question_id: string; chip: string; purpose?: string } = {
            question_id: event.answer.question_id,
            chip: event.answer.chip,
          }
          if (event.answer.purpose !== undefined) {
            body.purpose = event.answer.purpose
          }
          const posted = mockRequest('POST', `/sessions/${sessionId}/answers`, body)
          expect(posted.warnings, `${customer.id} ${event.id}`).toEqual([])
          expect(validateSessionState(posted.body), `${customer.id} ${event.id}`).toEqual([])
          const risk = (posted.body as { risk: { score: number; level: string } }).risk
          seen.push({ score: risk.score, level: risk.level })
        }
      }
      expect(seen, customer.id).toEqual(ladders[customer.id])
    }
  })
})
