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
  onSlower: () => void
  onFaster: () => void
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
  slower: 'onSlower',
  faster: 'onFaster',
}

/**
 * One window listener for the demo keys, on the capture path. Mount from the
 * app shell so every route shares it. Capture runs before a focused button
 * can stop the event, so a click on a toolbar, scheme, or chip control does
 * not silence the keys. Enter and Space are not demo keys, so they are left
 * alone and still activate that button.
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
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
}
