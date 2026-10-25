import { useState } from 'react'
import type { CSSProperties } from 'react'
import { controlStyle, inputFill, primaryStyle } from '../theme/controls'
import { LEVEL_WORD } from '../ui/LevelIcon'
import type { Library, SessionState } from '../types'

const tap: CSSProperties = controlStyle

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
    <section data-testid="context-screen" style={{ display: 'grid', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>Context</h2>
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
                backgroundColor: selected.includes(chip.id) ? inputFill : 'transparent',
              }}
              onClick={() => toggle(chip.id)}
            >
              {chip.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="tc-btn"
        data-variant="primary"
        data-testid="post-context"
        style={{ ...tap, ...primaryStyle }}
        onClick={() => onPost?.(selected)}
      >
        Add
      </button>
      {session ? (
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0 }}>
          <dt>Session</dt>
          <dd data-testid="session-id" style={{ margin: 0 }}>
            {session.session_id}
          </dd>
          <dt>Level</dt>
          <dd data-testid="risk-level" style={{ margin: 0 }}>
            {LEVEL_WORD[session.risk.level]}
          </dd>
          <dt>Score</dt>
          <dd data-testid="risk-score" style={{ margin: 0 }}>
            {session.risk.score}
          </dd>
        </dl>
      ) : null}
    </section>
  )
}
