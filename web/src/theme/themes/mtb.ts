import weaveUrl from '../../assets/weave.svg'
import { DARK_CONTROLS, DARK_RISK, SOLID_CONTROLS } from '../chrome'
import type { BankTheme } from '../types'
import { FOOTER_TEXT } from '../tokens'

/** Quote the weave URL so a data: or quoted path cannot drop the gradient stack. */
function cssUrl(value: string): string {
  return `url(${JSON.stringify(value)})`
}

/** M&T Bank. Green field, weave texture, serif wordmark. Structure is shared. */
const riskLight = {
  clearBg: '#F4FBF6',
  clearFg: '#0E3B2E',
  cautionBg: '#FFEDD5',
  cautionFg: '#9A3412',
  highBg: '#7F1D1D',
  highFg: '#FFFFFF',
}

const riskDark = {
  clearBg: '#0E3B2E',
  clearFg: '#F4FBF6',
  ...DARK_RISK,
}

export const theme: BankTheme = {
  id: 'mtb',
  name: 'M&T Bank',
  wordmark: 'M&T Bank',
  mark: 'text',
  logo: 'text',
  markPlacement: 'bottom-left',
  footerPlacement: 'end',
  footerText: FOOTER_TEXT,
  fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
  wordmarkFont: 'Georgia, "Palatino Linotype", Palatino, serif',
  wordmarkColor: '#F4FBF6',
  background: {
    color: '#0E3B2E',
    image: `${cssUrl(weaveUrl)}, radial-gradient(ellipse at 18% 0%, rgba(214, 240, 220, 0.22) 0%, rgba(214, 240, 220, 0) 48%), linear-gradient(165deg, #0c3329 0%, #124d3b 46%, #1a6b4c 100%)`,
    repeat: 'repeat, no-repeat, no-repeat',
    size: '140px 140px, cover, cover',
  },
  glass: {
    fill: 'rgba(210, 235, 214, 0.18)',
    border: 'rgba(232, 245, 233, 0.34)',
    fallback: '#0E3B2E',
  },
  text: '#F7FFF9',
  mutedText: '#D1FAE5',
  inputFill: 'rgba(255, 255, 255, 0.16)',
  accent: '#9DDCB4',
  button: '#F4FBF6',
  buttonText: '#0E3B2E',
  logoColor: '#F4FBF6',
  progress: {
    active: '#E7F6EC',
    inactive: 'rgba(231, 246, 236, 0.35)',
  },
  risk: riskDark,
  ...DARK_CONTROLS,
  link: '#D1FAE5',
  surface: '#0E3B2E',
  highlightBg: '#D1FAE5',
  highlightFg: '#0E3B2E',
  light: {
    wordmarkColor: '#0E3B2E',
    background: {
      color: '#E7F6EC',
      image: `${cssUrl(weaveUrl)}, radial-gradient(ellipse at 18% 0%, rgba(14, 59, 46, 0.08) 0%, rgba(14, 59, 46, 0) 48%), linear-gradient(165deg, #f7fff9 0%, #e7f6ec 46%, #d1fae5 100%)`,
      repeat: 'repeat, no-repeat, no-repeat',
      size: '140px 140px, cover, cover',
    },
    glass: {
      fill: 'rgba(255, 255, 255, 0.82)',
      border: 'rgba(14, 59, 46, 0.28)',
      fallback: '#F7FFF9',
    },
    text: '#0E3B2E',
    mutedText: '#0E3B2E',
    inputFill: '#D1FAE5',
    accent: '#0F6B4C',
    button: '#0E3B2E',
    buttonText: '#F4FBF6',
    logoColor: '#0E3B2E',
    progress: { active: '#0E3B2E', inactive: '#9DDCB4' },
    risk: riskLight,
    ...SOLID_CONTROLS,
    link: '#0E3B2E',
    surface: '#F7FFF9',
    highlightBg: '#D1FAE5',
    highlightFg: '#0E3B2E',
  },
}
