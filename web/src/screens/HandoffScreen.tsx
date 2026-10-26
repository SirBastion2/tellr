import { useState, type ReactNode } from 'react'
import { flaggedSignals, handoffReasonBadge } from '../feed'
import { Fact, FactGrid, PageTitle } from '../ui/facts'
import { LevelIcon } from '../ui/LevelIcon'
import { actorLabel, levelLabel, modeLabel, outcomeLabel, patternValue, shortId, stopReasonLabel, suggestedLabel } from '../ui/plain'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from '../ui/urgencyScore'
import type { HandoffProjection, Level, Library, SessionState } from '../types'

function purposeLabel(library: Library | null, id: string): string {
  return library?.purposes.find((purpose) => purpose.id === id)?.label ?? id
}

type SummaryRow = {
  term: string
  value: string
  testId?: string
  data?: Record<string, string | undefined>
  node?: ReactNode
}

function levelValue(level: Level): ReactNode {
  const word = levelLabel(level)
  return (
    <span data-testid="handoff-level" data-level={level} className="tc-handoff-level"><LevelIcon level={level} />{word}</span>
  )
}

export function handoffSummaryRows(library: Library | null, projection: HandoffProjection): SummaryRow[] {
  const rows: SummaryRow[] = [
    { term: 'Mode', value: modeLabel(projection.mode), testId: 'handoff-mode' },
    { term: 'Questions answered', value: String(projection.answers), testId: 'handoff-answers' },
    { term: 'Level', value: levelLabel(projection.risk.level), node: levelValue(projection.risk.level) },
    { term: URGENCY_SCORE_TERM, value: formatUrgencyScore(projection.risk.score), testId: 'handoff-score' },
    { term: 'Pattern', value: patternValue(projection.risk.pattern_label), testId: 'handoff-pattern' },
  ]
  if (projection.stated_purpose) {
    rows.push({
      term: 'Stated purpose',
      value: purposeLabel(library, projection.stated_purpose),
      testId: 'handoff-purpose',
    })
  }
  rows.push(
    {
      term: 'Suggested outcome',
      value: suggestedLabel(projection.suggested_outcome),
      testId: 'handoff-suggested',
      data: { outcome: projection.suggested_outcome },
    },
    {
      term: "Teller's decision",
      value: projection.outcome === null ? 'Not recorded yet' : outcomeLabel(projection.outcome),
      testId: 'handoff-outcome',
      data: { recorded: projection.outcome === null ? 'false' : 'true' },
    },
    {
      term: 'Recorded by',
      value: actorLabel(projection.actor),
      testId: 'handoff-actor',
      data: { recorded: projection.actor === null ? 'false' : 'true' },
    },
  )
  if (projection.stop) {
    rows.push({
      term: 'Stop',
      value: stopReasonLabel(projection.stop.reason),
      testId: 'handoff-stop',
      data: { kind: projection.stop.kind },
    })
  }
  return rows
}

export function handoffCounterpoint(projection: HandoffProjection): string | null {
  const note = projection.risk.counterpoint
  if (!note) {
    return null
  }
  const lead = projection.risk.level === 'clear' ? 'Still noted' : 'In their favor'
  return `${lead}: ${note.label}`
}

export function handoffDownloadText(
  projection: HandoffProjection,
  rows: readonly SummaryRow[],
  flags: readonly { label: string; status: string }[],
  counterpoint: string | null,
): string {
  const lines = [
    'Handoff',
    shortId(projection.session_id),
    '',
    ...rows.map((row) => `${row.term}: ${row.value}`),
    '',
    'Why it was flagged',
    ...(flags.length > 0 ? flags.flatMap((flag) => [flag.label, flag.status]) : ['Nothing was flagged.']),
  ]
  if (counterpoint) {
    lines.push('', counterpoint)
  }
  return `${lines.join('\n')}\n`
}

