import { useState } from 'react'
import { customerById } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { CopilotStrip } from '../workstation/CopilotStrip'
import { PlaybackBar, SimulationToolbar } from '../workstation/Toolbar'
import { TransactionPanel } from '../workstation/TransactionPanel'
import type { ActivityRow, Library, SessionState } from '../types'

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
  chipOrder = EMPTY_IDS,
  activity = null,
  demo = null,
  closed = false,
  showPlayback = true,
  onUndo,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds?: readonly string[]
  dismissed?: readonly string[]
  chipOrder?: readonly string[]
  activity?: readonly ActivityRow[] | null
  demo?: DemoView | null
  closed?: boolean
  showPlayback?: boolean
  onUndo?: () => void
}) {
  const customer = demo ? customerById(demo.customerId) : null
  const idle = Boolean(demo && demo.index === 0 && !demo.playing)
  const live = Boolean(demo && (demo.playing || demo.index > 0))
  const pending = Boolean(demo?.pending)
  const shownSession = useHeldValue(session, pending)
  const shownPosted = useHeldValue(postedChipIds, pending)
  const shownActivity = useHeldValue(activity, pending)
  const shownOrder = useHeldValue(chipOrder, pending)

  return (
    <section data-testid="home-screen" className="tc-screen tc-home">
      {demo && customer ? (
        <>
          <div className="tc-workstation">
            <div className="tc-home-column">
              <SimulationToolbar demo={demo} />
              <TransactionPanel
                customer={customer}
                fired={demo.index}
                showCase={demo.showCase}
                presenter={demo.presenter}
                onToggleCase={demo.onToggleCase}
              />
              {showPlayback ? <PlaybackBar demo={demo} /> : null}
            </div>
            <CopilotStrip
              library={library}
              session={shownSession}
              postedChipIds={shownPosted}
              confirmed={demo.confirmed}
              dismissed={dismissed}
              chipOrder={shownOrder}
              pending={pending}
              idle={idle}
              onConfirm={demo.onConfirmSignal}
              onDismiss={demo.onDismissSignal}
              onRestore={demo.onRestoreSignal}
              onEscalate={demo.onEscalate}
              onUndo={live ? onUndo : undefined}
              closed={closed}
              activity={shownActivity}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
