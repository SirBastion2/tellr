import type { CSSProperties } from 'react'
import { formatElapsed } from '../demo/clock'
import type { DemoSpeed, DemoView } from '../demo/types'
import { controlStyle, linkStyle, primaryStyle, secondaryStyle } from '../theme/controls'
import { PauseIcon, PlayIcon, RestartIcon, StepIcon } from '../ui/icons'

const iconButton: CSSProperties = {
  ...controlStyle,
  ...secondaryStyle,
  width: 48,
  padding: 0,
}

const speeds = [1, 2, 4] as const

export function SimulationToolbar({ demo }: { demo: DemoView }) {
  return (
    <div className="tc-toolbar" role="toolbar" aria-label="Simulation" data-testid="demo-toolbar">
      <div className="tc-toolbar-group">
        <label
          htmlFor="customer-picker"
          style={{
            display: 'grid',
            gap: 4,
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Simulated customer
          <select
            id="customer-picker"
            data-testid="customer-picker"
            value={demo.customerId}
            style={controlStyle}
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
          style={{ ...controlStyle, ...primaryStyle, minWidth: 112, gap: 8 }}
          onClick={() => (demo.playing ? demo.onPause() : demo.onPlay())}
        >
          {demo.playing ? <PauseIcon /> : <PlayIcon />}
          <span>{demo.playing ? 'Pause' : 'Play'}</span>
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
      <div className="tc-segment" role="group" aria-label="Playback speed" data-testid="speed-control">
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
                ...controlStyle,
                borderRadius: 0,
                borderWidth: 0,
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
      {demo.presenter ? (
        <p
          data-testid="elapsed-timer"
          aria-label="Elapsed time"
          style={{ margin: 0, fontVariantNumeric: 'tabular-nums', fontWeight: 600, minWidth: '4ch' }}
        >
          {formatElapsed(demo.elapsedMs)}
        </p>
      ) : null}
      <button
        type="button"
        className="tc-btn"
        data-variant="link"
        data-testid="case-file-toggle"
        aria-pressed={demo.showCase}
        style={{ ...linkStyle, marginLeft: 'auto' }}
        onClick={() => demo.onToggleCase()}
      >
        {demo.showCase ? 'Hide case file' : 'Show case file'}
      </button>
    </div>
  )
}
