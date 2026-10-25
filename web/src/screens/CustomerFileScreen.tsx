import type { CSSProperties } from 'react'
import { customerById, scriptSignals } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { controlStyle } from '../theme/controls'
import type { Library } from '../types'

const card: CSSProperties = {
  background: 'var(--tc-surface)',
  color: 'var(--tc-text)',
  border: '1px solid var(--tc-glass-border)',
  borderRadius: 'var(--tc-radius-card)',
  padding: 16,
  display: 'grid',
  gap: 12,
}

const heading: CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 700,
}

const kv: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '9.5rem minmax(0, 1fr)',
  gap: '8px 16px',
  margin: 0,
  alignItems: 'baseline',
}

const term: CSSProperties = {
  margin: 0,
  color: 'var(--tc-muted)',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const badge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 24,
  padding: '0 8px',
  borderRadius: 999,
  background: 'var(--tc-chip-bg)',
  color: 'var(--tc-chip-fg)',
  fontSize: '0.75rem',
  fontWeight: 700,
}

function chipLabel(library: Library | null, id: string): string {
  return library?.context_chips.find((chip) => chip.id === id)?.label ?? id
}

function signalStatus(posted: boolean, confirmed: boolean, wasDismissed: boolean): string {
  if (wasDismissed) {
    return 'Dismissed'
  }
  if (confirmed) {
    return 'Teller confirmed'
  }
  if (posted) {
    return 'Observed'
  }
  return 'Not yet'
}

export function CustomerFileScreen({
  library,
  postedChipIds = [],
  dismissed = [],
  demo = null,
}: {
  library: Library | null
  postedChipIds?: readonly string[]
  dismissed?: readonly string[]
  demo?: DemoView | null
}) {
  const customer = demo ? customerById(demo.customerId) : null
  const signals = customer ? scriptSignals(customer) : []

  return (
    <section data-testid="customer-screen" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Customer file</h2>
        <p data-testid="synthetic-banner" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Synthetic demo data. Name and age band stay on this screen and are not sent to the copilot.
        </p>
      </div>
      {demo ? (
        <label htmlFor="customer-file-picker" style={{ display: 'grid', gap: 4, maxWidth: 360 }}>
          <span style={term}>Simulated customer</span>
          <select
            id="customer-file-picker"
            data-testid="customer-file-picker"
            value={demo.customerId}
            style={controlStyle}
            onChange={(event) => demo.onSelectCustomer(event.target.value)}
          >
            {demo.customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p style={{ margin: 0 }}>No simulated customer is loaded.</p>
      )}
      {customer ? (
        <>
          <p className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
            {customer.summary}
          </p>
          <section style={card} aria-labelledby="profile-heading">
            <h3 id="profile-heading" style={heading}>
              Profile
            </h3>
            <dl style={kv}>
              <dt style={term}>Name</dt>
              <dd data-testid="profile-name" style={{ margin: 0 }}>
                {customer.profile.name}
              </dd>
              <dt style={term}>Age band</dt>
              <dd data-testid="profile-age" style={{ margin: 0 }}>
                {customer.profile.ageBand}
              </dd>
              <dt style={term}>Tenure</dt>
              <dd style={{ margin: 0 }}>{customer.profile.tenure}</dd>
              <dt style={term}>Typical withdrawal</dt>
              <dd style={{ margin: 0 }}>{customer.profile.typicalWithdrawal}</dd>
              <dt style={term}>Channels</dt>
              <dd style={{ margin: 0 }}>{customer.profile.channels}</dd>
            </dl>
          </section>
          <section style={card} aria-labelledby="activity-heading">
            <h3 id="activity-heading" style={heading}>
              Recent activity
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...term, textAlign: 'left', padding: '8px 8px 8px 0' }}>Date</th>
                  <th style={{ ...term, textAlign: 'left', padding: 8 }}>Description</th>
                  <th style={{ ...term, textAlign: 'right', padding: '8px 0 8px 8px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {customer.activity.map((item) => (
                  <tr key={`${item.when}-${item.description}`} data-testid="activity-row">
                    <td style={{ padding: '8px 8px 8px 0', verticalAlign: 'top' }}>{item.when}</td>
                    <td style={{ padding: 8, verticalAlign: 'top' }}>{item.description}</td>
                    <td style={{ padding: '8px 0 8px 8px', textAlign: 'right', fontWeight: 700, verticalAlign: 'top' }}>
                      {item.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section style={card} aria-labelledby="live-txn-heading">
            <h3 id="live-txn-heading" style={heading}>
              Live transaction
            </h3>
            <dl data-testid="file-transaction" style={kv}>
              <dt style={term}>Type</dt>
              <dd style={{ margin: 0 }}>{customer.transaction.type}</dd>
              <dt style={term}>Amount</dt>
              <dd style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>{customer.transaction.amount}</dd>
              <dt style={term}>Memo</dt>
              <dd className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
                {customer.transaction.memo}
              </dd>
            </dl>
          </section>
          <section style={card} aria-labelledby="signals-heading">
            <h3 id="signals-heading" style={heading}>
              Signals fed to the copilot
            </h3>
            {signals.length === 0 ? (
              <p data-testid="file-no-signals" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
                This script posts no signals, so a clear level is not a false alarm.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {signals.map((signal) => {
                  const posted = postedChipIds.includes(signal.chipId)
                  const wasDismissed = dismissed.includes(signal.chipId)
                  const confirmed = demo?.confirmed.includes(signal.chipId) ?? false
                  const status = signalStatus(posted, confirmed, wasDismissed)
                  return (
                    <li
                      key={`${signal.eventId}-${signal.chipId}`}
                      data-testid="file-signal"
                      data-status={status}
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span>{chipLabel(library, signal.chipId)}</span>
                      <span className="tc-badge" style={badge}>
                        {status}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </section>
  )
}
