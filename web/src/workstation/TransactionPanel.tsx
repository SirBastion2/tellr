import type { CSSProperties, ReactNode } from 'react'
import { formatElapsed, timelineElapsedMs } from '../demo/clock'
import type { CustomerEvent, CustomerFile } from '../demo/customers'
import { Emphasis } from '../ui/emphasis'
import { SectionHeading } from '../ui/facts'

const label: CSSProperties = {
  margin: 0,
  fontWeight: 700,
  fontSize: '1rem',
}

const value: CSSProperties = { margin: 0 }

function eventSpeaker(event: CustomerEvent): string {
  if (event.speaker) {
    return event.speaker
  }
  return event.kind === 'transaction' ? 'Transaction' : 'Customer'
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt style={label}>{term}</dt>
      <dd style={value}>{children}</dd>
    </>
  )
}

export function TransactionPanel({
  customer,
  fired,
  showCase,
  presenter = false,
}: {
  customer: CustomerFile
  fired: number
  showCase: boolean
  presenter?: boolean
}) {
  const visible = customer.events.slice(0, fired)
  const current = fired > 0 ? customer.events[fired - 1] : null
  const shown = Math.min(fired, customer.events.length)
  const total = customer.events.length
  const pct = total === 0 ? 0 : Math.round((shown / total) * 100)

  return (
    <section aria-label="Core banking" data-testid="transaction-panel" className="tc-transaction tc-screen" style={{ alignContent: 'start' }}>
      <div className="tc-stack-heading">
        <h2 className="tc-title">Transaction</h2>
        <p data-testid="synthetic-banner" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Practice data. The name and age band stay on this screen. They are not sent to the copilot.
        </p>
      </div>
      <p
        data-testid="event-caption"
        className="tc-prose"
        style={{
          margin: 0,
          fontSize: presenter ? 'var(--tc-type-display)' : 'var(--tc-type-section)',
          lineHeight: 1.25,
          fontWeight: 700,
          maxWidth: '70ch',
        }}
      >
        <Emphasis text={current?.text ?? 'Press play to start the simulation.'} />
      </p>
      <dl className="tc-kv">
        <Row term="Type">
          <span data-testid="txn-type">{customer.transaction.type}</span>
        </Row>
        <Row term="Amount">
          <span data-testid="txn-amount" className="tc-amount" style={{ fontWeight: 700, lineHeight: 1.2 }}>
            {customer.transaction.amount}
          </span>
        </Row>
        <Row term="Memo">
          <span className="tc-prose" style={{ display: 'block', maxWidth: '70ch' }}>
            <Emphasis text={customer.transaction.memo} />
          </span>
        </Row>
      </dl>
      <SectionHeading>Timeline</SectionHeading>
      <ol data-testid="demo-timeline" className="tc-timeline" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
        {visible.map((event, index) => {
          const isCurrent = index === visible.length - 1
          const last = index === visible.length - 1
          const elapsed = timelineElapsedMs(customer.events, index + 1)
          return (
            <li
              key={event.id}
              data-testid="demo-event"
              data-kind={event.kind}
              data-current={isCurrent ? 'true' : 'false'}
              aria-current={isCurrent ? 'step' : undefined}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px minmax(0, 1fr)',
                columnGap: 'var(--tc-space-3)',
                paddingBottom: last ? 0 : 'var(--tc-space-4)',
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
                  borderRadius: 8,
                  background: isCurrent ? 'var(--tc-input)' : 'transparent',
                }}
              >
                <p className="tc-kicker" data-testid="event-marker" style={{ margin: 0 }}>
                  Step {index + 1} · {formatElapsed(elapsed)} · {eventSpeaker(event)}
                </p>
                <p className="tc-prose" style={{ margin: '4px 0 0', fontWeight: isCurrent ? 600 : 400 }}>
                  <Emphasis text={event.text} />
                </p>
              </div>
            </li>
          )
        })}
      </ol>
      {showCase ? (
        <section data-testid="case-file" aria-label="Synthetic case file" className="tc-stack-heading">
          <SectionHeading>Case file</SectionHeading>
          <dl className="tc-kv" style={{ display: 'grid', gridTemplateColumns: '9.5rem minmax(0, 1fr)', gap: 'var(--tc-space-2) var(--tc-space-4)', margin: 0 }}>
            <Row term="Name">{customer.profile.name}</Row>
            <Row term="Age band">{customer.profile.ageBand}</Row>
            <Row term="Tenure">{customer.profile.tenure}</Row>
            <Row term="Typical withdrawal">{customer.profile.typicalWithdrawal}</Row>
            <Row term="Channels">{customer.profile.channels}</Row>
          </dl>
        </section>
      ) : null}
      <div>
        <p style={{ margin: 0, fontWeight: 700 }}>
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
            marginTop: 8,
            background: 'var(--tc-input)',
            borderRadius: 999,
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
