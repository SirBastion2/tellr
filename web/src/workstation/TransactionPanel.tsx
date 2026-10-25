import type { CustomerFile } from '../demo/customers'

export function TransactionPanel({
  customer,
  fired,
  showCase,
}: {
  customer: CustomerFile
  fired: number
  showCase: boolean
}) {
  const visible = customer.events.slice(0, fired)
  return (
    <section aria-label="Core banking" data-testid="transaction-panel" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Transaction</h2>
      <p data-testid="synthetic-banner" style={{ margin: 0 }}>
        Synthetic demo data. Name and age band stay on this screen and are not sent to the copilot.
      </p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0 }}>
        <dt>Type</dt>
        <dd data-testid="txn-type" style={{ margin: 0 }}>
          {customer.transaction.type}
        </dd>
        <dt>Amount</dt>
        <dd data-testid="txn-amount" style={{ margin: 0 }}>
          {customer.transaction.amount}
        </dd>
        <dt>Memo</dt>
        <dd style={{ margin: 0 }}>{customer.transaction.memo}</dd>
      </dl>
      {showCase ? (
        <section data-testid="case-file" aria-label="Synthetic case file">
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Case file</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0 }}>
            <dt>Name</dt>
            <dd style={{ margin: 0 }}>{customer.profile.name}</dd>
            <dt>Age band</dt>
            <dd style={{ margin: 0 }}>{customer.profile.ageBand}</dd>
            <dt>Tenure</dt>
            <dd style={{ margin: 0 }}>{customer.profile.tenure}</dd>
            <dt>Typical withdrawal</dt>
            <dd style={{ margin: 0 }}>{customer.profile.typicalWithdrawal}</dd>
            <dt>Channels</dt>
            <dd style={{ margin: 0 }}>{customer.profile.channels}</dd>
          </dl>
        </section>
      ) : null}
      <h3 style={{ margin: 0, fontSize: 16 }}>Timeline</h3>
      <ol data-testid="demo-timeline" style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: 8 }}>
        {visible.map((event) => (
          <li key={event.id} data-testid="demo-event" data-kind={event.kind}>
            {event.text}
          </li>
        ))}
      </ol>
      <p style={{ margin: 0 }}>
        Event {Math.min(fired, customer.events.length)} of {customer.events.length}
      </p>
    </section>
  )
}
