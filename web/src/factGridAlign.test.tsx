// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
// @ts-expect-error node:path is provided by the test runner
import { join } from 'node:path'
// @ts-expect-error node:child_process is provided by the test runner
import { spawnSync } from 'node:child_process'
// @ts-expect-error node:process is provided by the test runner
import { cwd, env, execPath } from 'node:process'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'
import './index.css'
import { THEME_IDS } from './theme/registry'
import { DENSITY } from './theme/tokens'

const css = () => readFileSync('src/index.css', 'utf8')

function rule(source: string, selector: string): string {
  const match = source.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))
  if (!match?.[1]) {
    throw new Error(`missing ${selector} rule`)
  }
  return match[1]
}

function parseMeasureJson(stdout: string): {
  amountCenterDeltaPx: number
  typeToAmountGapPx: number
  amountToMemoGapPx: number
  rowGapDeltaPx: number
  columnGapPx: number
  typeValue: string
} {
  const lines = stdout.trim().split('\n')
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]
    if (!line?.startsWith('{')) {
      continue
    }
    return JSON.parse(line) as ReturnType<typeof parseMeasureJson>
  }
  throw new Error(`no JSON measurement in:\n${stdout}`)
}

describe('fact-grid optical alignment', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('centers rows, uses the next spacing step for the label column, and boxes Amount on the 2xl line token', () => {
    const source = css()
    expect(DENSITY.space3).toBe('12px')
    expect(DENSITY.space4).toBe('16px')

    for (const selector of ['.tc-kv', '.tc-facts'] as const) {
      const block = rule(source, selector)
      expect(block, selector).toMatch(/column-gap:\s*var\(--tc-space-4/)
      expect(block, selector).not.toMatch(/column-gap:\s*var\(--tc-space-3/)
      expect(block, selector).toMatch(/row-gap:\s*var\(--tc-space-2/)
      expect(block, selector).toMatch(/align-items:\s*center/)
      expect(block, selector).not.toMatch(/align-items:\s*baseline/)
    }

    const amount = rule(source, '.tc-amount')
    expect(amount).toMatch(/display:\s*block/)
    expect(amount).toMatch(/font-size:\s*var\(--tc-text-2xl/)
    expect(amount).toMatch(/line-height:\s*var\(--tc-text-2xl-lh/)
    expect(amount).not.toMatch(/line-height:\s*var\(--tc-line-fact/)
    expect(source).toMatch(/\.tc-facts dt,\s*\n\.tc-facts dd \{[\s\S]*?margin:\s*0/)
  })

  it('applies the same computed fact-grid tokens on Home for every bank', () => {
    window.localStorage.clear()
    render(<App />)
    const root = screen.getByTestId('theme-root')
    for (const themeId of THEME_IDS) {
      expect(root.getAttribute('data-theme'), themeId).toBe(themeId)
      const type = screen.getByTestId('txn-type')
      expect(type.textContent).toBe('Cash withdrawal above the branch threshold')
      const grid = type.closest('dl')
      expect(grid, themeId).toBeTruthy()
      expect(grid?.className, themeId).toContain('tc-kv')
      expect(grid?.className, themeId).not.toContain('tc-facts')
      const amount = screen.getByTestId('txn-amount')
      expect(amount.className, themeId).toContain('tc-amount')
      expect(amount.textContent, themeId).toMatch(/\$/)
      fireEvent.keyDown(window, { key: 'T' })
    }
  })

  it('measures Amount optical center, equal row gaps, and the space-4 column gap in Chromium at 1280', () => {
    const script = join(cwd(), 'scripts/measure-fact-grid.mjs')
    const result = spawnSync(execPath, [script, '--fixture'], {
      encoding: 'utf8',
      cwd: cwd(),
      timeout: 90_000,
      env,
    })
    if (result.status === 2) {
      throw new Error(result.stderr || result.stdout || 'playwright unavailable')
    }
    expect(result.stderr || '', result.stdout).not.toMatch(/Error/)
    expect(result.status, result.stderr || result.stdout).toBe(0)
    const measured = parseMeasureJson(result.stdout)
    expect(measured.typeValue).toBe('Cash withdrawal above the branch threshold')
    expect(measured.amountCenterDeltaPx).toBeLessThanOrEqual(1)
    expect(measured.rowGapDeltaPx).toBeLessThanOrEqual(1)
    expect(measured.columnGapPx).toBe(16)
    expect(Math.abs(measured.typeToAmountGapPx - measured.amountToMemoGapPx)).toBeLessThanOrEqual(1)
  }, 90_000)
})
