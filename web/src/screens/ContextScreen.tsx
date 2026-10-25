import { useState } from 'react'
import type { CSSProperties } from 'react'
import { controlStyle, inputFill, primaryStyle } from '../theme/controls'
import { Fact, FactGrid, PageTitle, SectionHeading } from '../ui/facts'
import { LEVEL_WORD } from '../ui/LevelIcon'
import { shortId } from '../ui/plain'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from '../ui/urgencyScore'
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
    <section data-testid="context-screen" className="tc-card">
      <PageTitle>What you noticed</PageTitle>
      <p style={{ margin: 0 }}>Add what you see at the window. This screen does not score the visit.</p>
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
        Add to this visit
      </button>
      {session ? (
        <>
          <SectionHeading>This visit</SectionHeading>
          <FactGrid>
            <Fact term="Session" testId="session-id">
              <span title={session.session_id}>{shortId(session.session_id)}</span>
            </Fact>
            <Fact term="Level" testId="risk-level">
              {LEVEL_WORD[session.risk.level]}
            </Fact>
            <Fact term={URGENCY_SCORE_TERM} testId="risk-score">
              {formatUrgencyScore(session.risk.score)}
            </Fact>
          </FactGrid>
        </>
      ) : null}
    </section>
  )
}
