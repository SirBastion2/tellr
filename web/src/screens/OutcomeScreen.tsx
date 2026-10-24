import type { SessionState } from '../types'

export function OutcomeScreen({ session }: { session: SessionState | null }) {
  return (
    <section data-testid="outcome-screen">
      {session ? (
        <ul className="flex flex-wrap gap-2">
          {session.available_outcomes.map((outcome) => (
            <li key={outcome}>
              <button
                type="button"
                disabled={false}
                data-testid={`outcome-${outcome}`}
                data-suggested={outcome === session.suggested_outcome ? 'true' : 'false'}
                className="min-h-12 border border-stone-900 px-3"
              >
                {outcome}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
