import type { CSSProperties, ReactNode } from 'react'
import { usePresenter } from '../presenter'
import { useColorScheme, useTheme } from './ThemeProvider'
import { themeVars } from './vars'

export function ThemeRoot({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const { scheme } = useColorScheme()
  const presenter = usePresenter()
  const footerPosition: CSSProperties =
    theme.footerPlacement === 'center'
      ? { textAlign: 'center' }
      : { textAlign: 'right', marginLeft: 'auto', maxWidth: '46%' }

  return (
    <div
      data-testid="theme-root"
      data-theme={theme.id}
      data-scheme={scheme}
      data-presenter={presenter.on ? 'true' : 'false'}
      style={{
        ...(themeVars(theme) as CSSProperties),
        minHeight: '100vh',
        position: 'relative',
        color: 'var(--tc-text)',
        fontFamily: 'var(--tc-font)',
        fontWeight: 'var(--tc-font-weight)' as CSSProperties['fontWeight'],
        fontSize: presenter.on ? '125%' : '100%',
        colorScheme: scheme,
        backgroundColor: 'var(--tc-bg-color)',
        backgroundImage: 'var(--tc-bg-image)',
        backgroundRepeat: theme.background.repeat as CSSProperties['backgroundRepeat'],
        backgroundSize: 'var(--tc-bg-size)',
        backgroundPosition: 'center',
      }}
    >
      <div
        data-testid="theme-page"
        style={{
          minHeight: '100vh',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          padding: 'clamp(12px, 2vw, 28px) clamp(12px, 2vw, 32px) clamp(16px, 2.5vw, 40px)',
          gap: 'clamp(12px, 1.5vw, 24px)',
        }}
      >
        <div
          data-testid="theme-card"
          style={{
            position: 'relative',
            width: 'min(1440px, 100%)',
            margin: '0 auto',
            borderRadius: 'var(--tc-radius-card)',
            background: 'var(--tc-glass-fill)',
            border: 'var(--tc-border-width) var(--tc-border-style) var(--tc-glass-border)',
            backdropFilter: 'blur(var(--tc-glass-blur))',
            WebkitBackdropFilter: 'blur(var(--tc-glass-blur))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), var(--tc-shadow-card)',
            padding: 'clamp(12px, 1.4vw, 24px)',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
        <p
          data-testid="theme-footer"
          style={{
            width: 'min(1440px, 100%)',
            margin: '0 auto',
            fontSize: '0.8125rem',
            lineHeight: 1.4,
            color: 'var(--tc-muted)',
            ...footerPosition,
          }}
        >
          {theme.footerText}
        </p>
      </div>
    </div>
  )
}
