import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Library, SessionState } from '../types'

const tap: CSSProperties = {
  minHeight: '48px',
  minWidth: '48px',
  boxSizing: 'border-box',
  color: '#1c1917',
  border: '1px solid #1c1917',
  backgroundColor: 'transparent',
  padding: '0 12px',
}

export function ContextScreen({
  library,
  session,
  postedChipIds = [],
  onPost,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds?: readonly string[]
  onPost?: (chips: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <section data-testid="context-screen" className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        {(library?.context_chips ?? []).map((chip) => (
          <li key={chip.id}>
            <button
              type="button"
              data-testid="context-chip"
              data-posted={postedChipIds.includes(chip.id) ? 'true' : 'false'}
              data-selected={selected.includes(chip.id) ? 'true' : 'false'}
              aria-pressed={selected.includes(chip.id)}
              style={{
                ...tap,
                backgroundColor: selected.includes(chip.id) ? '#e7e5e4' : 'transparent',
              }}
              onClick={() => toggle(chip.id)}
            >
              {chip.label}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" data-testid="post-context" style={tap} onClick={() => onPost?.(selected)}>
        Add
      </button>
      {session ? (
        <>
          <p data-testid="session-id">{session.session_id}</p>
          <p data-testid="risk-level">{session.risk.level}</p>
          <p data-testid="risk-score">{session.risk.score}</p>
        </>
      ) : null}
    </section>
  )
}
