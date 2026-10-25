import type { CSSProperties } from 'react'
import { customerById } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { PageTitle, SectionHeading } from '../ui/facts'
import { displayCustomerLabel, personalNamesFrom, redactPersonalCopy } from '../ui/privacy'
import { controlStyle } from '../theme/controls'

const card: CSSProperties = {
  background: 'var(--tc-surface)',
  color: 'var(--tc-text)',
  border: '1px solid var(--tc-glass-border)',
  borderRadius: 'var(--tc-radius-card)',
  padding: 'var(--tc-space-4)',
  display: 'grid',
  gap: 'var(--tc-space-3)',
}

const kv: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '9.5rem minmax(0, 1fr)',
  gap: 'var(--tc-space-2) var(--tc-space-4)',
  margin: 0,
  alignItems: 'baseline',
}

const term: CSSProperties = {
  margin: 0,
}

export function CustomerFileScreen({ demo = null }: { demo?: DemoView | null }) {
  const customer = demo ? customerById(demo.customerId) : null

  return (
    <section data-testid="customer-screen" className="tc-screen">
      <div className="tc-stack-heading">
        <PageTitle>Customer file</PageTitle>
        <p data-testid="synthetic-banner" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Practice data.
        </p>
      </div>
      {demo ? (
        <label htmlFor="customer-file-picker" className="tc-stack-heading" style={{ maxWidth: 360 }}>
          <span className="tc-text-base" style={term}>
            Simulated customer
          </span>
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
            {redactPersonalCopy(customer.summary, personalNamesFrom(customer.profile.name))}
          </p>
          <section style={card} aria-labelledby="profile-heading">
            <SectionHeading id="profile-heading">Profile</SectionHeading>
            <dl style={kv}>
              <dt className="tc-fact-term" style={term}>
                Customer
              </dt>
              <dd className="tc-fact-value" data-testid="profile-name" style={{ margin: 0 }}>
                {displayCustomerLabel()}
              </dd>
              <dt className="tc-fact-term" style={term}>
                Tenure
              </dt>
              <dd className="tc-fact-value" style={{ margin: 0 }}>
                {customer.profile.tenure}
              </dd>
              <dt className="tc-fact-term" style={term}>
                Typical withdrawal
              </dt>
              <dd className="tc-fact-value" style={{ margin: 0 }}>
                {customer.profile.typicalWithdrawal}
              </dd>
              <dt className="tc-fact-term" style={term}>
                Channels
              </dt>
              <dd className="tc-fact-value" style={{ margin: 0 }}>
                {customer.profile.channels}
              </dd>
            </dl>
          </section>
        </>
      ) : null}
    </section>
  )
}
