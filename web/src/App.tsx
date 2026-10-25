import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { advanceSimulatedMs, timelineElapsedMs } from './demo/clock'
import { CUSTOMERS, customerById } from './demo/customers'
import type { ConfirmKind, DemoSpeed, DemoView } from './demo/types'
import { connectionLabel, connectionState, subscribeConnection, type ConnectionState } from './connection'
import { friendlyApiError } from './errors'
import { notesOnlyChip, rememberChipOrder, sourceForChip } from './feed'
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
import { NotFoundScreen } from './screens/NotFoundScreen'
import { OutcomeScreen } from './screens/OutcomeScreen'
import { TellerProvider, useTeller, type RecordedDecision } from './teller'
import { controlStyle, headerControlStyle, secondaryStyle } from './theme/controls'
import { DENSITY } from './theme/tokens'
import { type ColorChoice, useSchemeCompact } from './theme/scheme'
import { ThemeProvider, useColorScheme, useThemeActions } from './theme/ThemeProvider'
import { ThemeRoot } from './theme/ThemeRoot'
import { ThemeWordmark } from './theme/Wordmark'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { LocalClock } from './ui/LocalClock'
import { useDemoShortcuts } from './ui/DemoShortcuts'
import { LEVEL_WORD } from './ui/LevelIcon'
import { ShortcutHelp } from './ui/ShortcutHelp'
import type { ActivityRow, AnswerPost, ChipSource, ErrorResponse, HandoffProjection, Library, OutcomeId, SessionState } from './types'
import type { SchemaIssue } from './validate'
import { suggestedAction } from './workstation/CopilotStrip'

type SignalAction =
  | { kind: 'confirm'; chipId: string }
  | { kind: 'dismiss'; chipId: string; source: ChipSource }
  | { kind: 'restore'; chipId: string; source: ChipSource }

const tap: CSSProperties = {
  ...controlStyle,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
}

