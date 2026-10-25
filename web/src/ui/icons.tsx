import type { ReactNode } from 'react'

type IconProps = { size?: number }

function Svg({ size = 18, children }: { size?: number; children: ReactNode }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  )
}

export function PlayIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M9 6.5v11l9-5.5z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </Svg>
  )
}

export function PauseIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M8 6v12M16 6v12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </Svg>
  )
}

export function UndoIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M8.2 9.1 5 12.2l3.2 3.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.7 12.2H14.2a3.7 3.7 0 0 1 0 7.4H10.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Bar plus a left chevron. Used to speed playback up. */
export function SpeedUpIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M7 5.5v13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M17 6.5L9.5 12l7.5 5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Right chevron. Used to slow playback down. */
export function SpeedDownIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M8 6.5L15.5 12 8 17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function ArrowRightIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M5 12h12M13 6.5L18.5 12 13 17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function BackIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M19 5v14l-9-7z" fill="currentColor" />
      <path d="M5 5h3v14H5z" fill="currentColor" />
    </Svg>
  )
}

export function StepIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M5 5v14l9-7z" fill="currentColor" />
      <path d="M16 5h3v14h-3z" fill="currentColor" />
    </Svg>
  )
}

export function RestartIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M12 5a7 7 0 1 1-6.3 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M5 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function CheckIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4.5 12l5 5L19.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function DismissIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}
