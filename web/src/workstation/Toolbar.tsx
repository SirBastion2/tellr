import type { CSSProperties } from 'react'
import { formatElapsed } from '../demo/clock'
import type { DemoSpeed, DemoView } from '../demo/types'
import { controlStyle, primaryStyle, secondaryStyle } from '../theme/controls'
import { DENSITY } from '../theme/tokens'
import { PauseIcon, PlayIcon, RestartIcon, StepIcon } from '../ui/icons'

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

const iconButton: CSSProperties = {
  ...control,
  ...secondaryStyle,
  width: controlHeight,
  minWidth: controlHeight,
  padding: 0,
}

const speeds = [1, 2, 4] as const

/** Left arrow steps toward 1×. Right arrow steps toward 4×. */
export function stepPlaybackSpeed(current: DemoSpeed, direction: -1 | 1): DemoSpeed {
  const index = speeds.indexOf(current)
  const next = speeds[index + direction]
  return next ?? current
}

function SpeedArrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path
        d={direction === 'left' ? 'M14.5 6.5 8.5 12l6 5.5' : 'M9.5 6.5 15.5 12l-6 5.5'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
      style={{
        ...control,
        marginLeft: 'auto',
        background: 'transparent',
        color: 'var(--tc-link, var(--tc-text))',
        borderColor: 'transparent',
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
        minWidth: 'var(--tc-case-link-min, 9.5rem)',
      }}
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
        <span className="tc-kicker">Simulated customer</span>
        <select
          id="customer-picker"
          data-testid="customer-picker"
          value={demo.customerId}
          style={{ ...control, minWidth: '12rem' }}
          onChange={(event) => demo.onSelectCustomer(event.target.value)}
        >
          {demo.customers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <div className="tc-toolbar-controls">
        <div className="tc-toolbar-group" role="group" aria-label="Playback">
          <button
            type="button"
            className="tc-btn"
            data-variant="primary"
            data-testid="demo-play"
            title={demo.playing ? 'Pause (P)' : 'Play (P)'}
            aria-pressed={demo.playing}
            data-loading={demo.pending ? 'true' : 'false'}
            aria-busy={demo.pending}
            style={{ ...control, ...primaryStyle, minWidth: 'var(--tc-play-min, 7.5rem)' }}
            onClick={() => (demo.playing ? demo.onPause() : demo.onPlay())}
          >
            {demo.playing ? <PauseIcon /> : <PlayIcon />}
            <span className="tc-play-label">
              <span data-show={demo.playing ? 'false' : 'true'} aria-hidden={demo.playing}>
                Play
              </span>
              <span data-show={demo.playing ? 'true' : 'false'} aria-hidden={!demo.playing}>
                Pause
              </span>
            </span>
          </button>
          <button
            type="button"
            className="tc-btn"
            data-variant="secondary"
            data-testid="demo-step"
            aria-label="Step"
            title="Step (N)"
            style={iconButton}
            onClick={() => demo.onStep()}
          >
            <StepIcon />
          </button>
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
        </div>
        <div
          className="tc-segment tc-h40"
          role="group"
          aria-label="Playback speed. Left arrow slows down. Right arrow speeds up."
          aria-keyshortcuts="ArrowLeft ArrowRight"
          data-testid="speed-control"
        >
          {speeds.map((speed) => {
            const selected = demo.speed === speed
            const slower = speed === speeds[0]
            const faster = speed === speeds[speeds.length - 1]
            return (
              <button
                key={speed}
                type="button"
                className="tc-btn"
                data-variant={selected ? 'primary' : 'secondary'}
                data-testid={`demo-speed-${speed}`}
                aria-pressed={selected}
                aria-label={slower ? `${speed}×, slower` : faster ? `${speed}×, faster` : `${speed}×`}
                title={slower ? 'Slower (Left arrow)' : faster ? 'Faster (Right arrow)' : `${speed}×`}
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
                {slower ? <SpeedArrow direction="left" /> : null}{speed}×{faster ? <SpeedArrow direction="right" /> : null}
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
