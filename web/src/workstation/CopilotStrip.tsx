import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ANSWER_ORIGIN, answerSignalRows } from '../answerSignals'
import { listedChipIds, notesOnlyChip, originText, sourceForChip } from '../feed'
import { controlStyle, primaryStyle, secondaryStyle } from '../theme/controls'
import { DENSITY } from '../theme/tokens'
import { CheckIcon, DismissIcon } from '../ui/icons'
import { LEVEL_WORD, LevelIcon } from '../ui/LevelIcon'
import type { ActivityRow, Library, SessionState } from '../types'
import { Fact, FactGrid } from '../ui/facts'
import { formatUrgencyScore, URGENCY_SCORE_TERM } from '../ui/urgencyScore'
import { ExplanationPanel } from './ExplanationPanel'
import { readExplanation } from './explain'

const controlHeight = `var(--tc-control-h, ${DENSITY.controlHeight})`

function roundIconButton(fill: CSSProperties): CSSProperties {
  return {
    ...controlStyle,
    ...fill,
    width: controlHeight,
    height: controlHeight,
    minWidth: controlHeight,
    minHeight: controlHeight,
    padding: 0,
    display: 'grid',
    placeItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
    lineHeight: 1,
  }
}

const confirmIconButton = roundIconButton(primaryStyle)
const dismissIconButton = roundIconButton(secondaryStyle)

function CopilotHeading() {
  return <h2 className="tc-strip-heading">Copilot</h2>
}

function chipLabel(library: Library | null, id: string): string {
  return library?.context_chips.find((chip) => chip.id === id)?.label ?? id
}

export function suggestedAction(session: SessionState): string {
  const action = session.talk_track.action?.trim() ?? ''
  if (action) {
    return action
  }
  if (session.question?.text) {
    return session.question.text
  }
  return session.talk_track.lines[0] ?? ''
}

function rowState(confirmed: boolean, dismissed: boolean, teller: boolean): 'dismissed' | 'confirmed' | 'auto' {
  if (dismissed) {
    return 'dismissed'
  }
  if (confirmed || teller) {
    return 'confirmed'
  }
  return 'auto'
}

