import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiSend } from './api'
import { openingRequest } from '../mock/replay'
import type { ErrorResponse, Library, SessionState } from './types'
import { validateError, validateLibrary, validateSessionState, type SchemaIssue } from './validate'

type TellerValue = {
  library: Library | null
  session: SessionState | null
  issues: SchemaIssue[]
  httpStatus: number | null
  error: ErrorResponse | null
  postedChipIds: string[]
  startCase: (caseId: string) => Promise<SessionState | null>
  postContext: (chips: string[]) => Promise<void>
  undo: () => Promise<void>
}

const TellerContext = createContext<TellerValue | null>(null)

export function useTeller(): TellerValue {
  const value = useContext(TellerContext)
  if (!value) {
    throw new Error('TellerProvider missing')
  }
  return value
}

export function TellerProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<Library | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)
  const [issues, setIssues] = useState<SchemaIssue[]>([])
  const [httpStatus, setHttpStatus] = useState<number | null>(null)
  const [error, setError] = useState<ErrorResponse | null>(null)
  const [batches, setBatches] = useState<string[][]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await apiSend('GET', '/library')
        if (cancelled) {
          return
        }
        if (result.status !== 200) {
          setHttpStatus(result.status)
          return
        }
        const found = validateLibrary(result.body)
        setIssues(found)
        setHttpStatus(result.status)
        if (found.length === 0) {
          setLibrary(result.body as Library)
        }
      } catch {
        if (!cancelled) {
          setHttpStatus(0)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function takeSession(result: { status: number; body: unknown }): SessionState | null {
    setHttpStatus(result.status)
    if (result.status === 409) {
      const found = validateError(result.body)
      setIssues(found)
      setError(found.length === 0 ? (result.body as ErrorResponse) : null)
      return null
    }
    if (result.status !== 200) {
      return null
    }
    const found = validateSessionState(result.body)
    setIssues(found)
    setError(null)
    if (found.length > 0) {
      return null
    }
    const next = result.body as SessionState
    setSession(next)
    return next
  }

  async function startCase(caseId: string): Promise<SessionState | null> {
    const request = openingRequest(caseId)
    if (request === null) {
      setHttpStatus(404)
      return null
    }
    setBatches([])
    const result = await apiSend('POST', `/sessions?case=${encodeURIComponent(caseId)}`, request)
    return takeSession(result)
  }

  async function postContext(chips: string[]): Promise<void> {
    if (!session) {
      return
    }
    const result = await apiSend('POST', `/sessions/${session.session_id}/context`, { chips })
    const next = takeSession(result)
    if (next) {
      setBatches((current) => [...current, chips])
    }
  }

  async function undo(): Promise<void> {
    if (!session) {
      return
    }
    const result = await apiSend('POST', `/sessions/${session.session_id}/undo`)
    const next = takeSession(result)
    if (next) {
      setBatches((current) => current.slice(0, -1))
    }
  }

  const value: TellerValue = {
    library,
    session,
    issues,
    httpStatus,
    error,
    postedChipIds: batches.flat(),
    startCase,
    postContext,
    undo,
  }

  return <TellerContext.Provider value={value}>{children}</TellerContext.Provider>
}
