import { formatElapsed, timelineElapsedMs } from '../demo/clock'
import type { CustomerEvent, CustomerFile } from '../demo/customers'
import { Emphasis } from '../ui/emphasis'
import { Fact, FactGrid, SectionHeading } from '../ui/facts'
import { displaySpeaker, personalNamesFrom, redactPersonalCopy } from '../ui/privacy'
import { StepSwap, useStepDirection } from './StepSwap'
import { CaseFileLink } from './Toolbar'

function eventSpeaker(event: CustomerEvent, names: readonly string[]): string {
  return displaySpeaker(event.kind, event.speaker, names)
}

/** Move only the timeline list so the highlighted step is fully inside it. */
export function revealCurrentStep(list: HTMLElement): void {
  const current = list.querySelector<HTMLElement>('[data-current="true"]')
  if (!current) {
    return
  }
  const listRect = list.getBoundingClientRect()
  const itemRect = current.getBoundingClientRect()
  const slack = 1
  if (itemRect.bottom > listRect.bottom + slack) {
    list.scrollTop += itemRect.bottom - listRect.bottom
  } else if (itemRect.top < listRect.top - slack) {
    list.scrollTop -= listRect.top - itemRect.top
  }
}

export function TransactionPanel({
  customer,
  showCase,
  onToggleCase,
}: {
  customer: CustomerFile
  fired: number
  showCase: boolean
  presenter?: boolean
  onToggleCase: () => void
}) {
  return (
    <section aria-label="Core banking" data-testid="transaction-panel" className="tc-transaction tc-screen tc-left-scroll">
      <CaseFileLink showCase={showCase} onToggleCase={onToggleCase} />
      <div hidden={!showCase}>
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
        <section data-testid="case-file" aria-label="Synthetic case file" className="tc-stack-heading">
          <SectionHeading>Case file</SectionHeading>
          <FactGrid className="tc-kv" label="Case file">
            <Fact term="Tenure">{customer.profile.tenure}</Fact>
            <Fact term="Typical withdrawal">{customer.profile.typicalWithdrawal}</Fact>
            <Fact term="Channels">{customer.profile.channels}</Fact>
          </FactGrid>
        </section>
      </div>
    </section>
  )
}

export function StepCard({
  customer,
  fired,
}: {
  customer: CustomerFile
  fired: number
  presenter?: boolean
}) {
  const current = fired > 0 ? customer.events[fired - 1] : null
  const names = personalNamesFrom(customer.profile.name)
  const direction = useStepDirection(fired, customer.id)
  const elapsed = current ? timelineElapsedMs(customer.events, fired) : 0
  const label = current ? `Step ${fired} · ${formatElapsed(elapsed)} · ${eventSpeaker(current, names)}` : ''
  const text = current ? redactPersonalCopy(current.text, names) : ''
  return (
    <div className="tc-step-card" data-testid={current ? 'demo-event' : undefined} data-kind={current?.kind} hidden={!current}>
      <StepSwap
        stepKey={`${customer.id}:${fired}`}
        direction={direction}
        title={label}
        subtitle={text}
        titleTestId={current ? 'event-marker' : undefined}
        titleClassName="tc-kicker"
        subtitleClassName="tc-prose tc-step-copy"
        testId="step-viewport"
      />
    </div>
  )
}
