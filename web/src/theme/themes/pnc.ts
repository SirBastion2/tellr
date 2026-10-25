import { DARK_CONTROLS, DARK_RISK, SOLID_CONTROLS } from '../chrome'
import type { BankTheme } from '../types'
import { FOOTER_TEXT } from '../tokens'

/** PNC Bank. Orange accent. Structure is shared. */
const riskLight = {
  clearBg: '#F7F4F1',
  clearFg: '#1A1208',
  cautionBg: '#FFEDD5',
  cautionFg: '#9A3412',
  highBg: '#7F1D1D',
  highFg: '#FFFFFF',
}

const riskDark = {
  clearBg: '#1A1208',
  clearFg: '#F7F4F1',
  ...DARK_RISK,
}

export const theme: BankTheme = {
  id: 'pnc',
  name: 'PNC',
  wordmark: 'PNC',
  mark: 'text',
  logo: 'text',
  markPlacement: 'top-left',
  footerPlacement: 'center',
  footerText: FOOTER_TEXT,
  fontFamily: 'Arial, "Segoe UI", sans-serif',
  wordmarkFont: 'Arial, "Segoe UI", sans-serif',
  wordmarkColor: '#EF7622',
  background: {
    color: '#24303A',
    image:
      'radial-gradient(ellipse at 86% 12%, rgba(239, 118, 34, 0.42) 0%, rgba(239, 118, 34, 0) 46%), linear-gradient(160deg, #4D5964 0%, #2A3848 42%, #002D72 100%)',
    repeat: 'no-repeat',
    size: 'cover',
  },
  glass: {
    fill: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(239, 118, 34, 0.55)',
    fallback: '#1A2744',
  },
  text: '#F7F4F1',
  mutedText: '#FFE4CC',
  inputFill: 'rgba(255, 255, 255, 0.14)',
  accent: '#EF7622',
  button: '#EF7622',
  buttonText: '#1A1208',
  logoColor: '#EF7622',
  progress: {
    active: '#EF7622',
    inactive: 'rgba(77, 89, 100, 0.85)',
  },
  risk: riskDark,
  ...DARK_CONTROLS,
  link: '#FFE4CC',
  surface: '#1A2744',
  highlightBg: '#FFE4CC',
  highlightFg: '#1A1208',
  light: {
    wordmarkColor: '#9A3412',
    background: {
      color: '#F7F4F1',
      image:
        'radial-gradient(ellipse at 86% 12%, rgba(239, 118, 34, 0.28) 0%, rgba(239, 118, 34, 0) 46%), linear-gradient(160deg, #fffdfb 0%, #f7f4f1 48%, #ffe4cc 100%)',
      repeat: 'no-repeat',
      size: 'cover',
    },
    glass: {
      fill: 'rgba(255, 255, 255, 0.86)',
      border: 'rgba(0, 45, 114, 0.28)',
      fallback: '#FFFFFF',
    },
    text: '#002D72',
    mutedText: '#24303A',
    inputFill: '#FFF1E6',
    accent: '#C2410C',
    button: '#EF7622',
    buttonText: '#1A1208',
    logoColor: '#9A3412',
    progress: { active: '#C2410C', inactive: '#FDBA74' },
    risk: riskLight,
    ...SOLID_CONTROLS,
    link: '#9A3412',
    surface: '#FFFFFF',
    highlightBg: '#FFE4CC',
    highlightFg: '#1A1208',
  },
}
