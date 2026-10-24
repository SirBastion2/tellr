export type ThemeBackground = {
  color: string
  image: string
  repeat: string
  size: string
}

export type BankTheme = {
  id: string
  name: string
  wordmark: string
  /** `logo` tints the tellr wordmark asset. `text` draws `wordmark` in the bank's style. */
  mark: 'logo' | 'text'
  markPlacement: 'top-left' | 'bottom-left'
  footerPlacement: 'center' | 'end'
  footerText: string
  fontFamily: string
  wordmarkFont: string
  wordmarkColor: string
  wordmarkWeight: number
  wordmarkLetterSpacing: string
  background: ThemeBackground
  glass: {
    fill: string
    border: string
    blur: string
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
}
