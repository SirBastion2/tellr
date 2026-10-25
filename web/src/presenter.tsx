import { createContext, useContext, useMemo, type ReactNode } from 'react'

type PresenterController = {
  on: boolean
  setOn: (on: boolean) => void
}

const PresenterContext = createContext<PresenterController>({
  on: true,
  setOn: () => undefined,
})

/**
 * The demo layout is always on: larger type, the short nav, and the demo keys.
 * There is no toggle and `?present` is ignored.
 */
export function PresenterProvider({ children }: { children: ReactNode }) {
  const value = useMemo<PresenterController>(() => ({ on: true, setOn: () => undefined }), [])
  return <PresenterContext.Provider value={value}>{children}</PresenterContext.Provider>
}

export function usePresenter(): PresenterController {
  return useContext(PresenterContext)
}

/** Dev screens kept off the demo nav. */
export const PRESENTER_HIDDEN_ROUTES: ReadonlySet<string> = new Set(['context', 'interview', 'history', 'health'])
