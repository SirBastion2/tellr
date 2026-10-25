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
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </Svg>
  )
}

export function PauseIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
    </Svg>
  )
}

export function UndoIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M8 8H5V5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 8.5A7 7 0 1 1 6 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
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
