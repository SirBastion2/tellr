import type { CSSProperties } from 'react'
import { customerById } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { PageTitle, SectionHeading } from '../ui/facts'
import { controlStyle } from '../theme/controls'

const card: CSSProperties = {
  background: 'var(--tc-surface)',
  color: 'var(--tc-text)',
  border: '1px solid var(--tc-glass-border)',
  borderRadius: 'var(--tc-radius-card)',
  padding: 16,
  display: 'grid',
  gap: 12,
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
  fontSize: '1rem',
  fontWeight: 700,
}

export function CustomerFileScreen({ demo = null }: { demo?: DemoView | null }) {
  const customer = demo ? customerById(demo.customerId) : null

  return (
    <section data-testid="customer-screen" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <PageTitle>Customer file</PageTitle>
        <p data-testid="synthetic-banner" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Practice data. The name and age band stay on this screen. They are not sent to the copilot.
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
        <p style={{ margin: 0 }}>No practice customer is loaded.</p>
      )}
      {customer ? (
        <>
          <p className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
            {customer.summary}
          </p>
          <section style={card} aria-labelledby="profile-heading">
            <SectionHeading id="profile-heading">Profile</SectionHeading>
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
        </>
      ) : null}
    </section>
  )
}
