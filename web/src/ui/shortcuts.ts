export type DemoShortcut =
  | 'escape'
  | 'help'
  | 'play'
  | 'step'
  | 'restart'
  | 'escalate'
  | 'confirm'
  | 'dismiss'
  | 'prev-customer'
  | 'next-customer'

const KEYS: Readonly<Record<string, Exclude<DemoShortcut, 'escape'>>> = {
  '?': 'help',
  p: 'play',
  n: 'step',
  r: 'restart',
  e: 'escalate',
  c: 'confirm',
  d: 'dismiss',
  '[': 'prev-customer',
  ']': 'next-customer',
}

function contentEditableValue(el: HTMLElement): string | null {
  const attr = el.getAttribute('contenteditable')
  if (attr !== null) {
    return attr.trim().toLowerCase()
  }
  return el.isContentEditable ? 'true' : null
}

function isContentEditableElement(el: HTMLElement): boolean {
  const value = contentEditableValue(el)
  return value === '' || value === 'true' || value === 'plaintext-only'
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true
  }
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (isContentEditableElement(target)) {
    return true
  }
  let parent = target.parentElement
  while (parent) {
    if (isContentEditableElement(parent)) {
      return true
    }
    parent = parent.parentElement
  }
  return false
}

export function hasShortcutModifier(event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey'>): boolean {
  return event.altKey || event.ctrlKey || event.metaKey
}

/** Map a keydown to a demo action. Escape always wins; typing and Ctrl/Cmd/Alt skip the rest. */
export function readDemoShortcut(event: KeyboardEvent): DemoShortcut | null {
  if (event.key === 'Escape') {
    return 'escape'
  }
  if (isEditableTarget(event.target) || hasShortcutModifier(event)) {
    return null
  }
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  return KEYS[key] ?? null
}
