import { customerById } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { CopilotStrip } from '../workstation/CopilotStrip'
import { ExplanationPanel } from '../workstation/ExplanationPanel'
import { SimulationToolbar } from '../workstation/Toolbar'
import { TransactionPanel } from '../workstation/TransactionPanel'
import type { Library, SessionState } from '../types'

export function HomeScreen({
  library,
  session,
  postedChipIds = [],
  demo = null,
  onUndo,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds?: readonly string[]
  demo?: DemoView | null
  onUndo?: () => void
}) {
  const customer = demo ? customerById(demo.customerId) : null

  return (
    <section data-testid="home-screen" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Workstation</h2>
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
              session={session}
              postedChipIds={postedChipIds}
              confirmed={demo.confirmed}
              pending={demo.pending}
              onConfirm={demo.onConfirmSignal}
              onDismiss={demo.onDismissSignal}
              onEscalate={demo.onEscalate}
              onUndo={session ? onUndo : undefined}
            />
          </div>
          <ExplanationPanel library={library} session={session} postedChipIds={postedChipIds} />
        </>
      ) : null}
    </section>
  )
}
