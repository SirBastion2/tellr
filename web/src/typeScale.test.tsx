// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readdirSync, readFileSync, statSync } from 'node:fs'
// @ts-expect-error node:path is provided by the test runner
import { join, relative } from 'node:path'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { THEME_IDS, THEMES } from './theme/registry'
import {
  FONT_SIZE_ADJUST,
  TYPE_FG,
  TYPE_FG_PCT,
  TYPE_ROLE,
  TYPE_SIZE,
  TYPE_STEPS,
  TYPE_TOKEN_KEYS,
  TYPE_VARS,
  TYPE_WEIGHT,
} from './theme/typeScale'
import { COLOR_STORAGE_KEY, THEME_STORAGE_KEY } from './theme/tokens'
import { SHARED_STRUCTURE_VARS, themeVars } from './theme/vars'

const BANKS = ['tellr', 'pnc', 'mtb', 'fnb'] as const
const SCALE_FILE = 'src/theme/typeScale.ts'
const SRC_ROOT = 'src'

const FONT_SIZE_PROP = /(?:^|[^A-Za-z-])font-size\s*:|(?:^|[^A-Za-z])fontSize\s*:/
const TYPE_TOKEN = /var\(\s*--tc-(?:text|type|root)-/

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') {
      continue
    }
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      listSourceFiles(full, out)
      continue
    }
    if (/\.test\.(ts|tsx)$/.test(name)) {
      continue
    }
    if (/\.(ts|tsx|css)$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

function renderThemed(themeId: string) {
  window.history.replaceState({}, '', `/?theme=${themeId}`)
  window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
  window.localStorage.setItem(COLOR_STORAGE_KEY, 'dark')
  return render(<App />)
}

describe('shared type scale', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('resolves identical type tokens on every bank', () => {
    expect([...THEME_IDS]).toEqual([...BANKS])
    expect(TYPE_STEPS).toEqual(['xs', 'sm', 'base', 'lg', 'xl', '2xl'])
    expect(TYPE_SIZE.xs).toBe('0.75rem')
    expect(TYPE_SIZE.sm).toBe('0.875rem')
    expect(TYPE_SIZE.base).toBe('1rem')
    expect(TYPE_SIZE.lg).toBe('1.125rem')
    expect(TYPE_SIZE.xl).toBe('1.25rem')
    expect(TYPE_SIZE['2xl']).toBe('1.5rem')
    expect(FONT_SIZE_ADJUST).toBe('0.52')
    expect(TYPE_ROLE.pill).toBe('sm')
    expect(TYPE_ROLE.level).toBe('lg')
    expect(TYPE_ROLE.action).toBe('xl')
    expect(TYPE_ROLE.amount).toBe('2xl')
    expect(TYPE_ROLE.footer).toBe('xs')
    expect(TYPE_ROLE.chip).toBe('sm')
    expect(TYPE_ROLE.nav).toBe('sm')
    expect(TYPE_ROLE.label).toBe('sm')
    expect(TYPE_ROLE.tag).toBe('xs')
    expect(TYPE_WEIGHT.medium).toBe('500')
    expect(TYPE_FG_PCT.soft).toBe('69%')
    expect(TYPE_VARS['--tc-weight-medium']).toBe(TYPE_WEIGHT.medium)
    expect(TYPE_VARS['--tc-fg-soft-pct']).toBe(TYPE_FG_PCT.soft)
    expect(TYPE_FG.soft).toBeGreaterThan(0.68)

    const tellr = themeVars(THEMES.tellr!)
    for (const key of TYPE_TOKEN_KEYS) {
      expect(tellr[key], key).toBe(TYPE_VARS[key])
    }
    for (const key of SHARED_STRUCTURE_VARS) {
      expect(tellr[key], key).toBeDefined()
    }

    for (const id of BANKS) {
      const theme = THEMES[id]
      expect(theme, id).toBeTruthy()
      expect(theme, id).not.toHaveProperty('fontSize')
      expect(theme, id).not.toHaveProperty('fontSizeAdjust')
      expect(theme, id).not.toHaveProperty('lineHeight')
      expect(theme, id).not.toHaveProperty('letterSpacing')
      expect(theme, id).not.toHaveProperty('textTransform')
      const vars = themeVars(theme!)
      for (const key of TYPE_TOKEN_KEYS) {
        expect(vars[key], `${id} ${key}`).toBe(tellr[key])
        expect(vars[key], `${id} ${key}`).toBe(TYPE_VARS[key])
      }
      const source = readFileSync(`src/theme/themes/${id}.ts`, 'utf8')
      expect(source, id).not.toMatch(/fontSize|lineHeight|letterSpacing|textTransform|font-size-adjust/)
      const { unmount } = renderThemed(id)
      const root = screen.getByTestId('theme-root')
      expect(root.style.getPropertyValue('--tc-text-xs'), id).toBe(TYPE_SIZE.xs)
      expect(root.style.getPropertyValue('--tc-text-sm'), id).toBe(TYPE_SIZE.sm)
      expect(root.style.getPropertyValue('--tc-text-base'), id).toBe(TYPE_SIZE.base)
      expect(root.style.getPropertyValue('--tc-text-lg'), id).toBe(TYPE_SIZE.lg)
      expect(root.style.getPropertyValue('--tc-text-xl'), id).toBe(TYPE_SIZE.xl)
      expect(root.style.getPropertyValue('--tc-text-2xl'), id).toBe(TYPE_SIZE['2xl'])
      expect(root.style.getPropertyValue('--tc-font-size-adjust'), id).toBe(FONT_SIZE_ADJUST)
      expect(root.style.getPropertyValue('--tc-type-pill'), id).toBe(TYPE_SIZE.sm)
      expect(root.style.fontSizeAdjust || getComputedStyle(root).fontSizeAdjust, id).toBeTruthy()
      unmount()
    }
  })

  it('keeps raw font-size values inside the scale file', () => {
    const files = listSourceFiles(SRC_ROOT)
    expect(files.some((file) => file.replace(/\\/g, '/').endsWith(SCALE_FILE))).toBe(true)
    const hits: string[] = []
    for (const file of files) {
      const rel = relative('.', file).replace(/\\/g, '/')
      if (rel === SCALE_FILE) {
        continue
      }
      const text = readFileSync(file, 'utf8')
      const lines = text.split('\n')
      lines.forEach((line: string, index: number) => {
        if (FONT_SIZE_PROP.test(line) && !TYPE_TOKEN.test(line)) {
          hits.push(`${rel}:${index + 1}:${line.trim()}`)
        }
      })
    }
    expect(hits, hits.join('\n')).toEqual([])
  })
})
