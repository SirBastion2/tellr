import { useEffect } from 'react'
import { Link, BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { listCases } from '../mock/replay'
import { LiveBadge } from './LiveBadge'
import { SchemaBanner } from './SchemaBanner'
import { APP_ROUTES } from './routes'
import { ContextScreen } from './screens/ContextScreen'
import { HandoffScreen } from './screens/HandoffScreen'
import { HealthScreen } from './screens/HealthScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import { OutcomeScreen } from './screens/OutcomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TellerProvider, useTeller } from './teller'
import type { AnswerPost, ErrorResponse, HandoffProjection, Library, OutcomeId, SessionState } from './types'
import type { SchemaIssue } from './validate'

const tap = {
  minHeight: '48px',
  minWidth: '48px',
  boxSizing: 'border-box' as const,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 12px',
  flex: '0 0 auto',
  color: '#1c1917',
  backgroundColor: 'transparent',
  border: '1px solid #1c1917',
}

export function AppShell({
  library,
  session,
  issues,
  scenarios,
  onStartPractice,
  onStartLive,
  postedChipIds = [],
  onPostContext,
  onAnswer,
  onUndo,
  onSubmitOutcome,
  handoff = null,
  httpStatus = null,
  error = null,
}: {
  library: Library | null
  session: SessionState | null
  issues: readonly SchemaIssue[]
  scenarios: readonly { id: string; label?: string }[]
  onStartPractice: (scenarioId: string) => void
  onStartLive: () => void
  postedChipIds?: readonly string[]
  onPostContext?: (chips: string[]) => void
  onAnswer?: (answer: AnswerPost) => void
  onUndo?: () => void
  onSubmitOutcome?: (body: { outcome: OutcomeId; actor: string }) => void
  handoff?: HandoffProjection | null
  httpStatus?: number | null
  error?: ErrorResponse | null
}) {
  const location = useLocation()
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#fafaf9',
        color: '#1c1917',
        padding: '8px 12px',
        boxSizing: 'border-box',
      }}
    >
      <header
        data-testid="app-header"
        style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '8px', minHeight: '48px' }}
      >
        <h1 style={{ margin: 0, fontSize: '20px', lineHeight: 1.2, flex: '0 0 auto' }}>Teller Copilot</h1>
        <LiveBadge mode={session?.mode ?? null} />
        <nav
          aria-label="Screens"
          data-testid="app-nav"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            gap: '8px',
            overflowX: 'auto',
            minHeight: '48px',
            flex: '1 1 auto',
          }}
        >
          {APP_ROUTES.map((route) => {
            if (route.path.includes(':id')) {
              if (!session) {
                return null
              }
              const path = route.path.replace(':id', session.session_id)
              return (
                <Link
                  key={route.id}
                  to={path}
                  aria-current={location.pathname === path ? 'page' : undefined}
                  style={{ ...tap, textDecoration: 'underline' }}
                >
                  {path}
                </Link>
              )
            }
            return (
              <Link
                key={route.id}
                to={route.path}
                aria-current={location.pathname === route.path ? 'page' : undefined}
                style={{ ...tap, textDecoration: 'underline' }}
              >
                {route.path}
              </Link>
            )
          })}
        </nav>
        {session ? (
          <button type="button" data-testid="undo" style={tap} onClick={() => onUndo?.()}>
            Undo
          </button>
        ) : null}
      </header>
      {import.meta.env.DEV ? <SchemaBanner issues={issues} /> : null}
      {httpStatus != null && httpStatus !== 200 ? <p data-testid="http-status">{httpStatus}</p> : null}
      {error ? (
        <p data-testid="api-error">
          {error.error.code} {error.error.message}
        </p>
      ) : null}
      <main>
      <Routes>
        <Route
          path="/"
          element={
            <HomeScreen
              library={library}
              scenarios={scenarios}
              onStartPractice={onStartPractice}
              onStartLive={onStartLive}
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
          element={<OutcomeScreen session={session} onSubmit={onSubmitOutcome} />}
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
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      </main>
    </div>
  )
}

function ConnectedShell() {
  const teller = useTeller()
  const navigate = useNavigate()
  const location = useLocation()
  const { loadHandoff } = teller
  const sessionId = teller.session?.session_id ?? null
  useEffect(() => {
    if (!sessionId || !location.pathname.endsWith('/handoff')) {
      return
    }
    void loadHandoff()
  }, [location.pathname, sessionId, loadHandoff])
  return (
    <AppShell
      library={teller.library}
      session={teller.session}
      issues={import.meta.env.DEV ? teller.issues : []}
      scenarios={listCases()}
      postedChipIds={teller.postedChipIds}
      httpStatus={teller.httpStatus}
      error={teller.error}
      onStartPractice={(scenarioId) => {
        void teller.startCase(scenarioId).then((next) => {
          if (next) {
            void navigate(`/sessions/${next.session_id}/context`)
          }
        })
      }}
      onStartLive={() => {
        void teller.startLive().then((next) => {
          if (next) {
            void navigate(`/sessions/${next.session_id}/context`)
          }
        })
      }}
      onPostContext={(chips) => {
        void teller.postContext(chips)
      }}
      onAnswer={(answer) => {
        void teller.postAnswer(answer)
      }}
      onUndo={() => {
        void teller.undo()
      }}
      handoff={teller.handoff}
      onSubmitOutcome={(body) => {
        void teller.postOutcome(body.outcome, body.actor)
      }}
    />
  )
}

export function App() {
  return (
    <BrowserRouter>
      <TellerProvider>
        <ConnectedShell />
      </TellerProvider>
    </BrowserRouter>
  )
}
