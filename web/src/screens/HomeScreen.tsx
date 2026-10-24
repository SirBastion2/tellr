import type { Library } from '../types'

export function HomeScreen({
  library,
  cases,
  onStart,
}: {
  library: Library | null
  cases: readonly { id: string }[]
  onStart: (caseId: string) => void
}) {
  return (
    <section data-testid="home-screen" className="space-y-4">
      {library ? (
        <>
          <p data-testid="library-version">{library.library_version}</p>
          <p data-testid="copy-status">{library.copy_status}</p>
        </>
      ) : null}
      <ul className="flex flex-wrap gap-2">
        {cases.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              data-testid={`case-${item.id}`}
              className="min-h-12 border border-stone-900 px-4"
              onClick={() => onStart(item.id)}
            >
              {item.id}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
