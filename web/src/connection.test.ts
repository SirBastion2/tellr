import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockRequest, resetMock } from '../mock/replay'
import { resetSampleFetchForTests } from '../mock/sampleFetch'
import {
  connectionFromProbe,
  connectionLabel,
  DEFAULT_LIVE_ORIGIN,
  ensureConnection,
  probeConnection,
  resetConnectionForTests,
} from './connection'

describe('API connection choice', () => {
  afterEach(() => {
    resetSampleFetchForTests()
    resetConnectionForTests()
    resetMock()
    vi.unstubAllGlobals()
  })

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
    expect(connectionLabel('offline')).toBe('API not connected')
    expect(connectionLabel('offline')).not.toMatch(/409|session_closed/)
  })

  it('keeps vitest on the page origin and does not probe or install the sample shim', async () => {
    const native = vi.fn()
    vi.stubGlobal('fetch', native)
    const state = await ensureConnection()
    expect(native).not.toHaveBeenCalled()
    expect(state).toEqual({ kind: 'sample', base: '' })
    expect(connectionLabel(state.kind)).toBe('Using sample data')
    await fetch('/library')
    expect(native).toHaveBeenCalledTimes(1)
  })

  it('replays sample routes in a production build when no live API answers', async () => {
    const native = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('http://127.0.0.1:8000/health')
      return new Response('offline', { status: 503 })
    })
    vi.stubGlobal('fetch', native)
    const state = await probeConnection(true)
    expect(state).toEqual({ kind: 'sample', base: '' })
    expect(connectionLabel(state.kind)).toBe('Using sample data')
    expect(native).toHaveBeenCalledTimes(1)

    const health = await fetch('/health')
    expect(health.status).toBe(mockRequest('GET', '/health').status)
    expect(await health.json()).toEqual(mockRequest('GET', '/health').body)

    const library = await fetch('/library')
    expect(await library.json()).toEqual(mockRequest('GET', '/library').body)

    const opened = await fetch('/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'live', amount_band: '5000_9999' }),
    })
    expect(opened.status).toBe(200)
    const openedBody = (await opened.json()) as { mode?: string; session_id?: string }
    expect(openedBody.mode).toBe('live')
    expect(openedBody.session_id).toEqual(expect.any(String))
    expect(native).toHaveBeenCalledTimes(1)
  })

  it('does not install the sample shim outside production, so a missing dev server stays offline', async () => {
    const native = vi.fn(async () => new Response('offline', { status: 503 }))
    vi.stubGlobal('fetch', native)
    const state = await probeConnection(false)
    expect(state).toEqual({ kind: 'offline', base: '' })
    expect(connectionLabel(state.kind)).toBe('API not connected')
    expect(native).toHaveBeenCalledTimes(2)
    const library = await fetch('/library')
    expect(library.status).toBe(503)
    expect(native).toHaveBeenCalledTimes(3)
  })

  it('keeps a healthy live origin in production and does not replay sample routes', async () => {
    const healthBody = mockRequest('GET', '/health').body
    const native = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === 'http://127.0.0.1:8000/health') {
        return new Response(JSON.stringify(healthBody), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response('missing', { status: 404 })
    })
    vi.stubGlobal('fetch', native)
    const state = await probeConnection(true)
    expect(state).toEqual({ kind: 'live', base: DEFAULT_LIVE_ORIGIN })
    expect(connectionLabel(state.kind)).toBe('Live API connected')
    const library = await fetch('/library')
    expect(library.status).toBe(404)
  })

  it('forwards non-sample urls and returns 422 for a bad sample body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('offline', { status: 503 })),
    )
    await probeConnection(true)
    const favicon = await fetch('/favicon.svg')
    expect(favicon.status).toBe(503)
    const bad = await fetch('/sessions', { method: 'POST', body: '{' })
    expect(bad.status).toBe(422)
    expect(await bad.json()).toBeNull()
    const cross = await fetch('http://127.0.0.1:8000/library')
    expect(cross.status).toBe(503)
  })
})
