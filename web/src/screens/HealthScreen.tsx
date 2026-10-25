import { useEffect, useState } from 'react'
import { apiSend } from '../api'
import { Fact, FactGrid, PageTitle } from '../ui/facts'
import { recommenderTitle } from '../ui/plain'

export type HealthReport = {
  recommender: string
  model_id: string | null
  p50: number | null
  p95: number | null
  last_p95: number | null
  fallback_rate: number
  rejection_count: number
  agreement_rate: number | null
}

type HealthLoad =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'invalid' }
  | { kind: 'ready'; report: HealthReport }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberOrNull(value: unknown): number | null | undefined {
  if (value === null) {
    return null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return undefined
}

export function readHealth(body: unknown): HealthReport | null {
  if (!isRecord(body) || typeof body.recommender !== 'string') {
    return null
  }
  if (body.model_id !== null && typeof body.model_id !== 'string') {
    return null
  }
  const p50 = numberOrNull(body.p50)
  const p95 = numberOrNull(body.p95)
  const lastP95 = numberOrNull(body.last_p95)
  const agreement = numberOrNull(body.agreement_rate)
  if (p50 === undefined || p95 === undefined || lastP95 === undefined || agreement === undefined) {
    return null
  }
  if (typeof body.fallback_rate !== 'number' || !Number.isFinite(body.fallback_rate)) {
    return null
  }
  if (typeof body.rejection_count !== 'number' || !Number.isFinite(body.rejection_count)) {
    return null
  }
  return {
    recommender: body.recommender,
    model_id: body.model_id,
    p50,
    p95,
    last_p95: lastP95,
    fallback_rate: body.fallback_rate,
    rejection_count: body.rejection_count,
    agreement_rate: agreement,
  }
}

function shown(value: number | string | null): string {
  if (value === null) {
    return ''
  }
  return String(value)
}

export function HealthScreen() {
  const [load, setLoad] = useState<HealthLoad>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await apiSend('GET', '/health')
        if (cancelled) {
          return
        }
        if (result.status !== 200) {
          setLoad({ kind: 'unavailable' })
          return
        }
        const report = readHealth(result.body)
        setLoad(report === null ? { kind: 'invalid' } : { kind: 'ready', report })
      } catch {
        if (!cancelled) {
          setLoad({ kind: 'unavailable' })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const report = load.kind === 'ready' ? load.report : null

  return (
    <section data-testid="health-screen" className="tc-card">
      <PageTitle>Health</PageTitle>
      <p data-testid="health-config-note" className="tc-prose">
        The decision engine follows the setup from startup. This screen does not change it.
      </p>
      {load.kind === 'unavailable' ? (
        <p data-testid="health-unavailable" className="tc-prose">
          Health is unavailable.
        </p>
      ) : null}
      {load.kind === 'invalid' ? (
        <p data-testid="health-invalid" className="tc-prose">
          Health response could not be read.
        </p>
      ) : null}
      {report ? (
        <FactGrid label="Service health">
          <Fact term="Decision engine" testId="health-recommender" data={{ recommender: report.recommender }}>
            {recommenderTitle(report.recommender)}
          </Fact>
          <Fact term="Model" testId="health-model">
            {shown(report.model_id) || 'None'}
          </Fact>
          <Fact term="Typical response" testId="health-p50">
            {shown(report.p50)}
          </Fact>
          <Fact term="Slow response" testId="health-p95">
            {shown(report.p95)}
          </Fact>
          <Fact term="Last slow response" testId="health-last-p95">
            {shown(report.last_p95)}
          </Fact>
          <Fact term="Fallback rate" testId="health-fallback">
            {shown(report.fallback_rate)}
          </Fact>
          <Fact term="Rejections" testId="health-rejections">
            {shown(report.rejection_count)}
          </Fact>
          <Fact term="Agreement with the rules" testId="health-agreement">
            {shown(report.agreement_rate)}
          </Fact>
        </FactGrid>
      ) : null}
    </section>
  )
}
