import type { CSSProperties, ReactNode } from 'react'
import type { CustomerFile } from '../demo/customers'

const label: CSSProperties = {
  margin: 0,
  color: 'var(--tc-muted)',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const value: CSSProperties = { margin: 0 }

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
    <section aria-label="Core banking" data-testid="transaction-panel" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Transaction</h2>
      <p data-testid="synthetic-banner" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
        Synthetic demo data. Name and age band stay on this screen and are not sent to the copilot.
      </p>
      {presenter ? (
        <p data-testid="event-caption" className="tc-prose" style={{ margin: 0, fontSize: '2rem', lineHeight: 1.25, fontWeight: 650, maxWidth: '70ch' }}>
          {current?.text ?? 'Press play to start the simulation.'}
        </p>
      ) : null}
      <dl className="tc-kv" style={{ display: 'grid', gridTemplateColumns: '9.5rem minmax(0, 1fr)', gap: '8px 16px', margin: 0, alignItems: 'baseline' }}>
        <Row term="Type">
          <span data-testid="txn-type">{customer.transaction.type}</span>
        </Row>
        <Row term="Amount">
          <span data-testid="txn-amount" style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>
            {customer.transaction.amount}
          </span>
        </Row>
        <Row term="Memo">
          <span className="tc-prose" style={{ display: 'block', maxWidth: '70ch' }}>
            {customer.transaction.memo}
          </span>
        </Row>
      </dl>
      {showCase ? (
        <section data-testid="case-file" aria-label="Synthetic case file" style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Case file</h3>
          <dl className="tc-kv" style={{ display: 'grid', gridTemplateColumns: '9.5rem minmax(0, 1fr)', gap: '8px 16px', margin: 0 }}>
            <Row term="Name">{customer.profile.name}</Row>
            <Row term="Age band">{customer.profile.ageBand}</Row>
            <Row term="Tenure">{customer.profile.tenure}</Row>
            <Row term="Typical withdrawal">{customer.profile.typicalWithdrawal}</Row>
            <Row term="Channels">{customer.profile.channels}</Row>
          </dl>
        </section>
      ) : null}
      <h3 style={{ margin: 0, fontSize: '1rem' }}>Timeline</h3>
      <ol data-testid="demo-timeline" className="tc-timeline" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
        {visible.map((event, index) => {
          const isCurrent = index === visible.length - 1
          const last = index === visible.length - 1
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
                columnGap: 12,
                paddingBottom: last ? 0 : 16,
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
              <p
                className="tc-prose"
                style={{
                  margin: 0,
                  maxWidth: '70ch',
                  padding: '4px 8px',
                  borderRadius: 8,
                  background: isCurrent ? 'var(--tc-input)' : 'transparent',
                  fontWeight: isCurrent ? 650 : 400,
                }}
              >
                {event.text}
              </p>
            </li>
          )
        })}
      </ol>
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
