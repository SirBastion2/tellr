import { Link, BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'
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
import type { AnswerPost, ErrorResponse, Library, SessionState } from './types'
import type { SchemaIssue } from './validate'

export function AppShell({
  library,
  session,
  issues,
  cases,
  onStart,
  postedChipIds = [],
  onPostContext,
  onAnswer,
  onUndo,
  httpStatus = null,
  error = null,
}: {
  library: Library | null
  session: SessionState | null
  issues: readonly SchemaIssue[]
  cases: readonly { id: string }[]
  onStart: (caseId: string) => void
  postedChipIds?: readonly string[]
  onPostContext?: (chips: string[]) => void
  onAnswer?: (answer: AnswerPost) => void
  onUndo?: () => void
  httpStatus?: number | null
  error?: ErrorResponse | null
}) {
  return (
    <main className="min-h-screen bg-stone-50 p-6 text-stone-900">
      <h1 className="text-xl font-semibold">Teller Copilot</h1>
      <LiveBadge mode={session?.mode ?? null} />
      {import.meta.env.DEV ? <SchemaBanner issues={issues} /> : null}
      {httpStatus != null && httpStatus !== 200 ? <p data-testid="http-status">{httpStatus}</p> : null}
      {error ? (
        <p data-testid="api-error">
          {error.error.code} {error.error.message}
        </p>
      ) : null}
      <nav className="my-4 flex flex-wrap gap-3 text-sm">
        {APP_ROUTES.map((route) => {
          if (route.path.includes(':id')) {
            if (!session) {
              return null
            }
            const path = route.path.replace(':id', session.session_id)
            return (
              <Link key={route.id} to={path}>
                {path}
              </Link>
            )
          }
          return (
            <Link key={route.id} to={route.path}>
              {route.path}
            </Link>
          )
        })}
        {session ? (
          <button type="button" onClick={() => onUndo?.()}>
            POST /undo
          </button>
        ) : null}
      </nav>
      <Routes>
        <Route path="/" element={<HomeScreen library={library} cases={cases} onStart={onStart} />} />
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
        <Route path="/sessions/:id/outcome" element={<OutcomeScreen session={session} />} />
        <Route path="/sessions/:id/handoff" element={<HandoffScreen />} />
        <Route
          path="/sessions/:id"
          element={<InterviewScreen library={library} session={session} onAnswer={onAnswer} />}
        />
        <Route path="/health" element={<HealthScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </main>
  )
}

function ConnectedShell() {
  const teller = useTeller()
  const navigate = useNavigate()
  return (
    <AppShell
      library={teller.library}
      session={teller.session}
      issues={import.meta.env.DEV ? teller.issues : []}
      cases={listCases()}
      postedChipIds={teller.postedChipIds}
      httpStatus={teller.httpStatus}
      error={teller.error}
      onStart={(caseId) => {
        void teller.startCase(caseId).then((next) => {
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
