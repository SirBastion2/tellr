import { customerById } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { CopilotStrip } from '../workstation/CopilotStrip'
import { ExplanationPanel } from '../workstation/ExplanationPanel'
import { SimulationToolbar } from '../workstation/Toolbar'
import { TransactionPanel } from '../workstation/TransactionPanel'
import type { ActivityRow, Library, SessionState } from '../types'

export function HomeScreen({
  library,
  session,
  postedChipIds = [],
  activity = null,
  demo = null,
  closed = false,
  onUndo,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds?: readonly string[]
  activity?: readonly ActivityRow[] | null
  demo?: DemoView | null
  closed?: boolean
  onUndo?: () => void
}) {
  const customer = demo ? customerById(demo.customerId) : null

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
              library={library}
              activity={activity}
            />
            <CopilotStrip
              library={library}
              session={session}
              postedChipIds={postedChipIds}
              confirmed={demo.confirmed}
              pending={demo.pending}
              onConfirm={demo.onConfirmSignal}
              onDismiss={demo.onDismissSignal}
              onEscalate={demo.onEscalate}
              onUndo={session ? onUndo : undefined}
              closed={closed}
            />
          </div>
          <ExplanationPanel library={library} session={session} postedChipIds={postedChipIds} />
        </>
      ) : null}
    </section>
  )
}