function downloadName(id: string): string {
  const safe = shortId(id).replace(/[^A-Za-z0-9._-]+/g, '-')
  return `handoff-${safe || 'case'}.txt`
}

function saveTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function SaveIcon() {
  return (
    <svg className="tc-handoff-save-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M5 3.5h11.2L19.5 6.8V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20V5A1.5 1.5 0 0 1 5 3.5z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M8 3.5V8h7.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 21v-6.2h8V21" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

export function HandoffScreen({
  library,
  projection,
  session = null,
  dismissed = [],
  confirmed = [],
  postedChipIds = [],
}: {
  library: Library | null
  projection: HandoffProjection | null
  session?: SessionState | null
  dismissed?: readonly string[]
  confirmed?: readonly string[]
  postedChipIds?: readonly string[]
}) {
  const [copied, setCopied] = useState(false)
  const rows = projection ? handoffSummaryRows(library, projection) : []
  const signals = flaggedSignals(session, projection, library, dismissed, confirmed, postedChipIds).map(
    (signal) => ({ ...signal, status: handoffReasonBadge(signal.status) }),
  )
  const counterpoint = projection ? handoffCounterpoint(projection) : null
  const caseId = projection ? shortId(projection.session_id) : ''

  function copyCaseId() {
    if (!projection) {
      return
    }
    const write = navigator.clipboard?.writeText(projection.session_id)
    if (!write) {
      return
    }
    void write.then(() => setCopied(true)).catch(() => undefined)
  }

  function saveHandoff() {
    if (!projection) {
      return
    }
    saveTextFile(
      downloadName(projection.session_id),
      handoffDownloadText(projection, rows, signals, counterpoint),
    )
  }

  return (
    <section data-testid="handoff-screen" className="tc-card tc-screen tc-handoff">
      <div className="tc-handoff-head">
        <div className="tc-handoff-heading">
          <PageTitle>Handoff</PageTitle>
          {projection ? (
            <span className="tc-handoff-case" data-testid="handoff-session" title={projection.session_id}>
              {caseId}
            </span>
          ) : null}
        </div>
        {projection ? (
          <div className="tc-handoff-actions">
            <button
              type="button"
              className="tc-btn tc-handoff-copy"
              data-testid="copy-session-id"
              title={projection.session_id}
              onClick={copyCaseId}
            >
              {copied ? 'Copied' : 'Copy to clipboard'}
            </button>
            <button
              type="button"
              className="tc-btn tc-handoff-save"
              data-testid="save-handoff"
              aria-label="Save handoff"
              title="Save handoff"
              onClick={saveHandoff}
            >
              <SaveIcon />
            </button>
          </div>
        ) : null}
      </div>
      {projection ? (
        <div className="tc-handoff-body">
          <FactGrid className="tc-facts tc-handoff-facts" label="Handoff summary">
            {rows.map((row) => (
              <Fact key={row.term} term={row.term} testId={row.testId} data={row.data}>
                {row.node ?? row.value}
              </Fact>
            ))}
          </FactGrid>
          <div className="tc-handoff-flags">
            <h3 className="tc-handoff-why">Why it was flagged</h3>
            {signals.length > 0 ? (
              <ul className="tc-handoff-chips" aria-label="Why it was flagged">
                {signals.map((signal) => (
                  <li
                    key={signal.id}
                    className="tc-handoff-chip"
                    data-testid="handoff-reason"
                    data-id={signal.id}
                    data-status={signal.status}
                  >
                    <span className="tc-handoff-signal">{signal.label}</span>
                    <span className="tc-badge">{signal.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tc-handoff-note">Nothing was flagged.</p>
            )}
            {projection.risk.counterpoint ? (
              <p data-testid="handoff-counterpoint" className="tc-handoff-note">
                <strong>{projection.risk.level === 'clear' ? 'Still noted' : 'In their favor'}:</strong>{' '}
                {projection.risk.counterpoint.label}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
