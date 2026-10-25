import type { CSSProperties, ReactNode } from 'react'

const termStyle: CSSProperties = {
  margin: 0,
}

const valueStyle: CSSProperties = {
  margin: 0,
  minWidth: 0,
}

export function FactGrid({
  children,
  label,
  className = 'tc-facts',
}: {
  children: ReactNode
  label?: string
  className?: string
}) {
  return (
    <dl className={className} aria-label={label}>
      {children}
    </dl>
  )
}

export function Fact({
  term,
  testId,
  data,
  children,
}: {
  term: string
  testId?: string
  data?: Record<string, string | undefined>
  children: ReactNode
}) {
  const extra: Record<string, string> = {}
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        extra[`data-${key}`] = value
      }
    }
  }
  return (
    <>
      <dt className="tc-fact-term" style={termStyle}>
        {term}
      </dt>
      <dd className="tc-fact-value" style={valueStyle} data-testid={testId} {...extra}>
        {children}
      </dd>
    </>
  )
}

export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="tc-section-heading">
      {children}
    </h3>
  )
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h2 className="tc-title">{children}</h2>
}
