/**
 * Headless Chrome check that Home fits the demo window.
 * Not part of `scripts/gate.sh b`. No screenshots.
 *
 *   node scripts/measure-home-viewport.mjs http://127.0.0.1:5173
 */
import { createRequire } from 'node:module'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const BASE = process.argv[2] ?? 'http://127.0.0.1:5173'
const THEMES = ['tellr', 'pnc', 'mtb', 'fnb']
const SCHEMES = ['light', 'dark']
const VIEWPORTS = [
  { width: 1470, height: 780 },
  { width: 1440, height: 760 },
  { width: 1280, height: 720 },
]

function resolvePlaywright() {
  const require = createRequire(import.meta.url)
  const tryResolve = (paths) => {
    try {
      return require.resolve('playwright', paths ? { paths } : undefined)
    } catch {
      return null
    }
  }
  const found = tryResolve()
  if (found) {
    return found
  }
  const npxRoot = join(homedir(), '.npm/_npx')
  if (!existsSync(npxRoot)) {
    return null
  }
  for (const dir of readdirSync(npxRoot)) {
    const hit = tryResolve([join(npxRoot, dir, 'node_modules')])
    if (hit) {
      return hit
    }
  }
  return null
}

function collect() {
  const slack = 1
  const doc = document.documentElement
  const footer = document.querySelector('[data-testid="theme-footer"]')
  const progress = document.querySelector('[data-testid="event-progress"]')
  const undo = document.querySelector('[data-testid="undo"]')
  const escalate = document.querySelector('[data-testid="escalate"]')
  const timeline = document.querySelector('[data-testid="demo-timeline"]')
  const copilot = document.querySelector('[data-testid="copilot-strip"]')
  const header = document.querySelector('[data-testid="app-header"]')
  const toolbar = document.querySelector('[data-testid="demo-toolbar"]')
  const box = (el) => {
    if (!el) {
      return null
    }
    const rect = el.getBoundingClientRect()
    return {
      top: Number(rect.top.toFixed(1)),
      bottom: Number(rect.bottom.toFixed(1)),
      height: Number(rect.height.toFixed(1)),
    }
  }
  const inView = (el) => {
    if (!el) {
      return false
    }
    const rect = el.getBoundingClientRect()
    return rect.height > 0 && rect.top >= -slack && rect.bottom <= window.innerHeight + slack
  }
  const timelineFits = timeline ? timeline.scrollHeight <= timeline.clientHeight + slack : false
  return {
    scrollHeight: doc.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: doc.scrollWidth,
    innerWidth: window.innerWidth,
    pageFits: doc.scrollHeight <= window.innerHeight + slack && doc.scrollWidth <= window.innerWidth + slack,
    events: document.querySelectorAll('[data-testid="demo-event"]').length,
    signals: document.querySelectorAll('[data-testid="signal-row"]').length,
    timelineScrollHeight: timeline ? timeline.scrollHeight : null,
    timelineClientHeight: timeline ? timeline.clientHeight : null,
    timelineFits,
    header: inView(header),
    toolbar: inView(toolbar),
    footer: inView(footer),
    progress: inView(progress),
    undo: inView(undo),
    escalate: inView(escalate),
    copilot: inView(copilot),
    footerText: (footer?.textContent ?? '').trim(),
    progressText: (progress?.getAttribute('aria-label') ?? '').trim(),
    boxes: {
      footer: box(footer),
      progress: box(progress),
      undo: box(undo),
      copilot: box(copilot),
    },
  }
}

async function main() {
  const playwrightPath = resolvePlaywright()
  if (!playwrightPath) {
    console.error('playwright is not installed')
    process.exit(2)
  }
  const require = createRequire(import.meta.url)
  const { chromium } = require(playwrightPath)
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  })
  const rows = []
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const scheme of SCHEMES) {
        const page = await browser.newPage({ viewport })
        await page.addInitScript((value) => {
          localStorage.setItem('teller.colorScheme', value)
        }, scheme)
        await page.goto(`${BASE}/?theme=${theme}`, { waitUntil: 'networkidle', timeout: 30_000 })
        await page.getByTestId('demo-step').waitFor({ state: 'visible', timeout: 15_000 })
        for (let step = 1; step <= 5; step += 1) {
          await page.getByTestId('demo-step').click()
          await page.waitForFunction(
            (count) => document.querySelectorAll('[data-testid="demo-event"]').length >= count,
            step,
            { timeout: 15_000 },
          )
        }
        await page.waitForFunction(
          () => document.querySelectorAll('[data-testid="signal-row"]').length >= 5,
          { timeout: 15_000 },
        )
        const measured = await page.evaluate(collect)
        rows.push({ viewport: `${viewport.width}x${viewport.height}`, theme, scheme, ...measured })
        await page.close()
      }
    }
  }
  console.log(JSON.stringify(rows, null, 2))
  await browser.close()
  const failed = rows.filter((row) => !row.pageFits || !row.footer || !row.progress || !row.undo || !row.escalate || !row.copilot || !row.header || !row.toolbar)
  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
