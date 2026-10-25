import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { advanceSimulatedMs, simulatedCapMs, timelineElapsedMs } from './demo/clock'
import { CUSTOMERS, customerById } from './demo/customers'
import type { ConfirmKind, DemoSpeed, DemoView } from './demo/types'
import { connectionLabel, connectionState, subscribeConnection, type ConnectionState } from './connection'
import { friendlyApiError } from './errors'
import { LiveBadge } from './LiveBadge'
import { PRESENTER_HIDDEN_ROUTES, PresenterProvider, usePresenter } from './presenter'
import { SchemaBanner } from './SchemaBanner'
import { APP_ROUTES } from './routes'
import { ContextScreen } from './screens/ContextScreen'
import { CustomerFileScreen } from './screens/CustomerFileScreen'
import { HandoffScreen } from './screens/HandoffScreen'
import { HealthScreen } from './screens/HealthScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import { OutcomeScreen } from './screens/OutcomeScreen'
import { TellerProvider, useTeller, type RecordedDecision } from './teller'
import { controlStyle, secondaryStyle } from './theme/controls'
import { type ColorChoice } from './theme/scheme'
import { ThemeProvider, useColorScheme } from './theme/ThemeProvider'
import { ThemeRoot } from './theme/ThemeRoot'
import { ThemeWordmark } from './theme/Wordmark'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { LEVEL_WORD } from './ui/LevelIcon'
import { ShortcutHelp } from './ui/ShortcutHelp'
import type { ActivityRow, AnswerPost, ErrorResponse, HandoffProjection, Library, OutcomeId, SessionState } from './types'
import type { SchemaIssue } from './validate'
import { suggestedAction } from './workstation/CopilotStrip'

const tap: CSSProperties = {
  ...controlStyle,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
}

const SCHEME_OPTIONS: readonly { id: ColorChoice; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
]

