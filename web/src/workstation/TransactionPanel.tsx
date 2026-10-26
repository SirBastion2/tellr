import { useEffect, useState } from 'react'
import { formatElapsed, timelineElapsedMs } from '../demo/clock'
import type { CustomerEvent, CustomerFile } from '../demo/customers'
import { Emphasis } from '../ui/emphasis'
import { Fact, FactGrid, SectionHeading } from '../ui/facts'
import { displaySpeaker, personalNamesFrom, redactPersonalCopy } from '../ui/privacy'
import { StepSwap, useStepDirection } from './StepSwap'

function eventSpeaker(event: CustomerEvent, names: readonly string[]): string {
  return displaySpeaker(event.kind, event.speaker, names)
}

/** The card labels the step on screen with its real step number, counting up as the demo plays. */
function stepStamp(customer: CustomerFile, fired: number): { stamp: string; text: string } {
  const names = personalNamesFrom(customer.profile.name)
  const current = customer.events[fired - 1]
  if (!current) {
    return { stamp: 'Customer File', text: '' }
  }
  const elapsed = timelineElapsedMs(customer.events, fired)
  return {
    stamp: `Step ${fired} · ${formatElapsed(elapsed)} · ${eventSpeaker(current, names)}`,
    text: redactPersonalCopy(current.text, names),
  }
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
  fired,
}: {
  customer: CustomerFile
  fired: number
  showCase?: boolean
  presenter?: boolean
  playing?: boolean
  onToggleCase?: () => void
}) {
  const current = fired > 0 ? customer.events[fired - 1] : null
  const direction = useStepDirection(fired, customer.id)
  const { stamp, text } = stepStamp(customer, fired)

  return (
    <section aria-label="Core banking" data-testid="transaction-panel" className="tc-transaction tc-screen tc-left-scroll">
      <div
        className={current ? 'tc-step-zone tc-step-block' : 'tc-step-zone tc-step-block tc-step-block-idle'}
        data-testid={current ? 'demo-event' : undefined}
        data-kind={current?.kind}
      >
        {current ? (
          <StepSwap
            stepKey={`${customer.id}:${fired}`}
            direction={direction}
            title={stamp}
            subtitle={text}
            titleTestId="event-caption"
            markerTestId="event-marker"
            titleClassName="tc-step-title"
            subtitleClassName="tc-prose tc-step-caption"
            testId="step-viewport"
          />
        ) : (
          <p data-testid="event-caption" className="tc-step-title">
            Customer File
          </p>
        )}
      </div>
      <div className="tc-case-half">
        <FactGrid className="tc-kv tc-bottom-facts" label="Transaction">
          <Fact term="Type">
            <span data-testid="txn-type">{customer.transaction.type}</span>
          </Fact>
          <Fact term="Amount">
            <span data-testid="txn-amount" className="tc-amount">
              {customer.transaction.amount}
            </span>
          </Fact>
          <Fact term="Memo">
            <span className="tc-prose">
              <Emphasis text={customer.transaction.memo} />
            </span>
          </Fact>
        </FactGrid>
        <section data-testid="case-file" aria-label="Synthetic case file" className="tc-case-file">
          <SectionHeading>Case file</SectionHeading>
          <FactGrid className="tc-kv tc-case-grid" label="Case file">
            <Fact term="Tenure">{customer.profile.tenure}</Fact>
            <Fact term="Typical withdrawal">{customer.profile.typicalWithdrawal}</Fact>
            <Fact term="Channels">{customer.profile.channels}</Fact>
          </FactGrid>
        </section>
      </div>
    </section>
  )
}

const STEP_REVEAL_MS = 2500

export function StepCard({
  customer,
  fired,
  playing = false,
}: {
  customer: CustomerFile
  fired: number
  presenter?: boolean
  playing?: boolean
}) {
  const current = fired > 0 ? customer.events[fired - 1] : null
  const direction = useStepDirection(fired, customer.id)
  const { stamp, text } = stepStamp(customer, fired)
  const label = current ? stamp : 'Customer File'
  const [seen, setSeen] = useState({ customer: customer.id, fired })
  const [pulse, setPulse] = useState(false)
  if (seen.customer !== customer.id) {
    setSeen({ customer: customer.id, fired })
    if (pulse) {
      setPulse(false)
    }
  } else if (seen.fired !== fired) {
    setSeen({ customer: customer.id, fired })
    setPulse(playing && fired > 0)
  }

  useEffect(() => {
    if (!pulse) {
      return
    }
    const timer = window.setTimeout(() => setPulse(false), STEP_REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [pulse, fired, customer.id])

  return (
    <div
      className="tc-step-card"
      data-testid={current ? 'demo-event' : undefined}
      data-kind={current?.kind}
      data-revealed={pulse ? 'pulse' : 'idle'}
      aria-live="polite"
      aria-atomic="true"
      hidden={!current}
    >
      <StepSwap
        stepKey={`${customer.id}:${fired}`}
        direction={direction}
        title={label}
        subtitle={text}
        titleTestId="event-caption"
        markerTestId={current ? 'event-marker' : undefined}
        titleClassName="tc-kicker"
        subtitleClassName="tc-prose tc-step-copy"
        testId="step-viewport"
      />
    </div>
  )
}
