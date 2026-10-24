import weaveUrl from '../../assets/weave.svg'
import type { BankTheme } from '../types'
import { FOOTER_TEXT, UI_FONT } from '../tokens'

/** M&T Bank. Green field with a CSS weave, green-tinted glass, text wordmark. */
export const theme: BankTheme = {
  id: 'mtb',
  name: 'M&T Bank',
  wordmark: 'M&T Bank',
  mark: 'text',
  markPlacement: 'bottom-left',
  footerPlacement: 'end',
  footerText: FOOTER_TEXT,
  fontFamily: UI_FONT,
  wordmarkFont: 'Georgia, "Palatino Linotype", Palatino, serif',
  wordmarkColor: '#F4FBF6',
  wordmarkWeight: 500,
  wordmarkLetterSpacing: '0.01em',
  background: {
    color: '#0E3B2E',
    image: `url("${weaveUrl}"), radial-gradient(ellipse at 18% 0%, rgba(214, 240, 220, 0.22), transparent 48%), linear-gradient(165deg, #0c3329 0%, #124d3b 46%, #1a6b4c 100%)`,
    repeat: 'repeat, no-repeat, no-repeat',
    size: '140px 140px, cover, cover',
  },
  glass: {
    fill: 'rgba(210, 235, 214, 0.18)',
    border: 'rgba(232, 245, 233, 0.34)',
    blur: '18px',
  },
  text: '#F7FFF9',
  mutedText: 'rgba(247, 255, 249, 0.72)',
  inputFill: 'rgba(255, 255, 255, 0.16)',
  accent: '#9DDCB4',
  button: '#F4FBF6',
  buttonText: '#0E3B2E',
  logoColor: '#F4FBF6',
  progress: {
    active: '#E7F6EC',
    inactive: 'rgba(231, 246, 236, 0.35)',
  },
}
