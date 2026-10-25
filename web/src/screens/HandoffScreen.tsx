import { useState } from 'react'
import { controlStyle, secondaryStyle } from '../theme/controls'
import { Fact, FactGrid, PageTitle, SectionHeading } from '../ui/facts'
import { LevelIcon } from '../ui/LevelIcon'
import { actorLabel, handoffTitle, levelLabel, modeLabel, outcomeLabel, patternValue, shortId, suggestedLabel } from '../ui/plain'
import type { HandoffProjection, Library } from '../types'

function purposeLabel(library: Library | null, id: string): string {
  return library?.purposes.find((purpose) => purpose.id === id)?.label ?? id
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span data-testid="handoff-session" title={id}>
        {shortId(id)}
      </span>
      <button
        type="button"
        className="tc-btn"
        data-variant="secondary"
        data-testid="copy-session-id"
        title={id}
        aria-label={`Copy session id ${id}`}
        style={{ ...controlStyle, ...secondaryStyle }}
        onClick={() => {
          const write = navigator.clipboard?.writeText(id)
          if (!write) {
            return
          }
          void write.then(() => setCopied(true)).catch(() => undefined)
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}

export function HandoffScreen({
  library,
  projection,
}: {
  library: Library | null
  projection: HandoffProjection | null
}) {
  return (
    <section data-testid="handoff-screen" className="tc-card">
      <PageTitle>{projection ? handoffTitle(projection.outcome, projection.actor) : 'Handoff'}</PageTitle>
      {projection ? (
        <>
          <FactGrid label="Handoff summary">
            <Fact term="Session">
              <CopyId id={projection.session_id} />
            </Fact>
            <Fact term="Mode" testId="handoff-mode">
              {modeLabel(projection.mode)}
            </Fact>
            <Fact term="Questions answered" testId="handoff-answers">
              {projection.answers}
            </Fact>
            <Fact term="Level">
              <span data-testid="handoff-level" data-level={projection.risk.level} className="tc-level-badge"><LevelIcon level={projection.risk.level} />{levelLabel(projection.risk.level)}</span>
            </Fact>
            <Fact term="Score" testId="handoff-score">
              {projection.risk.score}
            </Fact>
            <Fact term="Pattern" testId="handoff-pattern">
              {patternValue(projection.risk.pattern_label)}
            </Fact>
            {projection.stated_purpose ? (
              <Fact term="Stated purpose" testId="handoff-purpose">
                {purposeLabel(library, projection.stated_purpose)}
              </Fact>
            ) : null}
            <Fact term="Suggested outcome" testId="handoff-suggested" data={{ outcome: projection.suggested_outcome }}>
              {suggestedLabel(projection.suggested_outcome)}
            </Fact>
            <Fact
              term="Teller's decision"
              testId="handoff-outcome"
              data={{ recorded: projection.outcome === null ? 'false' : 'true' }}
            >
              {projection.outcome === null ? 'Not recorded yet' : outcomeLabel(projection.outcome)}
            </Fact>
            <Fact term="Recorded by" testId="handoff-actor" data={{ recorded: projection.actor === null ? 'false' : 'true' }}>
              {actorLabel(projection.actor)}
            </Fact>
            {projection.stop ? (
              <Fact term="Stop" testId="handoff-stop" data={{ kind: projection.stop.kind }}>
                {projection.stop.reason}
              </Fact>
            ) : null}
          </FactGrid>
          <SectionHeading>Why it was flagged</SectionHeading>
          {projection.risk.reasons.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: 6 }}>
              {projection.risk.reasons.map((reason) => (
                <li key={reason.id} data-testid="handoff-reason">
                  <strong>{reason.label}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0 }}>Nothing was flagged.</p>
          )}
          {projection.risk.counterpoint ? (
            <p data-testid="handoff-counterpoint" style={{ margin: 0 }}>
              <strong>{projection.risk.level === 'clear' ? 'Still noted' : 'In their favor'}:</strong>{' '}
              {projection.risk.counterpoint.label}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
