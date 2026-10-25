import { customerById, scriptSignals } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { controlStyle } from '../theme/controls'
import type { Library } from '../types'

function chipLabel(library: Library | null, id: string): string {
  return library?.context_chips.find((chip) => chip.id === id)?.label ?? id
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
    <section data-testid="customer-screen" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>Customer file</h2>
      <p data-testid="synthetic-banner" style={{ margin: 0 }}>
        Synthetic demo data. Name and age band stay on this screen and are not sent to the copilot.
      </p>
      {demo ? (
        <label htmlFor="customer-file-picker" style={{ display: 'grid', gap: 4 }}>
          Simulated customer
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
          <p style={{ margin: 0 }}>{customer.summary}</p>
          <h3 style={{ margin: 0, fontSize: 16 }}>Profile</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0 }}>
            <dt>Name</dt>
            <dd data-testid="profile-name" style={{ margin: 0 }}>
              {customer.profile.name}
            </dd>
            <dt>Age band</dt>
            <dd data-testid="profile-age" style={{ margin: 0 }}>
              {customer.profile.ageBand}
            </dd>
            <dt>Tenure</dt>
            <dd style={{ margin: 0 }}>{customer.profile.tenure}</dd>
            <dt>Typical withdrawal</dt>
            <dd style={{ margin: 0 }}>{customer.profile.typicalWithdrawal}</dd>
            <dt>Channels</dt>
            <dd style={{ margin: 0 }}>{customer.profile.channels}</dd>
          </dl>
          <h3 style={{ margin: 0, fontSize: 16 }}>Recent activity</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {customer.activity.map((item) => (
              <li key={`${item.when}-${item.description}`} data-testid="activity-row">
                {item.when}: {item.description}
              </li>
            ))}
          </ul>
          <h3 style={{ margin: 0, fontSize: 16 }}>Live transaction</h3>
          <p style={{ margin: 0 }} data-testid="file-transaction">
            {customer.transaction.type} {customer.transaction.amount}. {customer.transaction.memo}
          </p>
          <h3 style={{ margin: 0, fontSize: 16 }}>Signals fed to the copilot</h3>
          {signals.length === 0 ? (
            <p data-testid="file-no-signals" style={{ margin: 0 }}>
              This script posts no signals, so a clear level is not a false alarm.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {signals.map((signal) => {
                const posted = postedChipIds.includes(signal.chipId)
                const wasDismissed = dismissed.includes(signal.chipId)
                const confirmed = demo?.confirmed.includes(signal.chipId) ?? false
                const status = wasDismissed
                  ? 'Dismissed'
                  : confirmed
                    ? 'Teller confirmed'
                    : posted
                      ? 'Auto-detected'
                      : 'Not yet'
                return (
                  <li key={`${signal.eventId}-${signal.chipId}`} data-testid="file-signal" data-status={status}>
                    {chipLabel(library, signal.chipId)} — {status}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}
