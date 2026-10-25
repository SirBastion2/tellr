import type { CSSProperties } from 'react'
import markUrl from '../assets/tellr-wordmark.png'
import { useTheme } from './ThemeProvider'

const logoBox: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  height: 'var(--tc-wordmark-h, 48px)',
  width: 'auto',
  aspectRatio: 'var(--tc-wordmark-aspect, 155 / 61)',
  padding: 0,
  lineHeight: 0,
  backgroundColor: 'var(--tc-logo)',
  WebkitMaskImage: `url("${markUrl}")`,
  maskImage: `url("${markUrl}")`,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  objectFit: 'contain',
}

const logoImg: CSSProperties = {
  display: 'block',
  height: '100%',
  width: 'auto',
  aspectRatio: 'var(--tc-wordmark-aspect, 155 / 61)',
  objectFit: 'contain',
  objectPosition: 'center',
  lineHeight: 0,
  opacity: 0,
}

/** Bank mark. Sits in the app header so it is not clipped by the viewport. */
export function ThemeWordmark() {
  const theme = useTheme()
  return (
    <div
      data-testid="theme-wordmark"
      data-mark={theme.mark}
      className="tc-wordmark"
      style={
        {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          height: 'var(--tc-header-control-h, 48px)',
          minHeight: 'var(--tc-header-control-h, 48px)',
          lineHeight: 0,
          boxSizing: 'border-box',
          ...(theme.mark === 'logo'
            ? {
                '--tc-logo-src': `url("${markUrl}")`,
                width: 'auto',
                padding: 'var(--tc-space-1, 4px)',
                borderRadius: 'var(--tc-radius-control, 999px)',
              }
            : {}),
        } as CSSProperties
      }
    >
      {theme.mark === 'logo' ? (
        <span className="tc-wordmark-logo" data-testid="theme-logo" aria-hidden="true" style={logoBox}>
          <img src={markUrl} alt="" className="tc-wordmark-img" style={logoImg} />
        </span>
      ) : null}
      <span
        className={theme.mark === 'logo' ? 'tc-sr' : 'tc-wordmark-text'}
        style={
          theme.mark === 'logo'
            ? undefined
            : {
                fontFamily: theme.wordmarkFont,
                color: 'var(--tc-wordmark)',
                fontWeight: 'var(--tc-wordmark-weight, 600)' as CSSProperties['fontWeight'],
                letterSpacing: 'var(--tc-wordmark-tracking, 0.02em)',
                fontSize: 'var(--tc-text-lg)',
                lineHeight: 'var(--tc-text-lg-lh)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'visible',
              }
        }
      >
        {theme.wordmark}
      </span>
    </div>
  )
}
