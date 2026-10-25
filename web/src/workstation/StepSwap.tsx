import { useState, type ReactNode } from 'react'
import { Emphasis } from '../ui/emphasis'

export type StepDirection = 'none' | 'forward' | 'back'

/** Direction of the latest step change. `scope` resets the direction when the customer changes. */
export function useStepDirection(step: number, scope: string): StepDirection {
  const [seen, setSeen] = useState({ step, scope })
  const [direction, setDirection] = useState<StepDirection>('none')
  if (scope !== seen.scope) {
    setSeen({ step, scope })
    setDirection('none')
  } else if (step !== seen.step) {
    setDirection(step > seen.step ? 'forward' : 'back')
    setSeen({ step, scope })
  }
  return direction
}

type Frame = { key: string; title: string; subtitle: string }

/**
 * One step in view. Forward: the new step drops in from the top and the previous
 * step leaves through the bottom. Back reverses that. Reduced motion is CSS-only.
 */
export function StepSwap({
  stepKey,
  direction,
  title,
  subtitle = '',
  titleTestId,
  markerTestId,
  titleClassName,
  subtitleClassName = 'tc-prose tc-step-subtitle',
  testId,
}: {
  stepKey: string
  direction: StepDirection
  title: string
  subtitle?: string
  titleTestId?: string
  markerTestId?: string
  titleClassName: string
  subtitleClassName?: string
  testId?: string
}) {
  const [frame, setFrame] = useState<Frame>({ key: stepKey, title, subtitle })
  const [exit, setExit] = useState<Frame | null>(null)
  const [dir, setDir] = useState<StepDirection>('none')

  if (stepKey !== frame.key) {
    setExit(direction === 'none' ? null : frame)
    setFrame({ key: stepKey, title, subtitle })
    setDir(direction === 'none' ? 'forward' : direction)
  }

  return (
    <div className="tc-step-viewport" data-testid={testId} data-motion={dir}>
      {exit ? (
        <div className="tc-step-swap" data-phase="exit" data-dir={dir}>
          <Slide title={exit.title} subtitle={exit.subtitle} titleClassName={titleClassName} subtitleClassName={subtitleClassName} />
        </div>
      ) : null}
      <div className="tc-step-swap" data-phase="enter" data-dir={dir === 'none' ? undefined : dir}>
        <Slide
          title={frame.title}
          subtitle={frame.subtitle}
          titleTestId={titleTestId}
          markerTestId={markerTestId}
          titleClassName={titleClassName}
          subtitleClassName={subtitleClassName}
        />
      </div>
    </div>
  )
}

function Slide({
  title,
  subtitle,
  titleTestId,
  markerTestId,
  titleClassName,
  subtitleClassName,
}: {
  title: string
  subtitle: string
  titleTestId?: string
  markerTestId?: string
  titleClassName: string
  subtitleClassName: string
}): ReactNode {
  return (
    <>
      <p data-testid={titleTestId} className={titleClassName}>
        {markerTestId ? (
          <span data-testid={markerTestId}>
            <Emphasis text={title} />
          </span>
        ) : (
          <Emphasis text={title} />
        )}
      </p>
      {subtitle ? (
        <p className={subtitleClassName}>
          <Emphasis text={subtitle} />
        </p>
      ) : null}
    </>
  )
}
