import { Link } from 'react-router-dom'
import { controlStyle, linkStyle } from '../theme/controls'
import { PageTitle } from '../ui/facts'

export function NotFoundScreen({ kind = 'missing' }: { kind?: 'missing' | 'session' }) {
  const needsSession = kind === 'session'
  return (
    <section data-testid="not-found-screen" className="tc-card">
      <PageTitle>{needsSession ? 'Start a customer first' : 'Page not found'}</PageTitle>
      <p className="tc-prose" style={{ margin: 0 }}>
        {needsSession
          ? 'This screen needs an open visit. Open Home and start a customer.'
          : 'That address is not a screen in Teller Copilot. Start a customer from Home.'}
      </p>
      <Link to="/" data-testid="not-found-home" style={{ ...controlStyle, ...linkStyle }}>
        Back to Home
      </Link>
    </section>
  )
}
