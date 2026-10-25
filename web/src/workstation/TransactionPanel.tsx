import { formatElapsed, timelineElapsedMs } from '../demo/clock'
import type { CustomerEvent, CustomerFile } from '../demo/customers'
import { Emphasis } from '../ui/emphasis'
import { Fact, FactGrid, SectionHeading } from '../ui/facts'
import { displaySpeaker, personalNamesFrom, redactPersonalCopy } from '../ui/privacy'
import { CaseFileLink } from './Toolbar'

function eventSpeaker(event: CustomerEvent, names: readonly string[]): string {
  return displaySpeaker(event.kind, event.speaker, names)
}

export function TransactionPanel({
  customer,
  fired,
  showCase,
  presenter = false,
  onToggleCase,
}: {
  customer: CustomerFile
  fired: number
  showCase: boolean
  presenter?: boolean
  onToggleCase: () => void
}) {
  const visible = customer.events.slice(0, fired)
  const current = fired > 0 ? customer.events[fired - 1] : null
  const names = personalNamesFrom(customer.profile.name)
  const shown = Math.min(fired, customer.events.length)
  const total = customer.events.length
  const pct = total === 0 ? 0 : Math.round((shown / total) * 100)

  return (
    <section aria-label="Core banking" data-testid="transaction-panel" className="tc-transaction tc-screen" style={{ alignContent: 'start' }}>
      <div className="tc-stack-heading">
        <div className="tc-txn-head">
          <h2 className="tc-title">Transaction</h2>
          <CaseFileLink showCase={showCase} onToggleCase={onToggleCase} />
        </div>
        <p data-testid="synthetic-banner" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Practice data.
        </p>
      </div>
      <p
        data-testid="event-caption"
        className={presenter ? 'tc-prose tc-display' : 'tc-prose tc-text-base'}
        style={{
          margin: 0,
          maxWidth: '70ch',
        }}
      >
        <Emphasis text={current ? redactPersonalCopy(current.text, names) : 'Customer File'} />
      </p>
      <FactGrid className="tc-kv" label="Transaction">
        <Fact term="Type">
          <span data-testid="txn-type">{customer.transaction.type}</span>
        </Fact>
        <Fact term="Amount">
          <span data-testid="txn-amount" className="tc-amount">
            {customer.transaction.amount}
          </span>
        </Fact>
        <Fact term="Memo">
          <span className="tc-prose" style={{ display: 'block', maxWidth: '70ch' }}>
            <Emphasis text={customer.transaction.memo} />
          </span>
        </Fact>
      </FactGrid>
      <SectionHeading>Timeline</SectionHeading>
      <ol data-testid="demo-timeline" className="tc-timeline" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
        {visible.map((event, index) => {
          const isCurrent = index === visible.length - 1
          const isPast = index < shown - 1
          const last = index === visible.length - 1
          const elapsed = timelineElapsedMs(customer.events, index + 1)
          return (
            <li
              key={event.id}
              data-testid="demo-event"
              data-kind={event.kind}
              data-current={isCurrent ? 'true' : 'false'}
              data-past={isPast ? 'true' : undefined}
              aria-current={isCurrent ? 'step' : undefined}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px minmax(0, 1fr)',
                columnGap: 'var(--tc-space-3)',
                paddingBottom: last ? 0 : 'var(--tc-timeline-gap, var(--tc-space-4))',
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    marginTop: 4,
                    boxSizing: 'border-box',
                    borderRadius: '50%',
                    border: '2px solid var(--tc-accent)',
                    background: isCurrent ? 'var(--tc-accent)' : 'var(--tc-surface)',
                  }}
                />
                {last ? null : (
                  <span aria-hidden="true" style={{ width: 2, flex: 1, background: 'var(--tc-accent)', minHeight: 12 }} />
                )}
              </span>
              <div
                style={{
                  margin: 0,
                  maxWidth: '70ch',
                  padding: 'var(--tc-space-1) var(--tc-space-2)',
                  borderRadius: 'var(--tc-radius-card, 16px)',
                  background: isCurrent ? 'var(--tc-input)' : 'transparent',
                }}
              >
                <p className="tc-kicker" data-testid="event-marker" style={{ margin: 0 }}>
                  Step {index + 1} · {formatElapsed(elapsed)} · {eventSpeaker(event, names)}
                </p>
                <p className="tc-prose" style={{ margin: 'var(--tc-space-1, 4px) 0 0' }}>
                  <Emphasis text={redactPersonalCopy(event.text, names)} />
                </p>
              </div>
            </li>
          )
        })}
      </ol>
      {showCase ? (
        <section data-testid="case-file" aria-label="Synthetic case file" className="tc-stack-heading">
          <SectionHeading>Case file</SectionHeading>
          <FactGrid className="tc-kv" label="Case file">
            <Fact term="Tenure">{customer.profile.tenure}</Fact>
            <Fact term="Typical withdrawal">{customer.profile.typicalWithdrawal}</Fact>
            <Fact term="Channels">{customer.profile.channels}</Fact>
          </FactGrid>
        </section>
      ) : null}
      <div className="tc-block">
        <p className="tc-kicker" style={{ margin: 0 }}>
          Event {shown} of {total}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={shown}
          aria-label={`Event ${shown} of ${total}`}
          data-testid="event-progress"
          style={{
            height: 8,
            marginTop: 'var(--tc-space-2, 8px)',
            background: 'var(--tc-input)',
            borderRadius: 'var(--tc-radius-control, 999px)',
            overflow: 'hidden',
            border: '1px solid var(--tc-accent)',
          }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--tc-accent)' }} />
        </div>
      </div>
    </section>
  )
}
