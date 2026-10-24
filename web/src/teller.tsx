import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiSend } from './api'
import { openingRequest } from '../mock/replay'
import type { AnswerPost, ErrorResponse, HandoffProjection, Library, OutcomeId, SessionState } from './types'
import { handoffShapeIssues, validateError, validateLibrary, validateSessionState, type SchemaIssue } from './validate'

type TellerValue = {
  library: Library | null
  session: SessionState | null
  issues: SchemaIssue[]
  httpStatus: number | null
  error: ErrorResponse | null
  postedChipIds: string[]
  handoff: HandoffProjection | null
  startCase: (caseId: string) => Promise<SessionState | null>
  postContext: (chips: string[]) => Promise<void>
  postAnswer: (answer: AnswerPost) => Promise<void>
  postOutcome: (outcome: OutcomeId, actor: string) => Promise<void>
  loadHandoff: () => Promise<void>
  undo: () => Promise<void>
}

type ClientWrite = { kind: 'context'; chips: string[] } | { kind: 'answer' }

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
  const [writes, setWrites] = useState<ClientWrite[]>([])
  const [handoff, setHandoff] = useState<HandoffProjection | null>(null)

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
    setWrites([])
    setHandoff(null)
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
      setWrites((current) => [...current, { kind: 'context', chips }])
    }
  }

  async function postAnswer(answer: AnswerPost): Promise<void> {
    if (!session) {
      return
    }
    const body: AnswerPost = {
      question_id: answer.question_id,
      chip: answer.chip,
    }
    if (answer.purpose !== undefined) {
      body.purpose = answer.purpose
    }
    const result = await apiSend('POST', `/sessions/${session.session_id}/answers`, body)
    const next = takeSession(result)
    if (next) {
      setWrites((current) => [...current, { kind: 'answer' }])
    }
  }

  const postOutcome = useCallback(
    async (outcome: OutcomeId, actor: string): Promise<void> => {
      const trimmed = actor.trim()
      if (!session || trimmed.length === 0) {
        return
      }
      const result = await apiSend('POST', `/sessions/${session.session_id}/outcome`, {
        outcome,
        actor: trimmed,
      })
      takeSession(result)
    },
    [session],
  )

  const loadHandoff = useCallback(async (): Promise<void> => {
    if (!session) {
      return
    }
    const result = await apiSend('GET', `/sessions/${session.session_id}/handoff`)
    setHttpStatus(result.status)
    if (result.status !== 200) {
      setHandoff(null)
      return
    }
    const found = handoffShapeIssues(result.body)
    setIssues(found)
    setError(null)
    if (found.length > 0) {
      setHandoff(null)
      return
    }
    setHandoff(result.body as HandoffProjection)
  }, [session])

  async function undo(): Promise<void> {
    if (!session) {
      return
    }
    const result = await apiSend('POST', `/sessions/${session.session_id}/undo`)
    const next = takeSession(result)
    if (next) {
      setWrites((current) => current.slice(0, -1))
    }
  }

  const value: TellerValue = {
    library,
    session,
    issues,
    httpStatus,
    error,
    postedChipIds: writes.flatMap((write) => (write.kind === 'context' ? write.chips : [])),
    handoff,
    startCase,
    postContext,
    postAnswer,
    postOutcome,
    loadHandoff,
    undo,
  }

  return <TellerContext.Provider value={value}>{children}</TellerContext.Provider>
}
