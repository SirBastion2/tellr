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
      className="tc-letterbox"
      style={{
        ...(themeVars(theme) as CSSProperties),
        height: '100dvh',
        minHeight: 0,
        maxHeight: '100dvh',
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
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
        className="tc-stage"
        data-testid="theme-stage"
        style={{
          width: 'min(100vw, calc(100dvh * 16 / 9))',
          aspectRatio: '16 / 9',
          containerType: 'inline-size',
          ['--u' as string]: 'calc(1cqw / 10.24)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
      <div
        data-testid="theme-page"
        className="tc-theme-page"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden',
          overflowClipMargin: DENSITY.focusClip,
          padding: 0,
        }}
      >
        <div
          data-testid="theme-card"
          className="tc-page-card"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            minHeight: 0,
            height: '100%',
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            borderRadius: 0,
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            boxSizing: 'border-box',
            overflow: 'hidden',
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
    </div>
  )
}
