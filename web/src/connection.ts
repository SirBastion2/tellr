import { installSampleFetch } from '../mock/sampleFetch'
import { resetApiBase, setApiBase } from './api'
import { readHealth } from './screens/HealthScreen'

/** Origin probed when `VITE_API_URL` is unset. `npm run dev:api` sets that variable to this origin. */
export const DEFAULT_LIVE_ORIGIN = 'http://127.0.0.1:8000'

export type ConnectionKind = 'checking' | 'live' | 'sample' | 'offline'

export type ConnectionState = {
  kind: ConnectionKind
  base: string
}

const listeners = new Set<(state: ConnectionState) => void>()

let state: ConnectionState = { kind: 'checking', base: '' }
let pending: Promise<ConnectionState> | null = null

export function connectionState(): ConnectionState {
  return state
}

export function connectionLabel(kind: ConnectionKind): string {
  if (kind === 'live') {
    return 'Live API connected'
  }
  if (kind === 'sample') {
    return 'Using sample data'
  }
  if (kind === 'offline') {
    return 'API not connected'
  }
  return 'Checking connection'
}

export function subscribeConnection(listener: (next: ConnectionState) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function commit(next: ConnectionState): ConnectionState {
  setApiBase(next.base)
  state = next
  for (const listener of listeners) {
    listener(next)
  }
  return next
}

export function configuredApiUrl(): string {
  return (import.meta.env.VITE_API_URL ?? '').trim()
}

/**
 * Live when GET /health on the configured origin (or 127.0.0.1:8000) returns a health report.
 * Otherwise sample data, when /health answers. In dev that is the Vite mock. In a production
 * build the browser replay is installed when that probe fails. A production build on a public
 * host with no VITE_API_URL skips the 127.0.0.1 probe and uses sample data directly. When
 * neither health check answers, the result is offline.
 */
export function connectionFromProbe(options: {
  configured: string
  liveOk: boolean
  sampleOk: boolean
}): ConnectionState {
  const candidate = options.configured || DEFAULT_LIVE_ORIGIN
  if (options.liveOk) {
    return { kind: 'live', base: candidate }
  }
  if (options.sampleOk) {
    return { kind: 'sample', base: '' }
  }
  return { kind: 'offline', base: options.configured }
}

async function healthOk(base: string): Promise<boolean> {
  try {
    const response = await fetch(`${base}/health`, { method: 'GET' })
    if (!response.ok) {
      return false
    }
    const text = await response.text()
    if (!text) {
      return false
    }
    return readHealth(JSON.parse(text) as unknown) !== null
  } catch {
    return false
  }
}

export async function ensureConnection(): Promise<ConnectionState> {
  if (import.meta.env.MODE === 'test') {
    const base = configuredApiUrl()
    const next: ConnectionState = { kind: base ? 'live' : 'sample', base }
    state = next
    for (const listener of listeners) {
      listener(next)
    }
    return next
  }
  if (!pending) {
    pending = probeConnection(import.meta.env.PROD).catch((error: unknown) => {
      pending = null
      throw error
    })
  }
  return pending
}

const LOCAL_PAGE_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

/** `::1` is also `[::1]` after URL host serialization. */
function isLocalPageHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return LOCAL_PAGE_HOSTS.has(host)
}

function pageHostname(): string {
  if (typeof window === 'undefined') {
    return 'localhost'
  }
  return window.location.hostname
}

/**
 * `prod` is `import.meta.env.PROD`. Dev passes false and keeps the Vite middleware.
 * A production build with `VITE_API_URL` unset does not probe 127.0.0.1 from a public host.
 */
export async function probeConnection(prod: boolean): Promise<ConnectionState> {
  const configured = configuredApiUrl()
  if (prod && configured === '' && !isLocalPageHost(pageHostname())) {
    installSampleFetch()
    return commit({ kind: 'sample', base: '' })
  }
  const candidate = configured || DEFAULT_LIVE_ORIGIN
  const liveOk = await healthOk(candidate)
  if (!liveOk && prod) {
    installSampleFetch()
  }
  const sampleOk = liveOk ? false : await healthOk('')
  return commit(connectionFromProbe({ configured, liveOk, sampleOk }))
}

export function resetConnectionForTests(): void {
  pending = null
  state = { kind: 'checking', base: '' }
  resetApiBase()
}
