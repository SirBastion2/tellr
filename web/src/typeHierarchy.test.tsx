// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readdirSync, readFileSync, statSync } from 'node:fs'
// @ts-expect-error node:path is provided by the test runner
import { join, relative } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { TYPE_FG, TYPE_FG_PCT, TYPE_ROLE, TYPE_WEIGHT } from './theme/typeScale'
import { COLOR_STORAGE_KEY, DENSITY, THEME_STORAGE_KEY } from './theme/tokens'

const css = () => readFileSync('src/index.css', 'utf8')

const FONT_DECL = /(?:^|[^A-Za-z-])(?:font-size|font-weight)\s*:|(?:^|[^A-Za-z])(?:fontSize|fontWeight)\s*:/
const TOKEN_OK = /var\(\s*--tc-/

const SCREEN_ROOTS = ['src/screens', 'src/workstation', 'src/ui/facts.tsx', 'src/ui/ConfirmDialog.tsx', 'src/ui/ShortcutHelp.tsx']

function listSourceFiles(dir: string, out: string[] = []): string[] {
  const stat = statSync(dir)
  if (stat.isFile()) {
    out.push(dir)
    return out
  }
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      listSourceFiles(full, out)
      continue
    }
    if (/\.test\.(ts|tsx)$/.test(name)) {
      continue
    }
    if (/\.(ts|tsx)$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

function rule(source: string, selector: string): string {
  const match = source.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))
  if (!match?.[1]) {
    throw new Error(`missing ${selector} rule`)
  }
  return match[1]
}

describe('shared type hierarchy', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('exposes label, tag, body, and divider tokens from the type scale', () => {
    expect(TYPE_WEIGHT.medium).toBe('500')
    expect(TYPE_WEIGHT.strong).toBe('700')
    expect(TYPE_WEIGHT.body).toBe('400')
    expect(TYPE_ROLE.label).toBe('sm')
    expect(TYPE_ROLE.tag).toBe('xs')
    expect(TYPE_ROLE.body).toBe('base')
    expect(TYPE_FG.soft).toBe(0.69)
    expect(TYPE_FG.body).toBe(0.85)
    expect(TYPE_FG.line).toBe(0.18)
    expect(TYPE_FG_PCT.soft).toBe('69%')
    expect(TYPE_FG_PCT.body).toBe('85%')
    expect(TYPE_FG_PCT.line).toBe('18%')
    expect(DENSITY.mediumWeight).toBe(TYPE_WEIGHT.medium)

    const source = css()
    expect(source).toContain('--tc-weight-medium: 500')
    expect(source).toContain('--tc-fg-soft-pct: 69%')
    expect(source).toContain('--tc-fg-body-pct: 85%')
    expect(source).toContain('--tc-fg-line-pct: 18%')

    const term = rule(source, '.tc-fact-term')
    expect(term).toMatch(/font-size:\s*var\(--tc-text-sm/)
    expect(term).toMatch(/font-weight:\s*var\(--tc-weight-medium/)
    expect(term).toMatch(/--tc-fg-soft-pct/)

    const value = rule(source, '.tc-fact-value')
    expect(value).toMatch(/font-weight:\s*var\(--tc-strong-weight/)
    expect(source).toMatch(/\.tc-fact-value > \.tc-prose\s*\{[^}]*font-weight:\s*inherit/)

    const kvTerm = rule(source, '.tc-kv dt')
    expect(kvTerm).toMatch(/font-size:\s*var\(--tc-text-sm/)
    expect(kvTerm).toMatch(/font-weight:\s*var\(--tc-weight-medium/)

    const kvValue = rule(source, '.tc-kv dd')
    expect(kvValue).toMatch(/font-weight:\s*var\(--tc-strong-weight/)

    const kicker = rule(source, '.tc-kicker')
    expect(kicker).toMatch(/font-size:\s*var\(--tc-text-xs/)
    expect(kicker).toMatch(/letter-spacing:\s*var\(--tc-kicker-tracking/)
    expect(kicker).toMatch(/text-transform:\s*var\(--tc-kicker-transform/)
    expect(kicker).toMatch(/--tc-fg-soft-pct/)

    const heading = rule(source, '.tc-section-heading')
    expect(heading).toMatch(/font-size:\s*var\(--tc-text-xs/)
    expect(heading).toMatch(/letter-spacing:\s*var\(--tc-kicker-tracking/)
    expect(heading).toMatch(/text-transform:\s*var\(--tc-kicker-transform/)

    expect(source).toMatch(/\.tc-block[\s\S]*border-top:\s*1px solid/)
    expect(source).toMatch(/\.tc-block[\s\S]*margin-top:\s*var\(--tc-space-5/)
    expect(source).toMatch(/\.tc-block[\s\S]*padding-top:\s*var\(--tc-space-5/)
    expect(source).toMatch(/\.tc-prose[\s\S]*--tc-fg-body-pct/)
    expect(source).toMatch(/\.tc-amount[\s\S]*font-size:\s*var\(--tc-text-2xl/)
  })

  it('renders Home blocks on the shared classes', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'tellr')
    window.localStorage.setItem(COLOR_STORAGE_KEY, 'dark')
    render(<App />)
    fireEvent.click(screen.getByTestId('case-file-toggle'))
    const type = screen.getByTestId('txn-type')
    const grid = type.closest('dl')
    expect(grid?.className).toContain('tc-kv')
    expect(grid?.querySelector('dt')?.className).toContain('tc-fact-term')
    expect(grid?.querySelector('dd')?.className).toContain('tc-fact-value')
    expect(screen.getByTestId('txn-amount').className).toContain('tc-amount')
    const memo = screen.getByText('Says a contractor needs cash today')
    const memoProse = memo.closest('.tc-prose')
    expect(memoProse?.parentElement?.className).toContain('tc-fact-value')
    expect(memoProse?.parentElement?.closest('dl')).toBe(grid)
    expect(screen.getByRole('heading', { name: 'Case file' }).className).toContain('tc-section-heading')
    expect(screen.queryByRole('heading', { name: 'Timeline' })).toBeNull()
    expect(screen.queryByText(/Event 0 of/)).toBeNull()
  })

  it('keeps label and heading font-size/weight out of screen files', () => {
    const files = SCREEN_ROOTS.flatMap((root) => listSourceFiles(root))
    const hits: string[] = []
    for (const file of files) {
      const rel = relative('.', file).replace(/\\/g, '/')
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line: string, index: number) => {
        if (FONT_DECL.test(line) && !TOKEN_OK.test(line)) {
          hits.push(`${rel}:${index + 1}:${line.trim()}`)
        }
      })
    }
    expect(hits, hits.join('\n')).toEqual([])
  })
})
