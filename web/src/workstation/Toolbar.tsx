import type { CSSProperties } from 'react'
import { formatElapsed } from '../demo/clock'
import type { DemoSpeed, DemoView } from '../demo/types'
import { controlStyle, primaryStyle, secondaryStyle } from '../theme/controls'
import { DENSITY } from '../theme/tokens'
import { PauseIcon, PlayIcon, RestartIcon, StepIcon } from '../ui/icons'

const control: CSSProperties = {
  ...controlStyle,
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  height: DENSITY.controlHeight,
  minHeight: DENSITY.controlHeight,
  boxSizing: 'border-box',
  gap: 8,
  padding: 'var(--tc-space-control-pad-y, 8px) var(--tc-space-control-pad-x, 12px)',
}

const iconButton: CSSProperties = {
  ...control,
  ...secondaryStyle,
  width: DENSITY.controlHeight,
  minWidth: DENSITY.controlHeight,
  padding: 0,
}

const speeds = [1, 2, 4] as const

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
                  borderRadius: 0,
                  borderWidth: 0,
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
        <button
          type="button"
          className="tc-btn tc-case-link"
          data-variant="link"
          data-testid="case-file-toggle"
          aria-pressed={demo.showCase}
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
          onClick={() => demo.onToggleCase()}
        >
          <span className="tc-case-label">
            <span data-show={demo.showCase ? 'false' : 'true'} aria-hidden={demo.showCase}>
              Show case file
            </span>
            <span data-show={demo.showCase ? 'true' : 'false'} aria-hidden={!demo.showCase}>
              Hide case file
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
