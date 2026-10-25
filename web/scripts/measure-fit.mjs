/**
 * Headless Chrome measurements for laptop workstation fit.
 * Not part of `scripts/gate.sh b`. Run after Vite is up:
 *   node scripts/measure-fit.mjs http://127.0.0.1:5173
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173'
const VIEWPORTS = [
  { width: 1024, height: 700 },
  { width: 1280, height: 720 },
  { width: 1440, height: 800 },
]
const SCHEMES = ['light', 'dark']

function collectFit() {
  const slack = 1
  const header = document.querySelector('[data-testid="app-header"]')
  if (!header) {
    return { error: 'header missing' }
  }
  const headerBox = header.getBoundingClientRect()
  const named = [
    ['title', document.querySelector('.tc-header-title')],
    ['pill', document.querySelector('[data-testid="live-badge"]')],
    ['connection', document.querySelector('[data-testid="connection-status"]')],
    ['tabs', document.querySelector('[data-testid="app-nav"]')],
    ['theme-segment', document.querySelector('[data-testid="color-scheme"]')],
    ['theme-menu', document.querySelector('[data-testid="scheme-menu"]')],
    ['help', document.querySelector('[data-testid="shortcut-help-button"]')],
  ]
  const clipped = []
  for (const [name, el] of named) {
    if (!el) {
      continue
    }
    const visible =
      typeof el.checkVisibility === 'function'
        ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        : getComputedStyle(el).display !== 'none'
    if (!visible) {
      continue
    }
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') {
      continue
    }
    const box = el.getBoundingClientRect()
    const overflow = {
      left: Number((headerBox.left - box.left).toFixed(2)),
      right: Number((box.right - headerBox.right).toFixed(2)),
      top: Number((headerBox.top - box.top).toFixed(2)),
      bottom: Number((box.bottom - headerBox.bottom).toFixed(2)),
    }
    if (overflow.left > slack || overflow.right > slack || overflow.top > slack || overflow.bottom > slack) {
      clipped.push({ name, overflow, text: (el.textContent ?? '').trim().slice(0, 48) })
    }
  }
  const boxFit = (el) => {
    if (!el) {
      return null
    }
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      fits: el.scrollWidth <= el.clientWidth + slack,
    }
  }
  const scrollWidth = document.documentElement.scrollWidth
  const innerWidth = window.innerWidth
  return {
    scrollWidth,
    innerWidth,
    pageFits: scrollWidth <= innerWidth,
    headerFits: clipped.length === 0,
    clipped,
    title: document.querySelector('.tc-header-title')?.textContent?.trim() ?? '',
    themeVisible: getComputedStyle(document.querySelector('[data-testid="color-scheme"]') ?? document.body).display !== 'none',
    transaction: boxFit(document.querySelector('[data-testid="transaction-panel"]')),
    copilot: boxFit(document.querySelector('[data-testid="copilot-strip"]')),
    workstation: boxFit(document.querySelector('.tc-workstation')),
  }
}

async function playSample(page) {
  const picker = page.getByTestId('customer-picker')
  await picker.waitFor({ state: 'visible', timeout: 15_000 })
  const value = await picker.inputValue()
  if (value !== 'contractor-cash') {
    await picker.selectOption('contractor-cash')
  }
  await page.getByTestId('demo-step').click()
  await page.getByTestId('live-badge').waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByTestId('copilot-strip').waitFor({ state: 'visible' })
  await page.getByTestId('transaction-panel').waitFor({ state: 'visible' })
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  })
  const rows = []
  let failed = 0
  for (const viewport of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      const page = await browser.newPage({ viewport })
      await page.goto(`${BASE}/?theme=fnb`, { waitUntil: 'networkidle', timeout: 30_000 })
      await page.getByTestId(`scheme-${scheme}`).click({ timeout: 5_000 }).catch(async () => {
        await page.getByTestId('scheme-menu').selectOption(scheme)
      })
      await playSample(page)
      const measured = await page.evaluate(collectFit)
      const pass =
        Boolean(measured.pageFits) &&
        Boolean(measured.headerFits) &&
        Boolean(measured.transaction?.fits) &&
        Boolean(measured.copilot?.fits)
      if (!pass) {
        failed += 1
      }
      const row = {
        viewport: `${viewport.width}x${viewport.height}`,
        scheme,
        scrollWidth: measured.scrollWidth,
        innerWidth: measured.innerWidth,
        result: pass ? 'pass' : 'fail',
        headerFits: measured.headerFits,
        title: measured.title,
        clipped: measured.clipped,
        transaction: measured.transaction,
        copilot: measured.copilot,
      }
      rows.push(row)
      console.log(JSON.stringify(row))
      await page.close()
    }
  }
  await browser.close()
  console.log(JSON.stringify({ failed, rows }, null, 2))
  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
