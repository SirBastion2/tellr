// Vitest runs this file on Node. The web tsconfig does not load @types/node.
// @ts-expect-error node:fs is provided by the test runner
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('favicon', () => {
  it('links a public SVG icon from index.html', () => {
    const html = readFileSync('index.html', 'utf8')
    const icon = readFileSync('public/favicon.svg', 'utf8')
    expect(html).toMatch(/<link[^>]+rel="icon"[^>]+href="\/favicon\.svg"/)
    expect(icon).toMatch(/<svg[\s\S]*<\/svg>/)
    expect(icon).toContain('xmlns="http://www.w3.org/2000/svg"')
  })
})
