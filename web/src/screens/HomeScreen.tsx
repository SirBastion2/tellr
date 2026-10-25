import { useState } from 'react'
import { customerById } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { CopilotStrip } from '../workstation/CopilotStrip'
import { ExplanationPanel } from '../workstation/ExplanationPanel'
import { SimulationToolbar } from '../workstation/Toolbar'
import { TransactionPanel } from '../workstation/TransactionPanel'
import type { ActivityRow, AnswerPost, Library, SessionState } from '../types'

const EMPTY_IDS: readonly string[] = []

function useHeldValue<T>(value: T, hold: boolean): T {
  const [held, setHeld] = useState(value)
  if (!hold && !Object.is(held, value)) {
    setHeld(value)
  }
  return hold ? held : value
}

export function HomeScreen({
  library,
  session,
  postedChipIds = EMPTY_IDS,
  dismissed = [],
  chipOrder = [],
  activity = null,
  demo = null,
  closed = false,
  onUndo,
  onAnswer,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds?: readonly string[]
  dismissed?: readonly string[]
  chipOrder?: readonly string[]
  activity?: readonly ActivityRow[] | null
  demo?: DemoView | null
  closed?: boolean
  onUndo?: () => void
  onAnswer?: (answer: AnswerPost) => void
}) {
  const customer = demo ? customerById(demo.customerId) : null
  const idle = Boolean(demo && demo.index === 0 && !demo.playing)
  const live = Boolean(demo && (demo.playing || demo.index > 0))
  const pending = Boolean(demo?.pending)
  const shownSession = useHeldValue(session, pending)
  const shownPosted = useHeldValue(postedChipIds, pending)
  const shownActivity = useHeldValue(activity, pending)

  return (
    <section data-testid="home-screen" style={{ display: 'grid', gap: 'var(--tc-space-gap, 13px)' }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <h2 className="tc-title">Workstation</h2>
        {library ? (
          <p className="tc-prose" style={{ margin: 0, maxWidth: '70ch', fontSize: '0.875rem' }}>
            Library <span data-testid="library-version">{library.library_version}</span>
            {' · '}
            Copy status <span data-testid="copy-status">{library.copy_status}</span>
          </p>
        ) : null}
      </div>
      {demo && customer ? (
        <>
          <SimulationToolbar demo={demo} />
          <div className="tc-workstation">
            <TransactionPanel
              customer={customer}
              fired={demo.index}
              showCase={demo.showCase}
              presenter={demo.presenter}
            />
            <CopilotStrip
              library={library}
              session={shownSession}
              postedChipIds={shownPosted}
              confirmed={demo.confirmed}
              dismissed={dismissed}
              pending={pending}
              idle={idle}
              onConfirm={demo.onConfirmSignal}
              onDismiss={demo.onDismissSignal}
              onRestore={demo.onRestoreSignal}
              onEscalate={demo.onEscalate}
              onUndo={live ? onUndo : undefined}
              onAnswer={onAnswer}
              closed={closed}
            />
          </div>
          {idle ? null : (
            <ExplanationPanel
              library={library}
              session={shownSession}
              postedChipIds={shownPosted}
              confirmed={demo.confirmed}
              dismissed={dismissed}
              chipOrder={chipOrder}
              activity={shownActivity}
              onConfirm={demo.onConfirmSignal}
              onDismiss={demo.onDismissSignal}
              onRestore={demo.onRestoreSignal}
              closed={closed}
              pending={pending}
            />
          )}
        </>
      ) : null}
    </section>
  )
}
