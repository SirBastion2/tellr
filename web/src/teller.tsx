import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiSend } from './api'
import { ensureConnection } from './connection'
import { openingRequest } from '../mock/replay'
import { clientTimeZone, formatOffsetIso } from './ui/localTime'
import type { ActivityFeed, AnswerPost, ChipSource, ErrorResponse, HandoffProjection, Library, OutcomeId, SessionState } from './types'
import { validateActivity, validateError, validateHandoff, validateLibrary, validateSessionState, type SchemaIssue } from './validate'

export type RecordedDecision = {
  outcome: OutcomeId
  actor: string
}

type TellerValue = {
  library: Library | null
  session: SessionState | null
  closed: boolean
  recorded: RecordedDecision | null
  issues: SchemaIssue[]
  httpStatus: number | null
  error: ErrorResponse | null
  postedChipIds: string[]
  activity: ActivityFeed | null
  handoff: HandoffProjection | null
  startCase: (caseId: string) => Promise<SessionState | null>
  startLive: () => Promise<SessionState | null>
  postContext: (chips: string[], source?: ChipSource) => Promise<void>
  postAnswer: (answer: AnswerPost) => Promise<void>
  postOutcome: (outcome: OutcomeId, actor: string) => Promise<boolean>
  loadHandoff: () => Promise<void>
  undo: () => Promise<void>
  dismissChip: (chipId: string) => Promise<void>
}

