import { describe, expect, it } from 'vitest'
import { friendlyApiError } from './errors'
import type { ErrorResponse } from './types'

function error(code: ErrorResponse['error']['code'], message: string): ErrorResponse {
  return { error: { code, message } }
}

describe('friendly API errors', () => {
  it('hides status codes and machine codes', () => {
    const text = friendlyApiError(error('session_closed', 'session is closed'), 409)
    expect(text).toMatch(/already closed/)
    expect(text).not.toMatch(/409/)
    expect(text).not.toMatch(/session_closed/)
    expect(text).not.toMatch(/session is closed/)
    expect(friendlyApiError(null, 500)).not.toMatch(/500/)
    expect(friendlyApiError(null, 200)).toBeNull()
    expect(friendlyApiError(null, null)).toBeNull()
    expect(friendlyApiError(error('outcome_requires_actor', 'outcome requires an actor'), 409)).toMatch(/teller name/i)
  })
})
