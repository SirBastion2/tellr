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
  | 'theme'

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
  t: 'theme',
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

/** Button-like inputs activate on Enter/Space. They are not text fields. */
const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'image'])

function hostElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) {
    return target
  }
  if (target instanceof Text) {
    return target.parentElement
  }
  return null
}

function isTextEntry(el: Element): boolean {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return true
  }
  if (el instanceof HTMLInputElement) {
    return !BUTTON_INPUT_TYPES.has(el.type)
  }
  return false
}

function hasEditableAttribute(el: HTMLElement): boolean {
  if (el.getAttribute('contenteditable') === null) {
    return false
  }
  return isContentEditableElement(el)
}

/**
 * A focused button, link, or summary is not a text field. Stop there so a click
 * that leaves focus on the control does not look like typing.
 */
function isActivationControl(el: Element): boolean {
  const tag = el.tagName
  if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') {
    return true
  }
  if (el instanceof HTMLInputElement && BUTTON_INPUT_TYPES.has(el.type)) {
    return true
  }
  const role = el.getAttribute('role')
  return role === 'button' || role === 'link'
}

export function isEditableTarget(target: EventTarget | null): boolean {
  let current = hostElement(target)
  while (current) {
    if (isTextEntry(current)) {
      return true
    }
    if (current instanceof HTMLElement && hasEditableAttribute(current)) {
      return true
    }
    if (isActivationControl(current)) {
      return false
    }
    if (current instanceof HTMLElement && current.isContentEditable) {
      return true
    }
    current = current.parentElement
  }
  return false
}

export function hasShortcutModifier(event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey'>): boolean {
  return event.altKey || event.ctrlKey || event.metaKey
}

/** Map a keydown to a demo action. Escape always wins. Typing and Ctrl/Cmd/Alt skip the rest. A focused button does not. */
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
