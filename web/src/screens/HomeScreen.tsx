import { useState } from 'react'
import type { CSSProperties } from 'react'
import { controlStyle, inputFill } from '../theme/controls'
import type { Library, Mode } from '../types'

const tap: CSSProperties = controlStyle

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
          style={{ ...tap, backgroundColor: mode === 'practice' ? inputFill : 'transparent' }}
          onClick={() => setMode('practice')}
        >
          Practice
        </button>
        <button
          type="button"
          data-testid="mode-live"
          aria-pressed={mode === 'live'}
          style={{ ...tap, backgroundColor: mode === 'live' ? inputFill : 'transparent' }}
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
                style={tap}
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
          style={tap}
          onClick={() => onStartLive()}
        >
          Start
        </button>
      )}
    </section>
  )
}
