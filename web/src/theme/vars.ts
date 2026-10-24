import type { BankTheme } from './types'

/** CSS custom properties driven by one bank theme object. */
export function themeVars(theme: BankTheme): Record<string, string> {
  return {
    '--tc-font': theme.fontFamily,
    '--tc-bg-color': theme.background.color,
    '--tc-bg-image': theme.background.image,
    '--tc-bg-repeat': theme.background.repeat,
    '--tc-bg-size': theme.background.size,
    '--tc-glass-fill': theme.glass.fill,
    '--tc-glass-border': theme.glass.border,
    '--tc-glass-blur': theme.glass.blur,
    '--tc-text': theme.text,
    '--tc-muted': theme.mutedText,
    '--tc-input': theme.inputFill,
    '--tc-accent': theme.accent,
    '--tc-button': theme.button,
    '--tc-button-text': theme.buttonText,
    '--tc-logo': theme.logoColor,
    '--tc-progress-active': theme.progress.active,
    '--tc-progress-inactive': theme.progress.inactive,
  }
}
