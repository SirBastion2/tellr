import type { CSSProperties } from 'react'
import { customerById } from '../demo/customers'
import type { DemoView } from '../demo/types'
import { Fact, FactGrid, PageTitle, SectionHeading } from '../ui/facts'
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
          <span className="tc-fact-term">Simulated customer</span>
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
        <p className="tc-prose" style={{ margin: 0 }}>
          No practice customer is loaded.
        </p>
      )}
      {customer ? (
        <>
          <p className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
            {redactPersonalCopy(customer.summary, personalNamesFrom(customer.profile.name))}
          </p>
          <section style={card} aria-labelledby="profile-heading">
            <SectionHeading id="profile-heading">Profile</SectionHeading>
            <FactGrid className="tc-kv" label="Profile">
              <Fact term="Customer" testId="profile-name">
                {displayCustomerLabel()}
              </Fact>
              <Fact term="Tenure">{customer.profile.tenure}</Fact>
              <Fact term="Typical withdrawal">{customer.profile.typicalWithdrawal}</Fact>
              <Fact term="Channels">{customer.profile.channels}</Fact>
            </FactGrid>
          </section>
        </>
      ) : null}
    </section>
  )
}
