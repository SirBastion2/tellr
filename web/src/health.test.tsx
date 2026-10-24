import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HealthScreen } from './screens/HealthScreen'

const health = {
  recommender: 'local_llm',
  model_id: 'Llama-3.1-8B-Instruct-Q4_K_M',
  p50: 367,
  p95: 420,
  last_p95: 420,
  fallback_rate: 0,
  rejection_count: 0,
  agreement_rate: 0.909,
}

function http(status: number, body: unknown): Promise<{ status: number; text: () => Promise<string> }> {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

describe('Health screen', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('shows /health read-only and does not switch the recommender', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const calls: { url: string; method: string }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = (init?.method ?? 'GET').toUpperCase()
        calls.push({ url, method })
        if (method === 'GET' && url === 'http://api.test/health') {
          return http(200, health)
        }
        return http(404, null)
      }),
    )

    render(<HealthScreen />)

    await waitFor(() => {
      expect(screen.getByTestId('health-recommender').textContent).toBe('local_llm')
    })
    expect(screen.getByTestId('health-model').textContent).toBe(health.model_id)
    expect(screen.getByTestId('health-last-p95').textContent).toBe('420')
    expect(screen.getByTestId('health-p50').textContent).toBe('367')
    expect(screen.getByTestId('health-p95').textContent).toBe('420')
    expect(screen.getByTestId('health-fallback').textContent).toBe('0')
    expect(screen.getByTestId('health-rejections').textContent).toBe('0')
    expect(screen.getByTestId('health-agreement').textContent).toBe('0.909')
    expect(screen.getByTestId('health-config-note').textContent).toMatch(/startup/i)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(calls).toEqual([{ url: 'http://api.test/health', method: 'GET' }])
    expect(calls.some((call) => call.url.includes('/settings'))).toBe(false)
  })
})
