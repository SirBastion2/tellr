import type { CSSProperties } from 'react'
import markUrl from '../assets/tellr-wordmark.png'
import { useTheme } from './ThemeProvider'

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

/** Bank mark. Sits in the app header so it is not clipped by the viewport. */
export function ThemeWordmark() {
  const theme = useTheme()
  return (
    <div data-testid="theme-wordmark" data-mark={theme.mark} style={{ display: 'flex', alignItems: 'center', minHeight: 48 }}>
      {theme.mark === 'logo' ? (
        <span
          aria-hidden="true"
          data-testid="theme-logo"
          style={{
            display: 'block',
            width: 132,
            height: 48,
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
                color: 'var(--tc-wordmark)',
                fontWeight: theme.wordmarkWeight,
                letterSpacing: theme.wordmarkLetterSpacing,
                fontSize: '1.35rem',
                lineHeight: 1.1,
                margin: 0,
              }
        }
      >
        {theme.wordmark}
      </span>
    </div>
  )
}
