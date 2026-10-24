import type { BankTheme } from '../types'
import { FOOTER_TEXT, UI_FONT } from '../tokens'

/** Base theme. The wordmark asset is tinted with `logoColor` (periwinkle on this navy field). */
export const theme: BankTheme = {
  id: 'tellr',
  name: 'tellr',
  wordmark: 'tellr',
  mark: 'logo',
  markPlacement: 'top-left',
  footerPlacement: 'center',
  footerText: FOOTER_TEXT,
  fontFamily: UI_FONT,
  wordmarkFont: UI_FONT,
  wordmarkColor: '#C7D2FE',
  wordmarkWeight: 600,
  wordmarkLetterSpacing: '-0.04em',
  background: {
    color: '#0B1026',
    image:
      'radial-gradient(ellipse 72% 58% at 74% 36%, rgba(129, 168, 255, 0.55), transparent 60%), radial-gradient(ellipse 42% 36% at 24% 74%, rgba(99, 102, 241, 0.38), transparent 56%), linear-gradient(155deg, #070b18 0%, #1a1744 40%, #2a4a9a 72%, #14284f 100%)',
    repeat: 'no-repeat',
    size: 'cover',
  },
  glass: {
    fill: 'rgba(255, 255, 255, 0.16)',
    border: 'rgba(255, 255, 255, 0.42)',
    blur: '22px',
  },
  text: '#FFFFFF',
  mutedText: 'rgba(255, 255, 255, 0.74)',
  inputFill: 'rgba(255, 255, 255, 0.18)',
  accent: '#A5B4FC',
  button: '#F8FAFC',
  buttonText: '#1E1B4B',
  logoColor: '#C7D2FE',
  progress: {
    active: '#FFFFFF',
    inactive: 'rgba(255, 255, 255, 0.38)',
  },
}
