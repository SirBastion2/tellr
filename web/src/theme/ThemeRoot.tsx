import type { CSSProperties, ReactNode } from 'react'
import { usePresenter } from '../presenter'
import { DENSITY } from './tokens'
import { useColorScheme, useTheme } from './ThemeProvider'
import { themeVars } from './vars'

export function ThemeRoot({ children, footer = null }: { children: ReactNode; footer?: ReactNode }) {
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
        height: '100dvh',
        minHeight: 0,
        maxHeight: '100dvh',
        position: 'relative',
        color: 'var(--tc-text)',
        fontFamily: 'var(--tc-font)',
        fontWeight: 'var(--tc-font-weight)' as CSSProperties['fontWeight'],
        fontSize: 'var(--tc-root-live)',
        lineHeight: 'var(--tc-type-line-body)',
        fontSizeAdjust: 'var(--tc-font-size-adjust)',
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
        className="tc-theme-page"
        style={{
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          maxWidth: '100%',
          minWidth: 0,
          overflowX: 'clip',
          overflowClipMargin: DENSITY.focusClip,
          padding: 'var(--tc-page-pad-y) var(--tc-page-pad-x) var(--tc-page-pad-bottom)',
          gap: 'var(--tc-space-workstation)',
        }}
      >
        <div
          data-testid="theme-card"
          className="tc-page-card"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            minHeight: 0,
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            margin: '0 auto',
            borderRadius: 'var(--tc-radius-card)',
            background: 'var(--tc-glass-fill)',
            border: 'var(--tc-border-width) var(--tc-border-style) var(--tc-glass-border)',
            backdropFilter: 'blur(var(--tc-glass-blur))',
            WebkitBackdropFilter: 'blur(var(--tc-glass-blur))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), var(--tc-shadow-card)',
            padding: 'var(--tc-space-card)',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
        <div className="tc-footer-row">
          <div id="tc-playback-slot" className="tc-playback-slot">
            {footer}
          </div>
          <p
            data-testid="theme-footer"
            className="tc-footer"
            style={{
              margin: '0 auto',
              color: 'var(--tc-muted)',
              ...footerPosition,
            }}
          >
            {theme.footerText}
          </p>
        </div>
      </div>
    </div>
  )
}
