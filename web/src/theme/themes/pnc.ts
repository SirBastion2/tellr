import type { BankTheme } from '../types'
import { FOOTER_TEXT, UI_FONT } from '../tokens'

/** PNC Bank. Orange accent on a slate-to-navy field. Text wordmark, no logo file. */
export const theme: BankTheme = {
  id: 'pnc',
  name: 'PNC',
  wordmark: 'PNC',
  mark: 'text',
  markPlacement: 'top-left',
  footerPlacement: 'center',
  footerText: FOOTER_TEXT,
  fontFamily: UI_FONT,
  wordmarkFont: UI_FONT,
  wordmarkColor: '#EF7622',
  wordmarkWeight: 700,
  wordmarkLetterSpacing: '0.06em',
  background: {
    color: '#24303A',
    image:
      'radial-gradient(ellipse at 86% 12%, rgba(239, 118, 34, 0.42), transparent 46%), linear-gradient(160deg, #4D5964 0%, #2A3848 42%, #002D72 100%)',
    repeat: 'no-repeat',
    size: 'cover',
  },
  glass: {
    fill: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(239, 118, 34, 0.55)',
    blur: '20px',
  },
  text: '#F7F4F1',
  mutedText: 'rgba(247, 244, 241, 0.72)',
  inputFill: 'rgba(255, 255, 255, 0.14)',
  accent: '#EF7622',
  button: '#EF7622',
  buttonText: '#1A1208',
  logoColor: '#EF7622',
  progress: {
    active: '#EF7622',
    inactive: 'rgba(77, 89, 100, 0.85)',
  },
}
