import { describe, expect, it } from 'vitest'
import { hasShortcutModifier, isEditableTarget, readDemoShortcut } from './shortcuts'

function keydown(
  key: string,
  init: KeyboardEventInit & { target?: EventTarget | null } = {},
): KeyboardEvent {
  const { target, ...rest } = init
  const event = new KeyboardEvent('keydown', { key, ...rest })
  if (target !== undefined) {
    Object.defineProperty(event, 'target', { value: target })
  }
  return event
}

describe('demo shortcut map', () => {
  it('maps the working keys and ignores Ctrl, Cmd, and Alt', () => {
    expect(readDemoShortcut(keydown('?'))).toBe('help')
    expect(readDemoShortcut(keydown('p'))).toBe('play')
    expect(readDemoShortcut(keydown('N'))).toBe('step')
    expect(readDemoShortcut(keydown('r'))).toBe('restart')
    expect(readDemoShortcut(keydown('c'))).toBe('confirm')
    expect(readDemoShortcut(keydown('d'))).toBe('dismiss')
    expect(readDemoShortcut(keydown('e'))).toBe('escalate')
    expect(readDemoShortcut(keydown('['))).toBe('prev-customer')
    expect(readDemoShortcut(keydown(']'))).toBe('next-customer')
    expect(readDemoShortcut(keydown('t'))).toBe('theme')
    expect(readDemoShortcut(keydown('T'))).toBe('theme')
    expect(readDemoShortcut(keydown('Escape'))).toBe('escape')
    expect(readDemoShortcut(keydown('p', { ctrlKey: true }))).toBeNull()
    expect(readDemoShortcut(keydown('p', { metaKey: true }))).toBeNull()
    expect(readDemoShortcut(keydown('p', { altKey: true }))).toBeNull()
    expect(hasShortcutModifier({ altKey: false, ctrlKey: true, metaKey: false })).toBe(true)
  })

  it('ignores typing in inputs, textareas, selects, and contenteditable', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const nested = document.createElement('span')
    editable.append(nested)
    document.body.append(input, textarea, select, editable)
    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(textarea)).toBe(true)
    expect(isEditableTarget(select)).toBe(true)
    expect(isEditableTarget(editable)).toBe(true)
    expect(isEditableTarget(nested)).toBe(true)
    expect(readDemoShortcut(keydown('r', { target: input }))).toBeNull()
    expect(readDemoShortcut(keydown('p', { target: textarea }))).toBeNull()
    expect(readDemoShortcut(keydown('n', { target: select }))).toBeNull()
    expect(readDemoShortcut(keydown('t', { target: input }))).toBeNull()
    expect(readDemoShortcut(keydown('?', { target: editable }))).toBeNull()
    expect(readDemoShortcut(keydown('Escape', { target: input }))).toBe('escape')
    expect(isEditableTarget(document.body)).toBe(false)
  })

  it('still maps keys on a button, an icon inside it, and a button-type input', () => {
    const button = document.createElement('button')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    svg.append(path)
    button.append(svg)
    const inputButton = document.createElement('input')
    inputButton.type = 'button'
    document.body.append(button, inputButton)
    expect(isEditableTarget(button)).toBe(false)
    expect(isEditableTarget(svg)).toBe(false)
    expect(isEditableTarget(path)).toBe(false)
    expect(isEditableTarget(inputButton)).toBe(false)
    expect(readDemoShortcut(keydown('t', { target: button }))).toBe('theme')
    expect(readDemoShortcut(keydown('p', { target: svg }))).toBe('play')
    expect(readDemoShortcut(keydown('n', { target: path }))).toBe('step')
    expect(readDemoShortcut(keydown('r', { target: inputButton }))).toBe('restart')
    expect(readDemoShortcut(keydown('Enter', { target: button }))).toBeNull()
    expect(readDemoShortcut(keydown(' ', { target: button }))).toBeNull()
    expect(readDemoShortcut(keydown('t', { target: document.createElement('input') }))).toBeNull()
  })
})
