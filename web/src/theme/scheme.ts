export type ColorChoice = 'light' | 'dark' | 'system'

export type ResolvedScheme = 'light' | 'dark'

/** `prefers-color-scheme`, then neither (tests, older engines) stays dark. */
export function readSystemScheme(): ResolvedScheme {
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
  } catch {
    return 'dark'
  }
  return 'dark'
}

export function parseColorChoice(value: string | null): ColorChoice {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }
  return 'system'
}

export function resolveScheme(choice: ColorChoice, system: ResolvedScheme): ResolvedScheme {
  return choice === 'system' ? system : choice
}
