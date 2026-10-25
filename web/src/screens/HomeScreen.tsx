import type { CSSProperties } from 'react'
import { customerById } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { controlStyle, inputFill, primaryStyle } from '../theme/controls'
import { CopilotStrip } from '../workstation/CopilotStrip'
import { ExplanationPanel } from '../workstation/ExplanationPanel'
import { TransactionPanel } from '../workstation/TransactionPanel'
import type { Library, SessionState } from '../types'

const tap: CSSProperties = controlStyle
const primary: CSSProperties = { ...controlStyle, ...primaryStyle }

export function HomeScreen({
  library,
  session,
  postedChipIds = [],
  demo = null,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds?: readonly string[]
  demo?: DemoView | null
}) {
  const customer = demo ? customerById(demo.customerId) : null

  return (
    <section data-testid="home-screen" style={{ display: 'grid', gap: 'var(--tc-space-gap, 16px)' }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>Workstation</h2>
      {library ? (
        <p style={{ margin: 0 }}>
          Library <span data-testid="library-version">{library.library_version}</span>
          {' · '}
          Copy status <span data-testid="copy-status">{library.copy_status}</span>
        </p>
      ) : null}
      {demo && customer ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}>
            <label htmlFor="customer-picker" style={{ display: 'grid', gap: 4 }}>
              Simulated customer
              <select
                id="customer-picker"
                data-testid="customer-picker"
                value={demo.customerId}
                style={tap}
                onChange={(event) => demo.onSelectCustomer(event.target.value)}
              >
                {demo.customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="tc-btn"
              data-variant="primary"
              data-testid="demo-play"
              title="Play (P)"
              aria-pressed={demo.playing}
              data-loading={demo.pending ? 'true' : 'false'}
              aria-busy={demo.pending}
              style={{ ...primary, backgroundColor: demo.playing ? inputFill : primary.backgroundColor }}
              onClick={() => (demo.playing ? demo.onPause() : demo.onPlay())}
            >
              {demo.playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="tc-btn"
              data-variant="secondary"
              data-testid="demo-step"
              title="Step (N)"
              style={tap}
              onClick={() => demo.onStep()}
            >
              Step
            </button>
            <button
              type="button"
              className="tc-btn"
              data-variant="danger"
              data-testid="demo-restart"
              title="Restart (R)"
              style={tap}
              onClick={() => demo.onRestart()}
            >
              Restart
            </button>
            <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <legend className="tc-sr">Speed</legend>
              {([1, 2, 4] as const).map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className="tc-btn"
                  data-variant="secondary"
                  data-testid={`demo-speed-${speed}`}
                  aria-pressed={demo.speed === speed}
                  style={{ ...tap, backgroundColor: demo.speed === speed ? inputFill : 'transparent' }}
                  onClick={() => demo.onSpeed(speed)}
                >
                  {speed}×
                </button>
              ))}
            </fieldset>
            <button
              type="button"
              className="tc-btn"
              data-variant="secondary"
              data-testid="case-file-toggle"
              aria-pressed={demo.showCase}
              style={{ ...tap, backgroundColor: demo.showCase ? inputFill : 'transparent' }}
              onClick={() => demo.onToggleCase()}
            >
              {demo.showCase ? 'Hide case file' : 'Show case file'}
            </button>
          </div>
          <div className="tc-workstation">
            <TransactionPanel customer={customer} fired={demo.index} showCase={demo.showCase} />
            <CopilotStrip
              library={library}
              session={session}
              postedChipIds={postedChipIds}
              confirmed={demo.confirmed}
              pending={demo.pending}
              onConfirm={demo.onConfirmSignal}
              onDismiss={demo.onDismissSignal}
              onEscalate={demo.onEscalate}
            />
          </div>
          <ExplanationPanel library={library} session={session} postedChipIds={postedChipIds} />
        </>
      ) : null}
    </section>
  )
}
