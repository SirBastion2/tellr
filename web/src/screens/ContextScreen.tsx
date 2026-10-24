import { useState } from 'react'
import type { Library, SessionState } from '../types'

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
              className="min-h-12 border border-stone-900 px-3"
              onClick={() => toggle(chip.id)}
            >
              {chip.label}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" data-testid="post-context" className="min-h-12 border px-3" onClick={() => onPost?.(selected)}>
        {selected.join(' ')}
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