function SchemeToggle() {
  const { choice, setChoice } = useColorScheme()
  return (
    <div className="tc-segment tc-scheme-full" role="group" aria-label="Color scheme" data-testid="color-scheme">
      {SCHEME_OPTIONS.map((option) => {
        const selected = choice === option.id
        return (
          <button
            key={option.id}
            type="button"
            data-testid={`scheme-${option.id}`}
            aria-pressed={selected}
            style={{
              ...tap,
              borderWidth: 0,
              borderRadius: 0,
              backgroundColor: selected ? 'var(--tc-button)' : 'var(--tc-secondary-bg)',
              color: selected ? 'var(--tc-button-text)' : 'var(--tc-secondary-fg)',
            }}
            onClick={() => setChoice(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function SchemeMenu() {
  const { choice, setChoice } = useColorScheme()
  return (
    <label className="tc-scheme-menu">
      <span className="tc-sr">Color scheme</span>
      <select
        data-testid="scheme-menu"
        aria-label="Color scheme"
        value={choice}
        style={{ ...tap, height: 40, minHeight: 40 }}
        onChange={(event) => setChoice(event.target.value as ColorChoice)}
      >
        {SCHEME_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ConnectionBadge() {
  const [link, setLink] = useState<ConnectionState>(connectionState)
  useEffect(() => subscribeConnection(setLink), [])
  return (
    <p data-testid="connection-status" data-kind={link.kind} className="tc-connection" title={connectionLabel(link.kind)}>
      {connectionLabel(link.kind)}
    </p>
  )
}

function routePath(route: (typeof APP_ROUTES)[number], session: SessionState | null): string | null {
  if (route.path.includes(':id')) {
    if (!session) {
      return null
    }
    return route.path.replace(':id', session.session_id)
  }
  return route.path
}

export function AppShell({
  library,
  session,
  issues,
  postedChipIds = [],
  dismissed = [],
  activity = null,
  onPostContext,
  onAnswer,
  onUndo,
  onSubmitOutcome,
  onStartNew,
  closed = false,
  recorded = null,
  handoff = null,
  httpStatus = null,
  error = null,
  demo = null,
  helpOpen = false,
  confirm = null,
  onHelp,
  onConfirmCancel,
  onConfirmAccept,
}: {
  library: Library | null
  session: SessionState | null
  issues: readonly SchemaIssue[]
  postedChipIds?: readonly string[]
  dismissed?: readonly string[]
  activity?: readonly ActivityRow[] | null
  onPostContext?: (chips: string[]) => void
  onAnswer?: (answer: AnswerPost) => void
  onUndo?: () => void
  onSubmitOutcome?: (body: { outcome: OutcomeId; actor: string }) => void
  onStartNew?: () => void
  closed?: boolean
  recorded?: RecordedDecision | null
  handoff?: HandoffProjection | null
  httpStatus?: number | null
  error?: ErrorResponse | null
  demo?: DemoView | null
  helpOpen?: boolean
  confirm?: ConfirmKind
  onHelp?: (open: boolean) => void
  onConfirmCancel?: () => void
  onConfirmAccept?: () => void
}) {
  const location = useLocation()
  const presenter = usePresenter()
  const workstation = location.pathname === '/' && Boolean(demo)
  const routes = presenter.on ? APP_ROUTES.filter((route) => !PRESENTER_HIDDEN_ROUTES.has(route.id)) : APP_ROUTES
  const simulationTitle = demo ? (customerById(demo.customerId)?.title ?? null) : null
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }
      onHelp?.(false)
      onConfirmCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onConfirmCancel, onHelp])
  const levelWord = session ? LEVEL_WORD[session.risk.level] : ''
  const action = session ? suggestedAction(session) : ''
  const announcement = session
    ? `Level ${levelWord}. ${action ? `Suggested action: ${action}` : 'No suggested action.'}`
    : ''

  return (
    <ThemeRoot>
      <div style={{ boxSizing: 'border-box', color: 'var(--tc-text, #1c1917)' }}>
        <a href="#main" className="tc-sr" style={{ minHeight: '48px', minWidth: '48px' }}>
          Skip to content
        </a>
        <header
          className="tc-header"
          data-testid="app-header"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: '8px',
            minHeight: '48px',
            overflow: 'hidden',
            minWidth: 0,
            maxWidth: '100%',
            background: 'var(--tc-glass-fallback)',
            borderRadius: 'var(--tc-radius-card)',
            padding: '8px',
          }}
        >
          <ThemeWordmark />
          <h1 className="tc-header-title" title="Teller Copilot">
            Teller Copilot
          </h1>
          <LiveBadge mode={session?.mode ?? null} simulationTitle={simulationTitle} />
          <ConnectionBadge />
          <nav
            aria-label="Screens"
            data-testid="app-nav"
            className="tc-header-nav"
            style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', minWidth: 0, flex: '1 1 auto', minHeight: 48, gap: 8 }}
          >
            {routes.map((route) => {
              const path = routePath(route, session)
              const label = route.label
              if (!path) {
                return (
                  <span
                    key={route.id}
                    data-testid={`nav-hint-${route.id}`}
                    className="tc-nav-hint"
                    aria-disabled="true"
                    title="Available after a visit starts"
                    style={{
                      ...tap,
                      flex: '0 0 auto',
                      color: 'var(--tc-muted)',
                      borderColor: 'transparent',
                      borderBottom: '3px solid transparent',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      cursor: 'default',
                    }}
                  >
                    {label}
                  </span>
                )
              }
              const current = location.pathname === path
              return (
                <Link
                  key={route.id}
                  to={path}
                  aria-current={current ? 'page' : undefined}
                  style={{
                    ...tap,
                    flex: '0 0 auto',
                    textDecoration: 'none',
                    backgroundColor: current ? 'var(--tc-input)' : 'transparent',
                    borderColor: 'transparent',
                    borderBottom: current ? '3px solid var(--tc-accent)' : '3px solid transparent',
                    fontWeight: current ? 700 : 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
          <SchemeToggle />
          <SchemeMenu />
          <button
            type="button"
            className="tc-btn"
            data-variant="secondary"
            data-testid="shortcut-help-button"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            style={{ ...tap, ...secondaryStyle, flex: '0 0 auto' }}
            onClick={() => onHelp?.(!helpOpen)}
          >
            ?
          </button>
        </header>
        <p className="tc-sr" aria-live="polite" data-testid="live-region">
          {announcement}
        </p>
        {import.meta.env.DEV ? <SchemaBanner issues={issues} /> : null}
        {(() => {
          const notice = friendlyApiError(error ?? null, httpStatus ?? null)
          const closedNotice = closed && error?.error.code === 'session_closed'
          if (!notice || closedNotice) {
            return null
          }
          return (
            <p data-testid="api-error" role="alert">
              {notice}
            </p>
          )
        })()}
        {session && closed && !location.pathname.endsWith('/outcome') ? (
          <div className="tc-closed" data-testid="session-closed" role="status">
            <p style={{ margin: 0 }}>This visit is closed.</p>
            <button
              type="button"
              className="tc-btn"
              data-variant="primary"
              data-testid="start-new-customer"
              style={{ ...tap, flex: '0 0 auto' }}
              onClick={() => onStartNew?.()}
            >
              Start new customer
            </button>
          </div>
        ) : null}
        <main id="main">
          {session && !workstation && !closed ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                type="button"
                className="tc-btn"
                data-variant="secondary"
                data-testid="undo"
                title="Undo the last signal"
                style={{ ...tap, ...secondaryStyle }}
                onClick={() => onUndo?.()}
              >
                Undo
              </button>
            </div>
          ) : null}
          <Routes>
            <Route
              path="/"
              element={
                <HomeScreen
                  library={library}
                  session={session}
                  postedChipIds={postedChipIds}
                  activity={activity}
                  demo={demo}
                  closed={closed}
                  onUndo={onUndo}
                />
              }
            />
            <Route
              path="/customer"
              element={
                <CustomerFileScreen
                  library={library}
                  postedChipIds={postedChipIds}
                  dismissed={dismissed}
                  contextChips={session?.context_chips}
                  activity={activity}
                  demo={demo}
                />
              }
            />
            <Route path="/sessions" element={<HistoryScreen />} />
            <Route
              path="/sessions/:id/context"
              element={
                <ContextScreen
                  library={library}
                  session={session}
                  postedChipIds={postedChipIds}
                  onPost={onPostContext}
                />
              }
            />
            <Route
              path="/sessions/:id/outcome"
              element={
                <OutcomeScreen
                  session={session}
                  closed={closed}
                  recorded={recorded}
                  onSubmit={onSubmitOutcome}
                  onStartNew={onStartNew}
                />
              }
            />
            <Route
              path="/sessions/:id/handoff"
              element={<HandoffScreen library={library} projection={handoff} />}
            />
            <Route
              path="/sessions/:id"
              element={<InterviewScreen library={library} session={session} onAnswer={onAnswer} />}
            />
            <Route path="/health" element={<HealthScreen />} />
            <Route path="/settings" element={<Navigate to="/health" replace />} />
          </Routes>
        </main>
        {helpOpen ? <ShortcutHelp onClose={() => onHelp?.(false)} /> : null}
        {confirm ? (
          <ConfirmDialog
            title={
              confirm.kind === 'escalate'
                ? 'Escalate to the supervisor?'
                : confirm.kind === 'restart'
                  ? 'Restart the simulation?'
                  : 'Switch customer?'
            }
            body={
              confirm.kind === 'escalate'
                ? 'This records an escalate outcome for the teller and opens the handoff.'
                : 'This resets the live session and the simulated timeline.'
            }
            confirmLabel={
              confirm.kind === 'escalate' ? 'Escalate' : confirm.kind === 'restart' ? 'Restart' : 'Reset session'
            }
            pending={demo?.pending ?? false}
            onCancel={() => onConfirmCancel?.()}
            onConfirm={() => onConfirmAccept?.()}
          />
        ) : null}
      </div>
    </ThemeRoot>
  )
}

function ConnectedShell() {
  const teller = useTeller()
  const navigate = useNavigate()
  const location = useLocation()
  const presenter = usePresenter()
  const { loadHandoff } = teller
  const sessionId = teller.session?.session_id ?? null
  const [customerId, setCustomerId] = useState(CUSTOMERS[0]?.id ?? '')
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<DemoSpeed>(1)
  const [pending, setPending] = useState(false)
  const [showCase, setShowCase] = useState(false)
  const [confirmed, setConfirmed] = useState<string[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const indexRef = useRef(0)
  const customerRef = useRef(customerId)
  const speedRef = useRef(speed)
  const playingRef = useRef(playing)
  const presenterRef = useRef(presenter.on)
  const elapsedRef = useRef(0)
  const lock = useRef(false)
  const tellerRef = useRef(teller)

  useEffect(() => {
    indexRef.current = index
    customerRef.current = customerId
    speedRef.current = speed
    playingRef.current = playing
    presenterRef.current = presenter.on
    tellerRef.current = teller
  }, [customerId, index, playing, presenter.on, speed, teller])

  useEffect(() => {
    if (!playing) {
      return
    }
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const customer = customerById(customerRef.current)
      const events = customer?.events ?? []
      const cap = simulatedCapMs(events, indexRef.current)
      elapsedRef.current = advanceSimulatedMs(elapsedRef.current, now - last, speedRef.current, cap)
      last = now
      setElapsedMs(elapsedRef.current)
    }, 250)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => {
    if (!sessionId || !location.pathname.endsWith('/handoff')) {
      return
    }
    void loadHandoff()
  }, [location.pathname, sessionId, loadHandoff])

  const runCurrent = useCallback(async () => {
    if (lock.current || tellerRef.current.closed) {
      if (tellerRef.current.closed) {
        setPlaying(false)
      }
      return
    }
    const customer = customerById(customerRef.current)
    const event = customer?.events[indexRef.current]
    if (!customer || !event) {
      setPlaying(false)
      return
    }
    lock.current = true
    setPending(true)
    try {
      if (!tellerRef.current.session) {
        await tellerRef.current.startLive()
      }
      if (event.chips.length > 0) {
        await tellerRef.current.postContext(event.chips, 'observed')
      }
      if (tellerRef.current.closed) {
        setPlaying(false)
        return
      }
      const next = indexRef.current + 1
      elapsedRef.current = timelineElapsedMs(customer.events, next)
      setElapsedMs(elapsedRef.current)
      setIndex(next)
    } finally {
      lock.current = false
      setPending(false)
    }
  }, [])

  useEffect(() => {
    if (!playing) {
      return
    }
    const customer = customerById(customerRef.current)
    const event = customer?.events[indexRef.current]
    if (!event) {
      setPlaying(false)
      return
    }
    let reduced = false
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      // jsdom has no matchMedia; play on the scripted delay.
    }
    const delay = reduced ? 0 : Math.round(event.delayMs / speedRef.current)
    const timer = window.setTimeout(() => {
      void runCurrent()
    }, delay)
    return () => window.clearTimeout(timer)
  }, [playing, index, runCurrent])

  const resetSession = useCallback(
    async (nextCustomerId?: string) => {
      if (nextCustomerId) {
        setCustomerId(nextCustomerId)
      }
      setPlaying(false)
      setIndex(0)
      setConfirmed([])
      setDismissed([])
      elapsedRef.current = 0
      setElapsedMs(0)
      setPending(true)
      try {
        const next = await tellerRef.current.startLive()
        if (next) {
          navigate('/')
        }
      } finally {
        setPending(false)
      }
    },
    [navigate],
  )

  const requestSwitch = useCallback(
    (id: string) => {
      if (id === customerRef.current) {
        return
      }
      if (presenterRef.current) {
        void resetSession(id)
        return
      }
      if (indexRef.current > 0 || tellerRef.current.session) {
        setPlaying(false)
        setConfirm({ kind: 'switch', id })
        return
      }
      setCustomerId(id)
    },
    [resetSession],
  )

  const acceptConfirm = useCallback(() => {
    const current = confirm
    setConfirm(null)
    if (!current) {
      return
    }
    if (current.kind === 'escalate') {
      setPlaying(false)
      setPending(true)
      void (async () => {
        try {
          await tellerRef.current.postOutcome('escalate', 'teller')
          await tellerRef.current.loadHandoff()
          const id = tellerRef.current.session?.session_id
          if (id) {
            navigate(`/sessions/${id}/handoff`)
          }
        } finally {
          setPending(false)
        }
      })()
      return
    }
    if (current.kind === 'restart') {
      void resetSession()
      return
    }
    void resetSession(current.id)
  }, [confirm, navigate, resetSession])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      if (event.key === 'Escape') {
        setHelpOpen(false)
        setConfirm(null)
        return
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === '?') {
        event.preventDefault()
        setHelpOpen((open) => !open)
        return
      }
      if (key === 'p') {
        event.preventDefault()
        setPlaying((value) => !value)
        return
      }
      if (key === 'n') {
        event.preventDefault()
        setPlaying(false)
        void runCurrent()
        return
      }
      if (key === 'r') {
        event.preventDefault()
        setPlaying(false)
        setConfirm({ kind: 'restart' })
        return
      }
      if (key === 'e') {
        event.preventDefault()
        if (tellerRef.current.session) {
          setConfirm({ kind: 'escalate' })
        }
        return
      }
      if (key === 'c' || key === 'd') {
        const chips = tellerRef.current.postedChipIds
        const chipId = chips[chips.length - 1]
        if (!chipId) {
          return
        }
        event.preventDefault()
        if (key === 'c') {
          setConfirmed((current) => (current.includes(chipId) ? current : [...current, chipId]))
        } else {
          setDismissed((current) => (current.includes(chipId) ? current : [...current, chipId]))
          void tellerRef.current.dismissChip(chipId)
        }
        return
      }
      if (event.key === '[') {
        event.preventDefault()
        const at = CUSTOMERS.findIndex((item) => item.id === customerRef.current)
        const previous = CUSTOMERS[(at - 1 + CUSTOMERS.length) % CUSTOMERS.length]
        if (previous) {
          requestSwitch(previous.id)
        }
        return
      }
      if (event.key === ']') {
        event.preventDefault()
        const at = CUSTOMERS.findIndex((item) => item.id === customerRef.current)
        const next = CUSTOMERS[(at + 1) % CUSTOMERS.length]
        if (next) {
          requestSwitch(next.id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestSwitch, runCurrent])

  const demo: DemoView = {
    customers: CUSTOMERS,
    customerId,
    index,
    playing,
    speed,
    pending,
    showCase,
    confirmed,
    presenter: presenter.on,
    elapsedMs,
    onSelectCustomer: requestSwitch,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onStep: () => {
      setPlaying(false)
      void runCurrent()
    },
    onRestart: () => {
      setPlaying(false)
      setConfirm({ kind: 'restart' })
    },
    onSpeed: setSpeed,
    onToggleCase: () => setShowCase((value) => !value),
    onConfirmSignal: (chipId) => {
      setConfirmed((current) => (current.includes(chipId) ? current : [...current, chipId]))
    },
    onDismissSignal: (chipId) => {
      setDismissed((current) => (current.includes(chipId) ? current : [...current, chipId]))
      void teller.dismissChip(chipId)
    },
    onEscalate: () => {
      if (teller.session) {
        setConfirm({ kind: 'escalate' })
      }
    },
  }

  return (
    <AppShell
      library={teller.library}
      session={teller.session}
      issues={import.meta.env.DEV ? teller.issues : []}
      postedChipIds={teller.postedChipIds}
      dismissed={dismissed}
      activity={teller.activity?.rows ?? null}
      httpStatus={teller.httpStatus}
      error={teller.error}
      closed={teller.closed}
      recorded={teller.recorded}
      onStartNew={() => {
        void resetSession()
      }}
      demo={demo}
      helpOpen={helpOpen}
      confirm={confirm}
      onHelp={setHelpOpen}
      onConfirmCancel={() => setConfirm(null)}
      onConfirmAccept={acceptConfirm}
      onPostContext={(chips) => {
        void teller.postContext(chips, 'teller')
      }}
      onAnswer={(answer) => {
        void teller.postAnswer(answer)
      }}
      onUndo={() => {
        void teller.undo()
      }}
      handoff={teller.handoff}
      onSubmitOutcome={(body) => {
        setPlaying(false)
        void teller.postOutcome(body.outcome, body.actor)
      }}
    />
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <PresenterProvider>
          <TellerProvider>
            <ConnectedShell />
          </TellerProvider>
        </PresenterProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
