import type { BankTheme } from '../types'
import { FOOTER_TEXT } from '../tokens'

/** F.N.B. Corporation. Square corners, gold rule, compact density. */
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
  space: { gap: '10px', cardPadding: '14px' },
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
  risk: {
    clearBg: '#F8F4EC',
    clearFg: '#041E42',
    cautionBg: '#FFEDD5',
    cautionFg: '#9A3412',
    highBg: '#7F1D1D',
    highFg: '#FFFFFF',
  },
}
