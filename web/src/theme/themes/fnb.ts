import type { BankTheme } from '../types'
import { FOOTER_TEXT, UI_FONT } from '../tokens'

/** F.N.B. Corporation. Navy field, gold wordmark, light-blue accent. */
export const theme: BankTheme = {
  id: 'fnb',
  name: 'F.N.B.',
  wordmark: 'F.N.B.',
  mark: 'text',
  markPlacement: 'top-left',
  footerPlacement: 'center',
  footerText: FOOTER_TEXT,
  fontFamily: UI_FONT,
  wordmarkFont: 'Georgia, "Times New Roman", serif',
  wordmarkColor: '#C5A572',
  wordmarkWeight: 600,
  wordmarkLetterSpacing: '0.14em',
  background: {
    color: '#041428',
    image:
      'radial-gradient(ellipse at 82% 0%, rgba(197, 165, 114, 0.32), transparent 42%), radial-gradient(ellipse at 8% 92%, rgba(126, 182, 224, 0.28), transparent 46%), linear-gradient(165deg, #02101f 0%, #062448 50%, #0a3260 100%)',
    repeat: 'no-repeat',
    size: 'cover',
  },
  glass: {
    fill: 'rgba(180, 205, 230, 0.14)',
    border: 'rgba(197, 165, 114, 0.5)',
    blur: '20px',
  },
  text: '#F8F4EC',
  mutedText: 'rgba(248, 244, 236, 0.72)',
  inputFill: 'rgba(126, 182, 224, 0.16)',
  accent: '#7EB6E0',
  button: '#C5A572',
  buttonText: '#041E42',
  logoColor: '#C5A572',
  progress: {
    active: '#C5A572',
    inactive: 'rgba(126, 182, 224, 0.45)',
  },
}