const headerTap: CSSProperties = {
  ...headerControlStyle,
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
              ...headerTap,
              borderWidth: 0,
              borderRadius: 0,
              height: '100%',
              minHeight: '100%',
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
    <label className="tc-scheme-menu" style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span className="tc-sr">Color scheme</span>
      <select
        data-testid="scheme-menu"
        aria-label="Color scheme"
        value={choice}
        style={{ ...headerTap }}
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

const EMPTY_IDS: readonly string[] = []

export function AppShell({
  library,
  session,
  issues,
  postedChipIds = EMPTY_IDS,
  dismissed = EMPTY_IDS,
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
  const headerRef = useRef<HTMLElement | null>(null)
  const schemeCompact = useSchemeCompact(headerRef)
  const workstation = location.pathname === '/' && Boolean(demo)
  const sessionId = session?.session_id ?? null
  const chipOrderSession = useRef<string | null>(sessionId)
  const [chipOrder, setChipOrder] = useState<string[]>([])
  useEffect(() => {
    const incoming = [...postedChipIds, ...(session?.context_chips ?? []).map((chip) => chip.id), ...dismissed]
    setChipOrder((prev) => {
      const next =
        chipOrderSession.current === sessionId ? rememberChipOrder(prev, incoming) : rememberChipOrder([], incoming)
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev
      }
      return next
    })
    chipOrderSession.current = sessionId
  }, [postedChipIds, session?.context_chips, dismissed, sessionId])
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
  const visitIdle = Boolean(demo && demo.index === 0 && !demo.playing)
  const levelWord = session ? LEVEL_WORD[session.risk.level] : ''
  const action = session ? suggestedAction(session) : ''
  const announcement = session && !visitIdle
    ? `Level ${levelWord}. ${action ? `Suggested action: ${action}` : 'No suggested action.'}`
    : ''

  return (
    <ThemeRoot>
      <div className="tc-shell" data-testid="app-shell" style={{ boxSizing: 'border-box', color: 'var(--tc-text, #1c1917)' }}>
        <a href="#main" className="tc-sr" style={{ minHeight: '48px', minWidth: '48px' }}>
          Skip to content
        </a>
        <header
          ref={headerRef}
          className="tc-header"
          data-testid="app-header"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: 'var(--tc-space-header, 8px)',
            minHeight: DENSITY.headerMinHeight,
            overflow: 'visible',
            minWidth: 0,
            maxWidth: '100%',
            background: 'var(--tc-glass-fallback)',
            borderRadius: 'var(--tc-radius-card, 16px)',
            padding: 'var(--tc-space-2)',
          }}
        >
          <div className="tc-header-brand" data-testid="header-brand">
            <ThemeWordmark />
            <h1 className="tc-header-title" title="Teller Copilot">
              Teller Copilot
            </h1>
          </div>
          <div className="tc-header-status" data-testid="header-status">
            <LiveBadge mode={session?.mode ?? null} simulationTitle={simulationTitle} />
            <ConnectionBadge />
            <LocalClock />
          </div>
          <nav
            aria-label="Screens"
            data-testid="app-nav"
            className="tc-header-nav"
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
              minWidth: 'min-content',
              flex: '1 1 auto',
              marginInline: 'auto',
              minHeight: 'var(--tc-header-control-h, 48px)',
              gap: 'var(--tc-space-header, 8px)',
            }}
          >
            {routes.map((route) => {
              const path = routePath(route, session)
              const label = route.label
              const tabFill: CSSProperties = {
                ...headerTap,
                flex: '0 0 auto',
                justifyContent: 'center',
                textAlign: 'center',
                minWidth: 'min-content',
                overflow: 'visible',
                borderColor: 'transparent',
                whiteSpace: 'nowrap',
              }
              if (!path) {
                return (
                  <span
                    key={route.id}
                    data-testid={`nav-hint-${route.id}`}
                    className="tc-nav-tab tc-nav-hint"
                    aria-disabled="true"
                    title="Available after a visit starts"
                    style={{
                      ...tabFill,
                      color: 'var(--tc-muted)',
                      borderBottom: '3px solid transparent',
                      fontWeight: 'var(--tc-heading-weight)',
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
                  className="tc-nav-tab"
                  aria-current={current ? 'page' : undefined}
                  style={{
                    ...tabFill,
                    textDecoration: 'none',
                    backgroundColor: current ? 'var(--tc-input)' : 'transparent',
                    borderBottom: current ? '3px solid var(--tc-accent)' : '3px solid transparent',
                    fontWeight: current ? 'var(--tc-strong-weight)' : 'var(--tc-heading-weight)',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="tc-header-tools" data-testid="header-tools">
            {schemeCompact ? <SchemeMenu /> : <SchemeToggle />}
            <button
              type="button"
              className="tc-btn"
              data-variant="secondary"
              data-testid="shortcut-help-button"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              style={{ ...headerTap, ...secondaryStyle, flex: '0 0 auto' }}
              onClick={() => onHelp?.(!helpOpen)}
            >
              ?
            </button>
          </div>
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
          {session && !workstation && !closed && !location.pathname.endsWith('/outcome') && !location.pathname.endsWith('/handoff') && location.pathname !== '/customer' ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--tc-space-2)' }}>
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
                  dismissed={dismissed}
                  chipOrder={chipOrder}
                  activity={activity}
                  demo={demo}
                  closed={closed}
                  onUndo={onUndo}
                />
              }
            />
            <Route path="/customer" element={<CustomerFileScreen demo={demo} />} />
            <Route path="/sessions" element={<HistoryScreen />} />
            <Route
              path="/sessions/:id/context"
              element={
                session ? (
                  <ContextScreen
                    library={library}
                    session={session}
                    postedChipIds={postedChipIds}
                    onPost={onPostContext}
                  />
                ) : (
                  <NotFoundScreen kind="session" />
                )
              }
            />
            <Route
              path="/sessions/:id/outcome"
              element={
                session ? (
                  <OutcomeScreen
                    session={session}
                    closed={closed}
                    recorded={recorded}
                    onSubmit={onSubmitOutcome}
                    onStartNew={onStartNew}
                  />
                ) : (
                  <NotFoundScreen kind="session" />
                )
              }
            />
            <Route
              path="/sessions/:id/handoff"
              element={
                session ? (
                  <HandoffScreen
                    library={library}
                    projection={handoff}
                    session={session}
                    dismissed={dismissed}
                    confirmed={demo?.confirmed ?? []}
                    postedChipIds={postedChipIds}
                  />
                ) : (
                  <NotFoundScreen kind="session" />
                )
              }
            />
            <Route
              path="/sessions/:id"
              element={
                session ? (
                  <InterviewScreen library={library} session={session} onAnswer={onAnswer} />
                ) : (
                  <NotFoundScreen kind="session" />
                )
              }
            />
            <Route path="/health" element={<HealthScreen />} />
            <Route path="/settings" element={<Navigate to="/health" replace />} />
            <Route path="*" element={<NotFoundScreen />} />
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
  const { cycleTheme } = useThemeActions()
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
  const [actions, setActions] = useState<SignalAction[]>([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const indexRef = useRef(0)
  const customerRef = useRef(customerId)
  const speedRef = useRef(speed)
  const playingRef = useRef(playing)
  const presenterRef = useRef(presenter.on)
  const elapsedRef = useRef(0)
  const autoPlayRef = useRef(false)
  const clockOnRef = useRef(false)
  const lock = useRef(false)
  const tellerRef = useRef(teller)
  const actionsRef = useRef<SignalAction[]>([])
  const dismissedSource = useRef(new Map<string, ChipSource>())

  useEffect(() => {
    indexRef.current = index
    customerRef.current = customerId
    speedRef.current = speed
    playingRef.current = playing
    presenterRef.current = presenter.on
    tellerRef.current = teller
    actionsRef.current = actions
  }, [actions, customerId, index, playing, presenter.on, speed, teller])

  useEffect(() => {
    // One interval for the shell. Index, speed, and route changes do not
    // restart it. It advances while clockOnRef is set and stops on pause.
    // The cap is the full script, not the beat currently posting.
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const delta = now - last
      last = now
      if (!clockOnRef.current || delta <= 0) {
        return
      }
      const customer = customerById(customerRef.current)
      const events = customer?.events ?? []
      const cap = timelineElapsedMs(events, events.length)
      const next = advanceSimulatedMs(elapsedRef.current, delta, speedRef.current, cap)
      if (next === elapsedRef.current) {
        return
      }
      elapsedRef.current = next
      setElapsedMs(next)
    }, 250)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!sessionId || !location.pathname.endsWith('/handoff')) {
      return
    }
    void loadHandoff()
  }, [location.pathname, sessionId, loadHandoff])

  const runCurrent = useCallback(async () => {
    if (lock.current || tellerRef.current.closed) {
      if (tellerRef.current.closed) {
        autoPlayRef.current = false
        playingRef.current = false
        clockOnRef.current = false
        setPlaying(false)
      }
      return
    }
    const customer = customerById(customerRef.current)
    const event = customer?.events[indexRef.current]
    if (!customer || !event) {
      autoPlayRef.current = false
      playingRef.current = false
      clockOnRef.current = false
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
        autoPlayRef.current = false
        playingRef.current = false
        clockOnRef.current = false
        setPlaying(false)
        return
      }
      const next = indexRef.current + 1
      const boundary = timelineElapsedMs(customer.events, next)
      if (elapsedRef.current < boundary) {
        elapsedRef.current = boundary
        setElapsedMs(elapsedRef.current)
      }
      setIndex(next)
      if (!autoPlayRef.current) {
        clockOnRef.current = false
      }
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
      autoPlayRef.current = false
      playingRef.current = false
      clockOnRef.current = false
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
      autoPlayRef.current = false
      playingRef.current = false
      clockOnRef.current = false
      setPlaying(false)
      setIndex(0)
      setConfirmed([])
      setDismissed([])
      setActions([])
      dismissedSource.current.clear()
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
        autoPlayRef.current = false
        playingRef.current = false
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
      autoPlayRef.current = false
      playingRef.current = false
      clockOnRef.current = false
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

  useDemoShortcuts({
    onEscape: () => {
      setHelpOpen(false)
      setConfirm(null)
    },
    onHelp: () => {
      setHelpOpen((open) => !open)
    },
    onPlay: () => {
      const next = !autoPlayRef.current
      autoPlayRef.current = next
      playingRef.current = next
      clockOnRef.current = next
      setPlaying(next)
    },
    onStep: () => {
      autoPlayRef.current = false
      playingRef.current = false
      clockOnRef.current = true
      setPlaying(false)
      void runCurrent()
    },
    onRestart: () => {
      autoPlayRef.current = false
      playingRef.current = false
      setPlaying(false)
      setConfirm({ kind: 'restart' })
    },
    onEscalate: () => {
      if (tellerRef.current.session) {
        setConfirm({ kind: 'escalate' })
      }
    },
    onConfirm: () => {
      const chips = tellerRef.current.postedChipIds.filter(
        (id) => !notesOnlyChip(tellerRef.current.library, id),
      )
      const chipId = chips[chips.length - 1]
      if (!chipId) {
        return
      }
      setConfirmed((current) => (current.includes(chipId) ? current : [...current, chipId]))
      setActions((current) => [...current, { kind: 'confirm', chipId }])
    },
    onDismiss: () => {
      const chips = tellerRef.current.postedChipIds.filter(
        (id) => !notesOnlyChip(tellerRef.current.library, id),
      )
      const chipId = chips[chips.length - 1]
      if (!chipId) {
        return
      }
      const source = sourceForChip(tellerRef.current.session?.context_chips, chipId) ?? 'observed'
      dismissedSource.current.set(chipId, source)
      setConfirmed((current) => current.filter((id) => id !== chipId))
      setDismissed((current) => (current.includes(chipId) ? current : [...current, chipId]))
      setActions((current) => [...current, { kind: 'dismiss', chipId, source }])
      setPending(true)
      void tellerRef.current.dismissChip(chipId).finally(() => setPending(false))
    },
    onPrevCustomer: () => {
      const at = CUSTOMERS.findIndex((item) => item.id === customerRef.current)
      const previous = CUSTOMERS[(at - 1 + CUSTOMERS.length) % CUSTOMERS.length]
      if (previous) {
        requestSwitch(previous.id)
      }
    },
    onNextCustomer: () => {
      const at = CUSTOMERS.findIndex((item) => item.id === customerRef.current)
      const next = CUSTOMERS[(at + 1) % CUSTOMERS.length]
      if (next) {
        requestSwitch(next.id)
      }
    },
    onTheme: () => {
      cycleTheme()
    },
  })

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
    onPlay: () => {
      autoPlayRef.current = true
      playingRef.current = true
      clockOnRef.current = true
      setPlaying(true)
    },
    onPause: () => {
      autoPlayRef.current = false
      playingRef.current = false
      clockOnRef.current = false
      setPlaying(false)
    },
    onStep: () => {
      autoPlayRef.current = false
      playingRef.current = false
      clockOnRef.current = true
      setPlaying(false)
      void runCurrent()
    },
    onRestart: () => {
      autoPlayRef.current = false
      playingRef.current = false
      setPlaying(false)
      setConfirm({ kind: 'restart' })
    },
    onSpeed: setSpeed,
    onToggleCase: () => setShowCase((value) => !value),
    onConfirmSignal: (chipId) => {
      setConfirmed((current) => (current.includes(chipId) ? current : [...current, chipId]))
      setActions((current) => [...current, { kind: 'confirm', chipId }])
    },
    onDismissSignal: (chipId) => {
      const source = sourceForChip(teller.session?.context_chips, chipId) ?? 'observed'
      dismissedSource.current.set(chipId, source)
      setConfirmed((current) => current.filter((id) => id !== chipId))
      setDismissed((current) => (current.includes(chipId) ? current : [...current, chipId]))
      setActions((current) => [...current, { kind: 'dismiss', chipId, source }])
      setPending(true)
      void teller.dismissChip(chipId).finally(() => setPending(false))
    },
    onRestoreSignal: (chipId) => {
      const source = dismissedSource.current.get(chipId) ?? sourceForChip(teller.session?.context_chips, chipId) ?? 'observed'
      setDismissed((current) => current.filter((id) => id !== chipId))
      setActions((current) => [...current, { kind: 'restore', chipId, source }])
      setPending(true)
      void teller.postContext([chipId], source).finally(() => setPending(false))
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
        const last = actionsRef.current.at(-1)
        if (last?.kind === 'confirm') {
          setConfirmed((current) => current.filter((id) => id !== last.chipId))
          setActions((current) => current.slice(0, -1))
          return
        }
        if (last?.kind === 'dismiss') {
          setDismissed((current) => current.filter((id) => id !== last.chipId))
          setActions((current) => current.slice(0, -1))
          setPending(true)
          void teller.postContext([last.chipId], last.source).finally(() => setPending(false))
          return
        }
        if (last?.kind === 'restore') {
          dismissedSource.current.set(last.chipId, last.source)
          setDismissed((current) => (current.includes(last.chipId) ? current : [...current, last.chipId]))
          setActions((current) => current.slice(0, -1))
          setPending(true)
          void teller.dismissChip(last.chipId).finally(() => setPending(false))
          return
        }
        setPending(true)
        void teller.undo().finally(() => setPending(false))
      }}
      handoff={teller.handoff}
      onSubmitOutcome={(body) => {
        autoPlayRef.current = false
        playingRef.current = false
        clockOnRef.current = false
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
