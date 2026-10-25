import { useEffect, useRef } from 'react'
import { readDemoShortcut, type DemoShortcut } from './shortcuts'

export type DemoShortcutHandlers = {
  onEscape: () => void
  onHelp: () => void
  onPlay: () => void
  onStep: () => void
  onRestart: () => void
  onEscalate: () => void
  onConfirm: () => void
  onDismiss: () => void
  onPrevCustomer: () => void
  onNextCustomer: () => void
  onTheme: () => void
}

const DISPATCH: Readonly<Record<DemoShortcut, keyof DemoShortcutHandlers>> = {
  escape: 'onEscape',
  help: 'onHelp',
  play: 'onPlay',
  step: 'onStep',
  restart: 'onRestart',
  escalate: 'onEscalate',
  confirm: 'onConfirm',
  dismiss: 'onDismiss',
  'prev-customer': 'onPrevCustomer',
  'next-customer': 'onNextCustomer',
  theme: 'onTheme',
}

/**
 * One window listener for the demo keys. Mount from the app shell so every
 * route (Home, Outcome, Handoff) shares the same handler.
 */
export function useDemoShortcuts(handlers: DemoShortcutHandlers): void {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  }, [handlers])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const action = readDemoShortcut(event)
      if (!action) {
        return
      }
      if (action !== 'escape') {
        event.preventDefault()
      }
      ref.current[DISPATCH[action]]()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
