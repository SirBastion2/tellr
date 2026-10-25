import { SOLID_CONTROLS } from '../chrome'
import type { BankTheme } from '../types'
import { FOOTER_TEXT, UI_FONT } from '../tokens'

/**
 * Base theme. Gradients use hex and rgba stops only.
 * Explicit percentage ellipse radii (`ellipse 72% 58%`) make the whole
 * background-image invalid in Windows Chrome/Edge, so the linear layer
 * never paints. Safari on Mac accepts that syntax. `transparent` is also
 * avoided: Chromium interpolates it as transparent black.
 * `background.color` is the solid fallback if a gradient layer is dropped.
 */
const risk = {
  clearBg: '#F5F5F4',
  clearFg: '#1C1917',
  cautionBg: '#FFEDD5',
  cautionFg: '#9A3412',
  highBg: '#7F1D1D',
  highFg: '#FFFFFF',
}

export const theme: BankTheme = {
  id: 'tellr',
  name: 'tellr',
  wordmark: 'tellr',
  mark: 'logo',
  logo: 'image',
  markPlacement: 'top-left',
  footerPlacement: 'center',
  footerText: FOOTER_TEXT,
  fontFamily: UI_FONT,
  fontWeight: 400,
  headingWeight: 600,
  wordmarkFont: UI_FONT,
  wordmarkColor: '#C7D2FE',
  wordmarkWeight: 600,
  wordmarkLetterSpacing: '-0.04em',
  radius: { card: '28px', control: '999px' },
  border: { width: '1px', style: 'solid' },
  shadow: { card: '0 28px 70px rgba(0, 0, 0, 0.28)' },
  density: 'comfortable',
  space: { gap: '16px', cardPadding: '22px' },
  background: {
    color: '#0B1026',
    image:
      'radial-gradient(ellipse at 74% 36%, rgba(129, 168, 255, 0.55) 0%, rgba(129, 168, 255, 0) 60%), radial-gradient(ellipse at 24% 74%, rgba(99, 102, 241, 0.38) 0%, rgba(99, 102, 241, 0) 56%), linear-gradient(155deg, #070b18 0%, #1a1744 40%, #2a4a9a 72%, #14284f 100%)',
    repeat: 'no-repeat',
    size: 'cover',
  },
  glass: {
    fill: 'rgba(255, 255, 255, 0.16)',
    border: 'rgba(255, 255, 255, 0.42)',
    blur: '22px',
    fallback: '#1E1B4B',
  },
  text: '#FFFFFF',
  mutedText: '#E0E7FF',
  inputFill: 'rgba(255, 255, 255, 0.18)',
  accent: '#A5B4FC',
  button: '#F8FAFC',
  buttonText: '#1E1B4B',
  logoColor: '#C7D2FE',
  progress: {
    active: '#FFFFFF',
    inactive: 'rgba(255, 255, 255, 0.38)',
  },
  risk,
  ...SOLID_CONTROLS,
  link: '#E0E7FF',
  surface: '#1E1B4B',
  light: {
    wordmarkColor: '#312E81',
    background: {
      color: '#EEF2FF',
      image:
        'radial-gradient(ellipse at 74% 36%, rgba(129, 140, 248, 0.45) 0%, rgba(129, 140, 248, 0) 60%), radial-gradient(ellipse at 24% 74%, rgba(99, 102, 241, 0.28) 0%, rgba(99, 102, 241, 0) 56%), linear-gradient(155deg, #f8fafc 0%, #e0e7ff 48%, #c7d2fe 100%)',
      repeat: 'no-repeat',
      size: 'cover',
    },
    glass: {
      fill: 'rgba(255, 255, 255, 0.82)',
      border: 'rgba(49, 46, 129, 0.28)',
      blur: '22px',
      fallback: '#FFFFFF',
    },
    text: '#1E1B4B',
    mutedText: '#312E81',
    inputFill: '#E0E7FF',
    accent: '#4338CA',
    button: '#312E81',
    buttonText: '#FFFFFF',
    logoColor: '#312E81',
    progress: { active: '#312E81', inactive: '#A5B4FC' },
    risk,
    ...SOLID_CONTROLS,
    link: '#312E81',
    surface: '#FFFFFF',
  },
}
