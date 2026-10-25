import { SOLID_CONTROLS } from '../chrome'
import type { BankTheme } from '../types'
import { FOOTER_TEXT } from '../tokens'

/** F.N.B. Corporation. Square corners, gold rule, compact density. */
const risk = {
  clearBg: '#F8F4EC',
  clearFg: '#041E42',
  cautionBg: '#FFEDD5',
  cautionFg: '#9A3412',
  highBg: '#7F1D1D',
  highFg: '#FFFFFF',
}

export const theme: BankTheme = {
  id: 'fnb',
  name: 'F.N.B.',
  wordmark: 'F.N.B.',
  mark: 'text',
  logo: 'text',
  markPlacement: 'top-left',
  footerPlacement: 'center',
  footerText: FOOTER_TEXT,
  fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
  fontWeight: 400,
  headingWeight: 600,
  wordmarkFont: 'Georgia, "Times New Roman", serif',
  wordmarkColor: '#C5A572',
  wordmarkWeight: 600,
  wordmarkLetterSpacing: '0.14em',
  radius: { card: '4px', control: '6px' },
  border: { width: '2px', style: 'solid' },
  shadow: { card: '0 10px 0 rgba(0, 0, 0, 0.35)' },
  density: 'compact',
  space: { gap: '8px', cardPadding: '12px' },
  background: {
    color: '#041428',
    image:
      'radial-gradient(ellipse at 82% 0%, rgba(197, 165, 114, 0.32) 0%, rgba(197, 165, 114, 0) 42%), radial-gradient(ellipse at 8% 92%, rgba(126, 182, 224, 0.28) 0%, rgba(126, 182, 224, 0) 46%), linear-gradient(165deg, #02101f 0%, #062448 50%, #0a3260 100%)',
    repeat: 'no-repeat',
    size: 'cover',
  },
  glass: {
    fill: 'rgba(180, 205, 230, 0.14)',
    border: 'rgba(197, 165, 114, 0.5)',
    blur: '20px',
    fallback: '#062448',
  },
  text: '#F8F4EC',
  mutedText: '#F5E6C8',
  inputFill: 'rgba(126, 182, 224, 0.16)',
  accent: '#7EB6E0',
  button: '#C5A572',
  buttonText: '#041E42',
  logoColor: '#C5A572',
  progress: {
    active: '#C5A572',
    inactive: 'rgba(126, 182, 224, 0.45)',
  },
  risk,
  ...SOLID_CONTROLS,
  link: '#F5E6C8',
  surface: '#062448',
  light: {
    wordmarkColor: '#041E42',
    background: {
      color: '#F8F4EC',
      image:
        'radial-gradient(ellipse at 82% 0%, rgba(197, 165, 114, 0.35) 0%, rgba(197, 165, 114, 0) 42%), radial-gradient(ellipse at 8% 92%, rgba(29, 78, 137, 0.16) 0%, rgba(29, 78, 137, 0) 46%), linear-gradient(165deg, #fffdf8 0%, #f8f4ec 52%, #e7eef5 100%)',
      repeat: 'no-repeat',
      size: 'cover',
    },
    glass: {
      fill: 'rgba(255, 255, 255, 0.84)',
      border: 'rgba(4, 30, 66, 0.35)',
      blur: '20px',
      fallback: '#FFFCF6',
    },
    text: '#041E42',
    mutedText: '#041E42',
    inputFill: '#E7EEF5',
    accent: '#1D4E89',
    button: '#041E42',
    buttonText: '#F8F4EC',
    logoColor: '#041E42',
    progress: { active: '#041E42', inactive: '#7EB6E0' },
    risk,
    ...SOLID_CONTROLS,
    link: '#1D4E89',
    surface: '#FFFCF6',
  },
}
