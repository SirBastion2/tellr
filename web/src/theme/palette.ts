import type { BankTheme, ThemePalette } from './types'

export function darkPalette(theme: BankTheme): ThemePalette {
  return {
    wordmarkColor: theme.wordmarkColor,
    background: theme.background,
    glass: theme.glass,
    text: theme.text,
    mutedText: theme.mutedText,
    inputFill: theme.inputFill,
    accent: theme.accent,
    button: theme.button,
    buttonText: theme.buttonText,
    logoColor: theme.logoColor,
    progress: theme.progress,
    risk: theme.risk,
    secondaryBg: theme.secondaryBg,
    secondaryFg: theme.secondaryFg,
    secondaryBorder: theme.secondaryBorder,
    link: theme.link,
    surface: theme.surface,
    chipBg: theme.chipBg,
    chipFg: theme.chipFg,
    actionBg: theme.actionBg,
    actionFg: theme.actionFg,
    quoteBg: theme.quoteBg,
    quoteFg: theme.quoteFg,
    quoteBorder: theme.quoteBorder,
    focus: theme.focus,
    highlightBg: theme.highlightBg,
    highlightFg: theme.highlightFg,
  }
}

/** Copy a palette onto the theme without mutating the registered object. */
export function themeForScheme(theme: BankTheme, scheme: 'light' | 'dark'): BankTheme {
  if (scheme === 'dark') {
    return theme
  }
  const light = theme.light
  return {
    ...theme,
    wordmarkColor: light.wordmarkColor,
    background: light.background,
    glass: light.glass,
    text: light.text,
    mutedText: light.mutedText,
    inputFill: light.inputFill,
    accent: light.accent,
    button: light.button,
    buttonText: light.buttonText,
    logoColor: light.logoColor,
    progress: light.progress,
    risk: light.risk,
    secondaryBg: light.secondaryBg,
    secondaryFg: light.secondaryFg,
    secondaryBorder: light.secondaryBorder,
    link: light.link,
    surface: light.surface,
    chipBg: light.chipBg,
    chipFg: light.chipFg,
    actionBg: light.actionBg,
    actionFg: light.actionFg,
    quoteBg: light.quoteBg,
    quoteFg: light.quoteFg,
    quoteBorder: light.quoteBorder,
    focus: light.focus,
    highlightBg: light.highlightBg,
    highlightFg: light.highlightFg,
  }
}
