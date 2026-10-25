import type { CSSProperties } from 'react'
import { formatElapsed } from '../demo/clock'
import { customerById } from '../demo/customers'
import type { DemoSpeed, DemoView } from '../demo/types'
import { controlStyle, secondaryStyle } from '../theme/controls'
import { DENSITY } from '../theme/tokens'
import { BackIcon, PauseIcon, PlayIcon, RestartIcon, StepIcon } from '../ui/icons'

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

const speeds = [1, 2, 4] as const

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
  return (
    <div className="tc-mini-transport" role="group" aria-label="Playback">
      <button
        type="button"
        className="tc-btn"
        data-testid="demo-back"
        aria-label="Back"
        title="Previous step"
        onClick={() => demo.onBack?.()}
      >
        <BackIcon />
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
        data-testid="demo-step"
        aria-label="Step"
        title="Step (N)"
        onClick={() => demo.onStep()}
      >
        <StepIcon />
      </button>
    </div>
  )
}

export function PlaybackBar({ demo }: { demo: DemoView }) {
  const customer = customerById(demo.customerId)
  const events = customer?.events ?? []
  return (
    <div className="tc-playback" data-testid="playback-bar">
      <div className="tc-dots" role="group" aria-label="Timeline steps" data-testid="step-dots">
        {events.map((event, index) => {
          const step = index + 1
          const on = demo.index === step
          return (
            <button
              key={event.id}
              type="button"
              className="tc-step-dot"
              data-testid="step-dot"
              data-step={step}
              aria-current={on ? 'step' : undefined}
              aria-label={`Step ${step}`}
              onClick={() => demo.onSeek?.(step)}
            />
          )
        })}
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
        <div className="tc-segment tc-h40" role="group" aria-label="Playback speed" data-testid="speed-control">
          {speeds.map((speed) => {
            const selected = demo.speed === speed
            return (
              <button
                key={speed}
                type="button"
                className="tc-btn"
                data-variant={selected ? 'primary' : 'secondary'}
                data-testid={`demo-speed-${speed}`}
                aria-pressed={selected}
                style={{
                  ...control,
                  borderWidth: 0,
                  alignSelf: 'stretch',
                  height: '100%',
                  minHeight: 0,
                  padding: '0 var(--tc-space-control-pad-x, 12px)',
                  minWidth: 'var(--tc-speed-min, 2.75rem)',
                  fontVariantNumeric: 'tabular-nums',
                  backgroundColor: selected ? 'var(--tc-button)' : 'var(--tc-secondary-bg)',
                  color: selected ? 'var(--tc-button-text)' : 'var(--tc-secondary-fg)',
                }}
                onClick={() => demo.onSpeed(speed as DemoSpeed)}
              >
                {speed}×
              </button>
            )
          })}
        </div>
        <p data-testid="elapsed-timer" aria-label="Elapsed time" className="tc-timer">
          {formatElapsed(demo.elapsedMs)}
        </p>
      </div>
    </div>
  )
}
