import { mockRequest } from './replay.ts'

/**
 * Browser stand-in for `mock/plugin.ts`. Production builds have no Vite
 * middleware. The shim replays `mockRequest` for the same routes and does
 * not score, pick a level, or choose the next question.
 */

let savedFetch: typeof window.fetch | null = null

export function installSampleFetch(): void {
  if (savedFetch || typeof window === 'undefined') {
    return
  }
  const nativeFetch = window.fetch.bind(window)
  savedFetch = nativeFetch
  window.fetch = async (input, init) => {
    const replayed = await replaySample(input, init)
    if (replayed) {
      return replayed
    }
    return nativeFetch(input, init)
  }
}

export function resetSampleFetchForTests(): void {
  if (savedFetch) {
    window.fetch = savedFetch
    savedFetch = null
  }
}

function isSamplePath(pathname: string): boolean {
  return pathname === '/library' || pathname === '/health' || pathname.startsWith('/sessions')
}

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof URL) {
      return new URL(input.href)
    }
    if (typeof input === 'string') {
      return new URL(input, window.location.href)
    }
    return new URL(input.url)
  } catch {
    return null
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) {
    return init.method
  }
  if (input instanceof Request) {
    return input.method
  }
  return 'GET'
}

async function rawBody(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  if (typeof init?.body === 'string') {
    return init.body
  }
  if (init?.body != null) {
    return new Response(init.body).text()
  }
  if (input instanceof Request) {
    return input.clone().text()
  }
  return ''
}

async function replaySample(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  const url = requestUrl(input)
  if (!url || url.origin !== window.location.origin || !isSamplePath(url.pathname)) {
    return null
  }
  const raw = await rawBody(input, init)
  let body: unknown
  if (raw.length > 0) {
    try {
      body = JSON.parse(raw) as unknown
    } catch {
      return new Response('null', {
        status: 422,
        headers: { 'content-type': 'application/json' },
      })
    }
  }
  const result = mockRequest(requestMethod(input, init), `${url.pathname}${url.search}`, body)
  for (const warning of result.warnings) {
    console.warn(`mock: ${warning}`)
  }
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'content-type': 'application/json' },
  })
}
