/**
 * Headless Chrome measurements for the shared Type / Amount / Memo fact grid.
 * No screenshots. Viewport is 1280 wide.
 *
 *   node scripts/measure-fact-grid.mjs --fixture
 *   node scripts/measure-fact-grid.mjs http://127.0.0.1:5173
 */
import { createRequire } from 'node:module'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const WEB_DIR = join(SCRIPT_DIR, '..')
const LONG_TYPE = 'Cash withdrawal above the branch threshold'
const VIEWPORT = { width: 1280, height: 720 }
const SLACK = 1

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

function fixtureHtml() {
  const raw = readFileSync(join(WEB_DIR, 'src/index.css'), 'utf8').replace(/@import[^;]+;/g, '')
  return `<!DOCTYPE html>
<html lang="en" style="font-size: 105%">
  <head>
    <meta charset="utf-8" />
    <style>${raw}
      body {
        margin: 0;
        font-family: Poppins, "Segoe UI", system-ui, sans-serif;
        font-size-adjust: 0.52;
        padding: 24px;
      }
      .tc-kv, .tc-facts { width: min(36rem, calc(1280px * 3 / 5 - 48px)); }
    </style>
  </head>
  <body>
    <dl class="tc-kv" data-testid="txn-facts">
      <dt class="tc-fact-term">Type</dt>
      <dd><span data-testid="txn-type">${LONG_TYPE}</span></dd>
      <dt class="tc-fact-term">Amount</dt>
      <dd><span data-testid="txn-amount" class="tc-amount">$8,000</span></dd>
      <dt class="tc-fact-term">Memo</dt>
      <dd><span>Says a contractor needs cash today</span></dd>
    </dl>
    <dl class="tc-facts" data-testid="shared-facts" style="margin-top: 24px">
      <dt class="tc-fact-term">Type</dt>
      <dd class="tc-fact-value">${LONG_TYPE}</dd>
      <dt class="tc-fact-term">Amount</dt>
      <dd class="tc-fact-value"><span class="tc-amount">$8,000</span></dd>
      <dt class="tc-fact-term">Memo</dt>
      <dd class="tc-fact-value">Says a contractor needs cash today</dd>
    </dl>
  </body>
</html>`
}

function collectFacts(rootSelector) {
  const slack = 1
  const grid = document.querySelector(rootSelector)
  if (!grid) {
    return { error: `missing ${rootSelector}` }
  }
  const dts = Array.from(grid.querySelectorAll(':scope > dt'))
  const dds = Array.from(grid.querySelectorAll(':scope > dd'))
  if (dts.length < 3 || dds.length < 3) {
    return { error: 'expected Type / Amount / Memo rows' }
  }
  const midY = (el) => {
    const box = el.getBoundingClientRect()
    return (box.top + box.bottom) / 2
  }
  const rowBox = (dt, dd) => {
    const a = dt.getBoundingClientRect()
    const b = dd.getBoundingClientRect()
    return {
      top: Math.min(a.top, b.top),
      bottom: Math.max(a.bottom, b.bottom),
      labelRight: a.right,
      valueLeft: b.left,
    }
  }
  const typeRow = rowBox(dts[0], dds[0])
  const amountRow = rowBox(dts[1], dds[1])
  const memoRow = rowBox(dts[2], dds[2])
  const amountValue = dds[1].querySelector('.tc-amount') ?? dds[1]
  const typeValue = (document.querySelector('[data-testid="txn-type"]') ?? dds[0]).textContent.trim()
  const style = getComputedStyle(grid)
  const typeToAmountGapPx = Number((amountRow.top - typeRow.bottom).toFixed(2))
  const amountToMemoGapPx = Number((memoRow.top - amountRow.bottom).toFixed(2))
  const amountCenterDeltaPx = Number(Math.abs(midY(dts[1]) - midY(amountValue)).toFixed(2))
  const columnGapPx = Number((amountRow.valueLeft - amountRow.labelRight).toFixed(2))
  return {
    typeValue,
    alignItems: style.alignItems,
    computedColumnGap: style.columnGap,
    computedRowGap: style.rowGap,
    amountCenterDeltaPx,
    typeToAmountGapPx,
    amountToMemoGapPx,
    rowGapDeltaPx: Number(Math.abs(typeToAmountGapPx - amountToMemoGapPx).toFixed(2)),
    columnGapPx,
    pass:
      amountCenterDeltaPx <= slack &&
      Math.abs(typeToAmountGapPx - amountToMemoGapPx) <= slack &&
      Math.abs(columnGapPx - 16) <= slack,
  }
}

async function measurePage(page, selector) {
  return page.evaluate(collectFacts, selector)
}

async function main() {
  const arg = process.argv[2]
  const fixture = arg === '--fixture' || arg === undefined
  const liveUrl = fixture ? null : arg
  const playwrightPath = resolvePlaywright()
  if (!playwrightPath) {
    console.error('playwright is not installed')
    process.exit(2)
  }
  const { chromium } = await import(pathToFileURL(playwrightPath).href)
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  })
  const page = await browser.newPage({ viewport: VIEWPORT })
  if (liveUrl) {
    await page.goto(liveUrl, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.getByTestId('transaction-panel').waitFor({ state: 'visible', timeout: 15_000 })
    await page.getByTestId('txn-type').waitFor({ state: 'visible' })
  } else {
    await page.setContent(fixtureHtml(), { waitUntil: 'load' })
  }
  const selector = liveUrl ? '[data-testid="transaction-panel"] .tc-kv' : '[data-testid="txn-facts"]'
  const home = await measurePage(page, selector)
  const shared = fixture ? await measurePage(page, '[data-testid="shared-facts"]') : null
  const report = {
    viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
    mode: liveUrl ? 'live' : 'fixture',
    typeValue: home.typeValue,
    amountCenterDeltaPx: home.amountCenterDeltaPx,
    typeToAmountGapPx: home.typeToAmountGapPx,
    amountToMemoGapPx: home.amountToMemoGapPx,
    rowGapDeltaPx: home.rowGapDeltaPx,
    columnGapPx: home.columnGapPx,
    alignItems: home.alignItems,
    computedColumnGap: home.computedColumnGap,
    computedRowGap: home.computedRowGap,
    shared,
    pass: Boolean(home.pass) && (shared ? Boolean(shared.pass) : true),
  }
  console.log(JSON.stringify(report))
  await browser.close()
  if (home.error) {
    console.error(home.error)
    process.exit(1)
  }
  if (!report.pass) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
