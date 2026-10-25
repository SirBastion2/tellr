import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiSend } from './api'
import { openingRequest } from '../mock/replay'
import type { AnswerPost, ErrorResponse, HandoffProjection, Library, OutcomeId, SessionState } from './types'
import { validateError, validateHandoff, validateLibrary, validateSessionState, type SchemaIssue } from './validate'

type TellerValue = {
  library: Library | null
  session: SessionState | null
  issues: SchemaIssue[]
  httpStatus: number | null
  error: ErrorResponse | null
  postedChipIds: string[]
  handoff: HandoffProjection | null
  startCase: (caseId: string) => Promise<SessionState | null>
  startLive: () => Promise<SessionState | null>
  postContext: (chips: string[]) => Promise<void>
  postAnswer: (answer: AnswerPost) => Promise<void>
  postOutcome: (outcome: OutcomeId, actor: string) => Promise<void>
  loadHandoff: () => Promise<void>
  undo: () => Promise<void>
  dismissChip: (chipId: string) => Promise<void>
}

type ClientWrite = { kind: 'context'; chips: string[] } | { kind: 'answer'; answer: AnswerPost }

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
  const sessionRef = useRef<SessionState | null>(null)
  const writesRef = useRef<ClientWrite[]>([])

  const rememberSession = useCallback((next: SessionState | null) => {
    sessionRef.current = next
    setSession(next)
  }, [])

  const rememberWrites = useCallback((next: ClientWrite[]) => {
    writesRef.current = next
    setWrites(next)
  }, [])

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

  const takeSession = useCallback((result: { status: number; body: unknown }): SessionState | null => {
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
    rememberSession(next)
    return next
  }, [rememberSession])

  async function startCase(caseId: string): Promise<SessionState | null> {
    const request = openingRequest(caseId)
    if (request === null || typeof request !== 'object' || Array.isArray(request)) {
      setHttpStatus(404)
      return null
    }
    rememberWrites([])
    setHandoff(null)
    const body = { ...(request as Record<string, unknown>), scenario_id: caseId }
    const result = await apiSend('POST', `/sessions?case=${encodeURIComponent(caseId)}`, body)
    return takeSession(result)
  }

  async function startLive(): Promise<SessionState | null> {
    const sample = openingRequest('T1')
    const amountBand =
      sample && typeof sample === 'object' && typeof (sample as { amount_band?: unknown }).amount_band === 'string'
        ? (sample as { amount_band: string }).amount_band
        : '5000_9999'
    rememberWrites([])
    setHandoff(null)
    const result = await apiSend('POST', '/sessions', { mode: 'live', amount_band: amountBand })
    return takeSession(result)
  }

  async function postContext(chips: string[]): Promise<void> {
    const current = sessionRef.current
    if (!current) {
      return
    }
    const result = await apiSend('POST', `/sessions/${current.session_id}/context`, { chips })
    const next = takeSession(result)
    if (next) {
      rememberWrites([...writesRef.current, { kind: 'context', chips }])
    }
  }

  async function postAnswer(answer: AnswerPost): Promise<void> {
    const current = sessionRef.current
    if (!current) {
      return
    }
    const body: AnswerPost = {
      question_id: answer.question_id,
      chip: answer.chip,
    }
    if (answer.purpose !== undefined) {
      body.purpose = answer.purpose
    }
    const result = await apiSend('POST', `/sessions/${current.session_id}/answers`, body)
    const next = takeSession(result)
    if (next) {
      rememberWrites([...writesRef.current, { kind: 'answer', answer }])
    }
  }

  const postOutcome = useCallback(async (outcome: OutcomeId, actor: string): Promise<void> => {
    const current = sessionRef.current
    const trimmed = actor.trim()
    if (!current || trimmed.length === 0) {
      return
    }
    const result = await apiSend('POST', `/sessions/${current.session_id}/outcome`, {
      outcome,
      actor: trimmed,
    })
    takeSession(result)
  }, [takeSession])

  const loadHandoff = useCallback(async (): Promise<void> => {
    const current = sessionRef.current
    if (!current) {
      return
    }
    const result = await apiSend('GET', `/sessions/${current.session_id}/handoff`)
    setHttpStatus(result.status)
    if (result.status !== 200) {
      setHandoff(null)
      return
    }
    const found = validateHandoff(result.body)
    setIssues(found)
    setError(null)
    if (found.length > 0) {
      setHandoff(null)
      return
    }
    setHandoff(result.body as HandoffProjection)
  }, [])

  async function undo(): Promise<void> {
    const current = sessionRef.current
    if (!current) {
      return
    }
    const result = await apiSend('POST', `/sessions/${current.session_id}/undo`)
    const next = takeSession(result)
    if (next) {
      rememberWrites(writesRef.current.slice(0, -1))
    }
  }

  async function dismissChip(chipId: string): Promise<void> {
    const start = writesRef.current
    const index = start.findIndex((write) => write.kind === 'context' && write.chips.includes(chipId))
    if (index < 0) {
      return
    }
    const target = start[index]
    if (!target || target.kind !== 'context') {
      return
    }
    const tail = start.slice(index + 1)
    const steps = start.length - index
    for (let step = 0; step < steps; step += 1) {
      await undo()
    }
    const kept = target.chips.filter((chip) => chip !== chipId)
    if (kept.length > 0) {
      await postContext(kept)
    }
    for (const write of tail) {
      if (write.kind === 'context') {
        const chips = write.chips.filter((chip) => chip !== chipId)
        if (chips.length > 0) {
          await postContext(chips)
        }
      } else {
        await postAnswer(write.answer)
      }
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
    startLive,
    postContext,
    postAnswer,
    postOutcome,
    loadHandoff,
    undo,
    dismissChip,
  }

  return <TellerContext.Provider value={value}>{children}</TellerContext.Provider>
}