export function CopilotStrip({
  library,
  session,
  postedChipIds,
  confirmed = [],
  dismissed = [],
  chipOrder = [],
  pending,
  idle = false,
  onConfirm,
  onDismiss,
  onRestore,
  onEscalate,
  onUndo,
  closed = false,
  activity = null,
}: {
  library: Library | null
  session: SessionState | null
  postedChipIds: readonly string[]
  confirmed?: readonly string[]
  dismissed?: readonly string[]
  chipOrder?: readonly string[]
  pending: boolean
  idle?: boolean
  onConfirm?: (chipId: string) => void
  onDismiss?: (chipId: string) => void
  onRestore?: (chipId: string) => void
  onEscalate: () => void
  onUndo?: () => void
  closed?: boolean
  activity?: readonly ActivityRow[] | null
}) {
  const [open, setOpen] = useState(false)
  const [wasIdle, setWasIdle] = useState(idle)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  if (idle !== wasIdle) {
    setWasIdle(idle)
    if (idle) {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    function onClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      const toggle = toggleRef.current
      if (toggle?.contains(target)) {
        return
      }
      if (toggle) {
        const rect = toggle.getBoundingClientRect()
        const overToggle =
          rect.width > 0 &&
          rect.height > 0 &&
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        if (overToggle) {
          setOpen(false)
          return
        }
      }
      if (overlayRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [open])

  useLayoutEffect(() => {
    const strip = stripRef.current
    const pin = pinRef.current
    if (!strip || !pin) {
      return
    }
    const sync = () => {
      const top = pin.getBoundingClientRect().bottom - strip.getBoundingClientRect().top - strip.clientTop
      strip.style.setProperty('--tc-explain-pin', `${Math.max(0, top)}px`)
    }
    sync()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync)
    observer?.observe(pin)
    observer?.observe(strip)
    return () => observer?.disconnect()
  }, [idle, session])

  if (idle) {
    return (
      <aside aria-label="Copilot" data-testid="copilot-strip" className="tc-strip" data-idle="true">
        <CopilotHeading />
        <p data-testid="copilot-idle" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Press play to start the simulation.
        </p>
      </aside>
    )
  }

  if (!session) {
    return (
      <aside
        aria-label="Copilot"
        data-testid="copilot-strip"
        className="tc-strip"
        aria-busy={pending}
        data-updating={pending ? 'true' : undefined}
      >
        <CopilotHeading />
        <p data-testid="copilot-updating" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          Updating copilot…
        </p>
      </aside>
    )
  }

  const level = session.risk.level
  const reason = session.risk.reasons[0]?.label ?? session.risk.counterpoint?.label ?? 'No concern flagged'
  const action = suggestedAction(session)
  const tellerChips = listedChipIds(postedChipIds, session.context_chips, dismissed, chipOrder).filter(
    (chipId) => !notesOnlyChip(library, chipId),
  )
  const answerRows = answerSignalRows(readExplanation(session)?.contributions ?? [])

  return (
    <aside
      ref={stripRef}
      aria-label="Copilot"
      data-testid="copilot-strip"
      className="tc-strip"
      data-level={level}
      aria-busy={pending}
      data-updating={pending ? 'true' : undefined}
    >
      {pending ? (
        <p data-testid="copilot-updating" className="tc-strip-updating">
          <span className="tc-inline-spinner" aria-hidden="true" />
          Updating copilot…
        </p>
      ) : null}
      <div className="tc-strip-body" data-dimmed={pending ? 'true' : 'false'}>
      <CopilotHeading />
      <div className="tc-copilot-pin" ref={pinRef}>
        <p data-testid="copilot-level" className="tc-level-badge" data-level={level} style={{ margin: 0 }}>
          <LevelIcon level={level} />{LEVEL_WORD[level]}
        </p>
        <FactGrid label={URGENCY_SCORE_TERM}>
          <Fact term={URGENCY_SCORE_TERM}>
            <span className="tc-score-line">
              <span data-testid="copilot-score" title={URGENCY_SCORE_TERM}>
                {formatUrgencyScore(session.risk.score)}
              </span>
              <button
                type="button"
                ref={toggleRef}
                className="tc-btn"
                data-variant="secondary"
                data-testid="score-explanation"
                aria-expanded={open}
                aria-controls="score-explanation-overlay"
                style={{
                  ...controlStyle,
                  ...secondaryStyle,
                  minHeight: 0,
                  minWidth: 0,
                  height: 'auto',
                  padding: 'var(--tc-space-1, 4px) var(--tc-space-2, 8px)',
                  whiteSpace: 'nowrap',
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  setOpen((value) => !value)
                }}
              >
                Score explanation
              </button>
            </span>
          </Fact>
        </FactGrid>
        <p data-testid="copilot-reason" className="tc-prose" style={{ margin: 0, maxWidth: '70ch' }}>
          {reason}
        </p>
      </div>
      <div
        className="tc-block"
        style={{
          background: 'var(--tc-action-bg)',
          color: 'var(--tc-action-fg)',
          borderRadius: 'var(--tc-radius-card, 16px)',
          padding: 'var(--tc-space-3, 12px)',
          display: 'grid',
          gap: 'var(--tc-space-2, 8px)',
        }}
      >
        <p className="tc-kicker">Suggested action</p>
        <p data-testid="copilot-action" className="tc-prose tc-action-copy" style={{ margin: 0, maxWidth: '70ch' }}>
          {action}
        </p>
      </div>
      <ul aria-label="Signals" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--tc-space-2, 8px)' }}>
        {tellerChips.map((chipId) => {
          const source = sourceForChip(session.context_chips, chipId)
          const wasDismissed = dismissed.includes(chipId)
          const state = rowState(confirmed.includes(chipId), wasDismissed, source === 'teller')
          const label = chipLabel(library, chipId)
          const origin = originText(source, confirmed.includes(chipId))
          const actions = Boolean(!closed && onConfirm && onDismiss)
          return (
            <li
              key={chipId}
              data-testid="signal-row"
              data-chip={chipId}
              data-state={state}
              className="tc-signal-row"
            >
              <span className="tc-signal-meta">
                <span className="tc-signal-label">{label}</span>
                {origin === 'Observed' ? null : (
                  <span data-testid="signal-origin" className="tc-badge">
                    {origin}
                  </span>
                )}
              </span>
              {actions ? (
                wasDismissed ? (
                  <span className="tc-signal-actions">
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="secondary"
                      data-testid="signal-restore"
                      aria-label={`Restore ${label}`}
                      title="Restore signal"
                      style={{ ...controlStyle, ...secondaryStyle }}
                      disabled={pending}
                      onClick={() => onRestore?.(chipId)}
                    >
                      Restore
                    </button>
                  </span>
                ) : (
                  <span className="tc-signal-actions">
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="primary"
                      data-testid="signal-confirm"
                      aria-label={`Confirm ${label}`}
                      title="Confirm signal (C)"
                      style={confirmIconButton}
                      disabled={pending}
                      onClick={() => onConfirm?.(chipId)}
                    >
                      <CheckIcon />
                    </button>
                    <button
                      type="button"
                      className="tc-btn"
                      data-variant="dismiss"
                      data-testid="signal-dismiss"
                      aria-label={`Dismiss ${label}`}
                      title="Dismiss signal (D)"
                      style={dismissIconButton}
                      disabled={pending}
                      onClick={() => onDismiss?.(chipId)}
                    >
                      <DismissIcon />
                    </button>
                  </span>
                )
              ) : null}
            </li>
          )
        })}
        {answerRows.map((row) => (
          <li
            key={row.signal_id}
            data-testid="signal-row"
            data-signal={row.signal_id}
            data-origin="answer"
            data-state="answer"
            className="tc-signal-row"
          >
            <span className="tc-signal-meta">
              <span className="tc-signal-label">{row.label}</span>
              <span data-testid="signal-origin" className="tc-badge">
                {ANSWER_ORIGIN}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {closed ? (
        <p className="tc-prose" style={{ margin: 0 }}>
          This visit is closed.
        </p>
      ) : (
        <div className="tc-copilot-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--tc-space-2, 8px)' }}>
          {onUndo ? (
            <button
              type="button"
              className="tc-btn"
              data-variant="secondary"
              data-testid="undo"
              title="Undo the last signal"
              style={{ ...controlStyle, ...secondaryStyle }}
              disabled={pending}
              onClick={() => onUndo()}
            >
              Undo
            </button>
          ) : null}
          <button
            type="button"
            className="tc-btn"
            data-variant="danger"
            data-testid="escalate"
            title="Escalate to supervisor (E)"
            data-loading={pending ? 'true' : 'false'}
            aria-busy={pending}
            disabled={pending}
            style={{
              ...controlStyle,
              backgroundColor: 'var(--tc-risk-high-bg)',
              color: 'var(--tc-risk-high-fg)',
              borderColor: 'transparent',
              flex: '1 1 12rem',
            }}
            onClick={onEscalate}
          >
            Escalate to supervisor
          </button>
        </div>
      )}
      <div
        id="score-explanation-overlay"
        data-testid="score-explanation-overlay"
        className="tc-explain-overlay"
        hidden={!open}
        ref={overlayRef}
      >
        <div className="tc-explain-overlay-bar">
          <button
            type="button"
            className="tc-btn tc-explain-close"
            data-variant="secondary"
            data-testid="score-explanation-close"
            aria-label="Close score explanation"
            onClick={(event) => {
              event.stopPropagation()
              setOpen(false)
            }}
          >
            Close
          </button>
        </div>
        <div className="tc-explain-overlay-body">
          <ExplanationPanel
            library={library}
            session={session}
            postedChipIds={postedChipIds}
            activity={activity}
          />
        </div>
      </div>
      </div>
    </aside>
  )
}
