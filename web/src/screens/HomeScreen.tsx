import { useState } from 'react'
import type { Library, Mode } from '../types'

export function HomeScreen({
  library,
  scenarios,
  onStartPractice,
  onStartLive,
}: {
  library: Library | null
  scenarios: readonly { id: string; label?: string }[]
  onStartPractice: (scenarioId: string) => void
  onStartLive: () => void
}) {
  const [mode, setMode] = useState<Mode>('practice')

  return (
    <section data-testid="home-screen" className="space-y-4">
      {library ? (
        <>
          <p data-testid="library-version">{library.library_version}</p>
          <p data-testid="copy-status">{library.copy_status}</p>
        </>
      ) : null}
      <div data-testid="mode-picker" className="flex gap-2">
        <button
          type="button"
          data-testid="mode-practice"
          aria-pressed={mode === 'practice'}
          className="min-h-12 border border-stone-900 px-4"
          onClick={() => setMode('practice')}
        >
          Practice
        </button>
        <button
          type="button"
          data-testid="mode-live"
          aria-pressed={mode === 'live'}
          className="min-h-12 border border-stone-900 px-4"
          onClick={() => setMode('live')}
        >
          Live
        </button>
      </div>
      {mode === 'practice' ? (
        <ul data-testid="scenario-picker" className="flex flex-wrap gap-2">
          {scenarios.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                data-testid={`scenario-${item.id}`}
                className="min-h-12 border border-stone-900 px-4"
                onClick={() => onStartPractice(item.id)}
              >
                {item.label ?? item.id}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          data-testid="start-live"
          className="min-h-12 border border-stone-900 px-4"
          onClick={() => onStartLive()}
        >
          Start
        </button>
      )}
    </section>
  )
}
