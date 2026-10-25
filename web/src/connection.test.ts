import { describe, expect, it } from 'vitest'
import { connectionFromProbe, connectionLabel, DEFAULT_LIVE_ORIGIN } from './connection'

describe('API connection choice', () => {
  it('prefers a healthy live origin and otherwise uses sample data', () => {
    expect(connectionFromProbe({ configured: '', liveOk: true, sampleOk: true })).toEqual({
      kind: 'live',
      base: DEFAULT_LIVE_ORIGIN,
    })
    expect(connectionFromProbe({ configured: 'http://127.0.0.1:9000', liveOk: true, sampleOk: false })).toEqual({
      kind: 'live',
      base: 'http://127.0.0.1:9000',
    })
    expect(connectionFromProbe({ configured: 'http://127.0.0.1:8000', liveOk: false, sampleOk: true })).toEqual({
      kind: 'sample',
      base: '',
    })
    expect(connectionFromProbe({ configured: 'http://127.0.0.1:8000', liveOk: false, sampleOk: false })).toEqual({
      kind: 'offline',
      base: 'http://127.0.0.1:8000',
    })
    expect(connectionLabel('live')).toBe('Live API connected')
    expect(connectionLabel('sample')).toBe('Using sample data')
    expect(connectionLabel('offline')).not.toMatch(/409|session_closed/)
  })
})