type ClientWrite = { kind: 'context'; chips: string[]; source?: ChipSource } | { kind: 'answer'; answer: AnswerPost }

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
  const [activity, setActivity] = useState<ActivityFeed | null>(null)
  const [closed, setClosed] = useState(false)
  const [recorded, setRecorded] = useState<RecordedDecision | null>(null)
  const sessionRef = useRef<SessionState | null>(null)
  const writesRef = useRef<ClientWrite[]>([])
  const activityToken = useRef(0)
  const generation = useRef(0)
  const closedRef = useRef(false)

  const markClosed = useCallback((next: boolean) => {
    closedRef.current = next
    setClosed(next)
  }, [])

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
        await ensureConnection()
        if (cancelled) {
          return
        }
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

  const loadActivity = useCallback(async (sessionId: string) => {
    const token = activityToken.current + 1
    activityToken.current = token
    setActivity(null)
    try {
      const result = await apiSend('GET', `/sessions/${sessionId}/activity`)
      if (activityToken.current !== token || sessionRef.current?.session_id !== sessionId) {
        return
      }
      if (result.status !== 200 || validateActivity(result.body).length > 0) {
        setActivity(null)
        return
      }
      setActivity(result.body as ActivityFeed)
    } catch {
      if (activityToken.current === token) {
        setActivity(null)
      }
    }
  }, [])

  const takeSession = useCallback((result: { status: number; body: unknown }, gen: number): SessionState | null => {
    if (gen !== generation.current) {
      return null
    }
    setHttpStatus(result.status)
    if (result.status === 409) {
      const found = validateError(result.body)
      setIssues(found)
      const parsed = found.length === 0 ? (result.body as ErrorResponse) : null
      setError(parsed)
      if (parsed?.error.code === 'session_closed') {
        markClosed(true)
      }
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
    void loadActivity(next.session_id)
    return next
  }, [loadActivity, markClosed, rememberSession])

  function openGeneration(): number {
    generation.current += 1
    setError(null)
    rememberWrites([])
    setHandoff(null)
    setActivity(null)
    return generation.current
  }

  function acceptOpened(next: SessionState | null): SessionState | null {
    if (next) {
      markClosed(false)
      setRecorded(null)
    }
    return next
  }

  async function startCase(caseId: string): Promise<SessionState | null> {
    const request = openingRequest(caseId)
    if (request === null || typeof request !== 'object' || Array.isArray(request)) {
      setHttpStatus(404)
      return null
    }
    const gen = openGeneration()
    const opened = request as Record<string, unknown>
    const mode = opened.mode === 'live' || opened.mode === 'practice' ? opened.mode : 'practice'
    const amountBand = typeof opened.amount_band === 'string' && opened.amount_band.length > 0 ? opened.amount_band : '5000_9999'
    const body = {
      mode,
      amount_band: amountBand,
      scenario_id: caseId,
      opened_at: formatOffsetIso(new Date()),
      timezone: clientTimeZone(),
    }
    const result = await apiSend('POST', `/sessions?case=${encodeURIComponent(caseId)}`, body)
    return acceptOpened(takeSession(result, gen))
  }

  async function startLive(): Promise<SessionState | null> {
    const sample = openingRequest('T1')
    const amountBand =
      sample && typeof sample === 'object' && typeof (sample as { amount_band?: unknown }).amount_band === 'string'
        ? (sample as { amount_band: string }).amount_band
        : '5000_9999'
    const gen = openGeneration()
    const result = await apiSend('POST', '/sessions', {
      mode: 'live',
      amount_band: amountBand,
      opened_at: formatOffsetIso(new Date()),
      timezone: clientTimeZone(),
    })
    return acceptOpened(takeSession(result, gen))
  }

  async function postContext(chips: string[], source?: ChipSource): Promise<void> {
    const current = sessionRef.current
    if (!current || closedRef.current) {
      return
    }
    const gen = generation.current
    const body: { chips: string[]; source?: ChipSource } = { chips }
    if (source) {
      body.source = source
    }
    const result = await apiSend('POST', `/sessions/${current.session_id}/context`, body)
    const next = takeSession(result, gen)
    if (next) {
      rememberWrites([...writesRef.current, { kind: 'context', chips, source }])
    }
  }

  async function postAnswer(answer: AnswerPost): Promise<void> {
    const current = sessionRef.current
    if (!current || closedRef.current) {
      return
    }
    const gen = generation.current
    const body: AnswerPost = {
      question_id: answer.question_id,
      chip: answer.chip,
    }
    if (answer.purpose !== undefined) {
      body.purpose = answer.purpose
    }
    const result = await apiSend('POST', `/sessions/${current.session_id}/answers`, body)
    const next = takeSession(result, gen)
    if (next) {
      rememberWrites([...writesRef.current, { kind: 'answer', answer }])
    }
  }

  const postOutcome = useCallback(async (outcome: OutcomeId, actor: string): Promise<boolean> => {
    const current = sessionRef.current
    const trimmed = actor.trim()
    if (!current || trimmed.length === 0 || closedRef.current) {
      return false
    }
    const gen = generation.current
    const result = await apiSend('POST', `/sessions/${current.session_id}/outcome`, {
      outcome,
      actor: trimmed,
    })
    if (gen !== generation.current) {
      return false
    }
    const recordedNow = result.status === 200
    if (recordedNow) {
      markClosed(true)
      setRecorded({ outcome, actor: trimmed })
    }
    takeSession(result, gen)
    return recordedNow
  }, [markClosed, takeSession])

  const loadHandoff = useCallback(async (): Promise<void> => {
    const current = sessionRef.current
    if (!current) {
      return
    }
    const gen = generation.current
    const result = await apiSend('GET', `/sessions/${current.session_id}/handoff`)
    if (gen !== generation.current) {
      return
    }
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
    if (!current || closedRef.current) {
      return
    }
    const gen = generation.current
    const result = await apiSend('POST', `/sessions/${current.session_id}/undo`)
    const next = takeSession(result, gen)
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
      await postContext(kept, target.source)
    }
    for (const write of tail) {
      if (write.kind === 'context') {
        const chips = write.chips.filter((chip) => chip !== chipId)
        if (chips.length > 0) {
          await postContext(chips, write.source)
        }
      } else {
        await postAnswer(write.answer)
      }
    }
  }

  const value: TellerValue = {
    library,
    session,
    closed,
    recorded,
    issues,
    httpStatus,
    error,
    postedChipIds: writes.flatMap((write) => (write.kind === 'context' ? write.chips : [])),
    activity,
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
