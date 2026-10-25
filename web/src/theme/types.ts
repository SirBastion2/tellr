export type ThemeBackground = {
  color: string
  image: string
  repeat: string
  size: string
}

export type ThemeDensity = 'compact' | 'regular' | 'comfortable'

/** Full bank chrome. Adding a bank is one file that exports `theme`. */
export type BankTheme = {
  id: string
  name: string
  wordmark: string
  /** `logo` tints the tellr wordmark asset. `text` draws `wordmark` in the bank's style. */
  mark: 'logo' | 'text'
  /** Which mark treatment this bank uses. `image` is the shared wordmark asset. */
  logo: 'image' | 'text'
  markPlacement: 'top-left' | 'bottom-left'
  footerPlacement: 'center' | 'end'
  footerText: string
  fontFamily: string
  fontWeight: number
  headingWeight: number
  wordmarkFont: string
  wordmarkColor: string
  wordmarkWeight: number
  wordmarkLetterSpacing: string
  radius: {
    card: string
    control: string
  }
  border: {
    width: string
    style: string
  }
  shadow: {
    card: string
  }
  density: ThemeDensity
  space: {
    gap: string
    cardPadding: string
  }
  background: ThemeBackground
  glass: {
    fill: string
    border: string
    blur: string
    /** Opaque fill when backdrop-filter is unavailable. */
    fallback: string
  }
  text: string
  mutedText: string
  inputFill: string
  accent: string
  button: string
  buttonText: string
  logoColor: string
  progress: {
    active: string
    inactive: string
  }
  /** Solid pairs so caution level does not depend on the page gradient. */
  risk: {
    clearBg: string
    clearFg: string
    cautionBg: string
    cautionFg: string
    highBg: string
    highFg: string
  }
}
