import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { PRESENTER_QUERY, PRESENTER_STORAGE_KEY } from './theme/tokens'

type PresenterController = {
  on: boolean
  setOn: (on: boolean) => void
}

const PresenterContext = createContext<PresenterController>({
  on: false,
  setOn: () => undefined,
})

export function readPresenterQuery(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(PRESENTER_QUERY)
  } catch {
    return null
  }
}

export function readStoredPresenter(): boolean {
  try {
    return window.localStorage.getItem(PRESENTER_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** `?present=1` and `?present=0` override the stored toggle. */
export function initialPresenter(): boolean {
  const query = readPresenterQuery()
  if (query === '1' || query === 'true') {
    return true
  }
  if (query === '0' || query === 'false') {
    return false
  }
  return readStoredPresenter()
}

function writePresenter(on: boolean) {
  try {
    window.localStorage.setItem(PRESENTER_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* private mode */
  }
  try {
    const url = new URL(window.location.href)
    if (on) {
      url.searchParams.set(PRESENTER_QUERY, '1')
    } else {
      url.searchParams.delete(PRESENTER_QUERY)
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  } catch {
    /* ignore */
  }
}

export function PresenterProvider({ children }: { children: ReactNode }) {
  const [on, setOnState] = useState(() => initialPresenter())
  const value = useMemo<PresenterController>(
    () => ({
      on,
      setOn: (next: boolean) => {
        setOnState(next)
        writePresenter(next)
      },
    }),
    [on],
  )
  return <PresenterContext.Provider value={value}>{children}</PresenterContext.Provider>
}

export function usePresenter(): PresenterController {
  return useContext(PresenterContext)
}

/** Dev screens hidden while a recorded demo is running. */
export const PRESENTER_HIDDEN_ROUTES: ReadonlySet<string> = new Set(['context', 'interview', 'history', 'health'])
