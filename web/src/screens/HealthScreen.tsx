import { useEffect, useState } from 'react'
import { apiSend } from '../api'

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
    <section data-testid="health-screen" style={{ display: 'grid', gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>Health</h2>
      <p data-testid="health-config-note">Recommender follows the process config from startup.</p>
      {load.kind === 'unavailable' ? <p data-testid="health-unavailable">Health is unavailable.</p> : null}
      {load.kind === 'invalid' ? <p data-testid="health-invalid">Health response could not be read.</p> : null}
      {report ? (
        <>
          <p>
            Recommender <span data-testid="health-recommender">{report.recommender}</span>
          </p>
          <p>
            Model <span data-testid="health-model">{shown(report.model_id)}</span>
          </p>
          <p>
            p50 <span data-testid="health-p50">{shown(report.p50)}</span>
          </p>
          <p>
            p95 <span data-testid="health-p95">{shown(report.p95)}</span>
          </p>
          <p>
            Last p95 <span data-testid="health-last-p95">{shown(report.last_p95)}</span>
          </p>
          <p>
            Fallback rate <span data-testid="health-fallback">{shown(report.fallback_rate)}</span>
          </p>
          <p>
            Rejections <span data-testid="health-rejections">{shown(report.rejection_count)}</span>
          </p>
          <p>
            Agreement rate <span data-testid="health-agreement">{shown(report.agreement_rate)}</span>
          </p>
        </>
      ) : null}
    </section>
  )
}
