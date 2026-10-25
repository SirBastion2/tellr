import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Library, SessionState } from './types'
import { ExplanationPanel } from './workstation/ExplanationPanel'

const library = libraryJson as Library
const session = t1.steps[0]?.response as SessionState

function http(status: number, body: unknown): Promise<{ status: number; text: () => Promise<string> }> {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

describe('Technical details level cutoffs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders GET /health level_bands and does not invent the ranges', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        if (String(input).endsWith('/health')) {
          return http(200, {
            recommender: 'rules',
            model_id: null,
            p50: null,
            p95: null,
            last_p95: null,
            fallback_rate: 0,
            rejection_count: 0,
            agreement_rate: null,
            level_bands: [
              { level: 'clear', label: 'Clear', min: 0, max: 11 },
              { level: 'caution', label: 'Caution', min: 12, max: 77 },
              { level: 'high', label: 'High concern', min: 78, max: 100 },
            ],
          })
        }
        return http(404, null)
      }),
    )

    render(<ExplanationPanel library={library} session={session} postedChipIds={[]} />)
    const technical = screen.getByTestId('technical-details')
    await waitFor(() => {
      expect(screen.getAllByTestId('explain-level-cutoff').map((row) => row.textContent)).toEqual([
        'Clear: 0–11',
        'Caution: 12–77',
        'High concern: 78–100',
      ])
    })
    expect(technical.textContent).not.toMatch(/Clear: 0–24/)
    expect(technical.textContent).not.toMatch(/Caution: 25–59/)
    expect(technical.textContent).not.toMatch(/High concern: 60–100/)
  })
})
