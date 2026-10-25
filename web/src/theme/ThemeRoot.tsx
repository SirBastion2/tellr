import type { CSSProperties, ReactNode } from 'react'
import markUrl from '../assets/tellr-wordmark.png'
import { useTheme } from './ThemeProvider'
import { PROGRESS_DOTS } from './tokens'
import { themeVars } from './vars'

const hiddenText: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export function ThemeRoot({ answers, children }: { answers: number | null; children: ReactNode }) {
  const theme = useTheme()
  const active = Math.min(PROGRESS_DOTS - 1, Math.max(0, answers ?? 0))
  const markPosition: CSSProperties =
    theme.markPlacement === 'top-left' ? { top: 28, left: 32 } : { bottom: 24, left: 32 }
  const footerPosition: CSSProperties =
    theme.footerPlacement === 'center'
      ? { left: 0, right: 0, textAlign: 'center', bottom: 20 }
      : { right: 32, bottom: 22, textAlign: 'right', maxWidth: '46%' }

  return (
    <div
      data-testid="theme-root"
      data-theme={theme.id}
      style={{
        ...(themeVars(theme) as CSSProperties),
        minHeight: '100vh',
        position: 'relative',
        color: 'var(--tc-text)',
        fontFamily: 'var(--tc-font)',
        backgroundColor: 'var(--tc-bg-color)',
        backgroundImage: 'var(--tc-bg-image)',
        backgroundRepeat: theme.background.repeat as CSSProperties['backgroundRepeat'],
        backgroundSize: 'var(--tc-bg-size)',
        backgroundPosition: 'center',
      }}
    >
      <div
        data-testid="theme-wordmark"
        data-mark={theme.mark}
        style={{ position: 'absolute', zIndex: 2, ...markPosition }}
      >
        {theme.mark === 'logo' ? (
          <span
            aria-hidden="true"
            data-testid="theme-logo"
            style={{
              display: 'block',
              width: 176,
              height: 72,
              backgroundColor: 'var(--tc-logo)',
              WebkitMaskImage: `url("${markUrl}")`,
              maskImage: `url("${markUrl}")`,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskPosition: 'left center',
              maskPosition: 'left center',
            }}
          />
        ) : null}
        <span
          style={
            theme.mark === 'logo'
              ? hiddenText
              : {
                  fontFamily: theme.wordmarkFont,
                  color: theme.wordmarkColor,
                  fontWeight: theme.wordmarkWeight,
                  letterSpacing: theme.wordmarkLetterSpacing,
                  fontSize: '28px',
                  lineHeight: 1.1,
                  margin: 0,
                }
          }
        >
          {theme.wordmark}
        </span>
      </div>
      <div
        style={{
          minHeight: '100vh',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.markPlacement === 'top-left' ? '108px 28px 72px' : '48px 28px 108px',
        }}
      >
        <div
          data-testid="theme-card"
          style={{
            position: 'relative',
            width: 'min(960px, 100%)',
            borderRadius: 28,
            background: 'var(--tc-glass-fill)',
            border: '1px solid var(--tc-glass-border)',
            backdropFilter: 'blur(var(--tc-glass-blur))',
            WebkitBackdropFilter: 'blur(var(--tc-glass-blur))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 28px 70px rgba(0,0,0,0.28)',
            padding: '22px 52px 22px 22px',
            boxSizing: 'border-box',
          }}
        >
          {children}
          <ol
            data-testid="theme-progress"
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 18,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {Array.from({ length: PROGRESS_DOTS }, (_, index) => (
              <li
                key={index}
                data-testid="theme-progress-dot"
                data-active={index === active ? 'true' : 'false'}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor:
                    index === active ? 'var(--tc-progress-active)' : 'var(--tc-progress-inactive)',
                }}
              />
            ))}
          </ol>
        </div>
      </div>
      <p
        data-testid="theme-footer"
        style={{
          position: 'absolute',
          zIndex: 2,
          margin: 0,
          fontSize: 13,
          lineHeight: 1.4,
          color: 'var(--tc-muted)',
          ...footerPosition,
        }}
      >
        {theme.footerText}
      </p>
    </div>
  )
}
