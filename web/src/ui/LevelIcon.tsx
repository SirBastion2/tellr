import type { Level } from '../types'

export function LevelIcon({ level }: { level: Level }) {
  if (level === 'clear') {
    return (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" data-testid="level-icon" data-level={level}>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (level === 'caution') {
    return (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" data-testid="level-icon" data-level={level}>
        <path d="M12 3l10 18H2z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" data-testid="level-icon" data-level={level}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
    </svg>
  )
}

export const LEVEL_WORD: Record<Level, string> = {
  clear: 'Clear',
  caution: 'Caution',
  high: 'High',
}
