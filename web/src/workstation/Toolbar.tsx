import type { CSSProperties } from 'react'
import { formatElapsed } from '../demo/clock'
import { customerById } from '../demo/customers'
import type { DemoSpeed, DemoView } from '../demo/types'
import { controlStyle, secondaryStyle } from '../theme/controls'
import { DENSITY } from '../theme/tokens'
import { PauseIcon, PlayIcon, RestartIcon, SpeedDownIcon, SpeedUpIcon } from '../ui/icons'

const controlHeight = `var(--tc-control-h, ${DENSITY.controlHeight})`

const control: CSSProperties = {
  ...controlStyle,
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  height: controlHeight,
  minHeight: controlHeight,
  boxSizing: 'border-box',
  gap: 'var(--tc-space-2, 8px)',
  padding: 'var(--tc-space-control-pad-y, 8px) var(--tc-space-control-pad-x, 12px)',
}

const compactLink: CSSProperties = {
  ...controlStyle,
  display: 'inline-flex',
  alignItems: 'center',
  height: 'auto',
  minHeight: 0,
  minWidth: 0,
  padding: 0,
  background: 'transparent',
  color: 'var(--tc-link, var(--tc-text))',
  borderColor: 'transparent',
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
}

const iconButton: CSSProperties = {
  ...control,
  ...secondaryStyle,
  width: controlHeight,
  minWidth: controlHeight,
  padding: 0,
}

const SPEED_STEPS = [1, 2, 4] as const

function faster(speed: DemoSpeed): DemoSpeed {
  const at = SPEED_STEPS.indexOf(speed)
  return SPEED_STEPS[Math.min(SPEED_STEPS.length - 1, at + 1)] ?? speed
}

function slower(speed: DemoSpeed): DemoSpeed {
  const at = SPEED_STEPS.indexOf(speed)
  return SPEED_STEPS[Math.max(0, at - 1)] ?? speed
}

export function CaseFileLink({
  showCase,
  onToggleCase,
}: {
  showCase: boolean
  onToggleCase: () => void
}) {
  return (
    <button
      type="button"
      className="tc-btn tc-case-link"
      data-variant="link"
      data-testid="case-file-toggle"
      aria-pressed={showCase}
      style={compactLink}
      onClick={() => onToggleCase()}
    >
      <span className="tc-case-label">
        <span data-show={showCase ? 'false' : 'true'} aria-hidden={showCase}>
          Show case file
        </span>
        <span data-show={showCase ? 'true' : 'false'} aria-hidden={!showCase}>
          Hide case file
        </span>
      </span>
    </button>
  )
}

export function SimulationToolbar({ demo }: { demo: DemoView }) {
  return (
    <div className="tc-toolbar" role="toolbar" aria-label="Simulation" data-testid="demo-toolbar">
      <label htmlFor="customer-picker" className="tc-toolbar-customer">
        <select
          id="customer-picker"
          data-testid="customer-picker"
          aria-label="Simulated customer"
          value={demo.customerId}
          onChange={(event) => demo.onSelectCustomer(event.target.value)}
        >
          {demo.customers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function MiniTransport({ demo }: { demo: DemoView }) {
  const atMax = demo.speed >= 4
  const atBase = demo.speed <= 1
  return (
    <div className="tc-mini-transport" role="group" aria-label="Playback" data-testid="demo-transport">
      <button
        type="button"
        className="tc-btn"
        data-testid="demo-speed-up"
        aria-label="Faster"
        title="Faster"
        disabled={atMax}
        onClick={() => {
          if (atMax) {
            return
          }
          demo.onSpeed(faster(demo.speed))
        }}
      >
        <SpeedUpIcon />
      </button>
      <button
        type="button"
        className="tc-btn"
        data-testid="demo-play"
        title={demo.playing ? 'Pause (P)' : 'Play (P)'}
        aria-label={demo.playing ? 'Pause' : 'Play'}
        aria-pressed={demo.playing}
        data-loading={demo.pending ? 'true' : 'false'}
        aria-busy={demo.pending}
        onClick={() => (demo.playing ? demo.onPause() : demo.onPlay())}
      >
        {demo.playing ? <PauseIcon /> : <PlayIcon />}
        <span className="tc-play-label" aria-hidden="true">
          <span data-show={demo.playing ? 'false' : 'true'}>Play</span>
          <span data-show={demo.playing ? 'true' : 'false'}>Pause</span>
        </span>
      </button>
      <button
        type="button"
        className="tc-btn"
        data-testid="demo-speed-down"
        aria-label="Slower"
        title="Slower"
        disabled={atBase}
        onClick={() => {
          if (atBase) {
            return
          }
          demo.onSpeed(slower(demo.speed))
        }}
      >
        <SpeedDownIcon />
      </button>
      {demo.speed > 1 ? (
        <span className="tc-speed-label" data-testid="playback-speed">
          {demo.speed}×
        </span>
      ) : null}
      <button type="button" className="tc-sr" data-testid="demo-step" aria-label="Step" onClick={() => demo.onStep()}>
        Step
      </button>
    </div>
  )
}

export function PlaybackBar({ demo }: { demo: DemoView }) {
  const customer = customerById(demo.customerId)
  const events = customer?.events ?? []
  const shown = events.length > 0 ? Math.max(demo.index, 1) : 0
  const dot = (step: number) => {
    const event = events[step - 1]
    if (!event) {
      return null
    }
    const state = step < shown ? 'past' : step === shown ? 'current' : 'future'
    return (
      <button
        key={event.id}
        type="button"
        className="tc-step-dot"
        data-testid="step-dot"
        data-step={step}
        data-state={state}
        aria-current={state === 'current' ? 'step' : undefined}
        aria-label={`Step ${step}`}
        onClick={() => demo.onSeek?.(step)}
      />
    )
  }
  const chronological = Array.from({ length: events.length }, (_, i) => i + 1)
  return (
    <div className="tc-playback" data-testid="playback-bar">
      <div className="tc-timeline-row">
        <div className="tc-dots" role="group" aria-label="Timeline steps" data-testid="step-dots">
          <MiniTransport demo={demo} />
          {chronological.map((step) => dot(step))}
        </div>
      </div>
      <div className="tc-footer-utilities" aria-label="Playback extras">
        <button
          type="button"
          className="tc-btn"
          data-variant="secondary"
          data-testid="demo-restart"
          aria-label="Restart"
          title="Restart (R)"
          style={iconButton}
          onClick={() => demo.onRestart()}
        >
          <RestartIcon />
        </button>
        <p data-testid="elapsed-timer" aria-label="Elapsed time" className="tc-timer">
          {formatElapsed(demo.elapsedMs)}
        </p>
      </div>
    </div>
  )
}
