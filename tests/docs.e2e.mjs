import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const url = process.env.FLAPKIT_DOCS_URL || 'http://localhost:5173'
let browser

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function openDocs(page) {
  let lastError
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      await page.locator('#quick-start canvas').first().waitFor({ timeout: 20_000 })
      const body = await page.locator('body').innerText()
      if (/module not found|failed to compile|internal server error/i.test(body)) {
        throw new Error('the docs development server is temporarily rebuilding')
      }
      return
    } catch (error) {
      lastError = error
      await sleep(1_000)
    }
  }
  throw lastError
}

async function reveal(page, id, readySelector) {
  const section = page.locator(`#${id}`)
  await section.evaluate((element) =>
    element.scrollIntoView({ behavior: 'instant', block: 'center' }),
  )
  await section.locator(readySelector).first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(100)
  return section
}

async function assertNoFlips(section, action, label) {
  const before = await section.evaluate((element) => ({
    calls: window.__docsAnimateCalls?.filter((entry) => entry.section === element.id).length ?? 0,
    playing: [...element.querySelectorAll('[data-slot="moving-leaf"]')].filter(
      (leaf) => Number.parseFloat(getComputedStyle(leaf).opacity) > 0.01,
    ).length,
  }))
  assert.equal(before.calls, 0, `${label}: a flip already ran on entry`)
  assert.equal(await section.locator('canvas').count(), 0, `${label}: unexpected Canvas renderer`)
  assert.equal(before.playing, 0, `${label}: moving leaves were visible before interaction`)
  await action()
  await section.page().waitForTimeout(80)
  const after = await section.evaluate((element) => ({
    calls: window.__docsAnimateCalls?.filter((entry) => entry.section === element.id).length ?? 0,
    playing: [...element.querySelectorAll('[data-slot="moving-leaf"]')].filter(
      (leaf) => Number.parseFloat(getComputedStyle(leaf).opacity) > 0.01,
    ).length,
    running: [...element.querySelectorAll('[data-slot="moving-leaf"]')]
      .flatMap((leaf) => leaf.getAnimations())
      .filter((animation) => animation.playState === 'running').length,
  }))
  assert.equal(after.calls, before.calls, `${label}: called Element.animate`)
  assert.equal(after.playing, 0, `${label}: displayed a moving leaf`)
  assert.equal(after.running, 0, `${label}: left a Web Animation running`)
  assert.equal(
    await section.locator('canvas').count(),
    0,
    `${label}: mounted Canvas on interaction`,
  )
}

async function desktop(page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openDocs(page)

  const nav = page.locator('nav[aria-label="Documentation"]')
  const navCenter = async () =>
    nav.evaluate((element) => {
      const box = element.getBoundingClientRect()
      return box.top + box.height / 2
    })
  const centerBefore = await navCenter()
  assert.ok(
    Math.abs(centerBefore - 450) <= 1,
    `navigation is not vertically centered (${centerBefore})`,
  )
  await page.evaluate(() =>
    scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
  )
  await page.waitForTimeout(100)
  assert.ok(Math.abs((await navCenter()) - centerBefore) <= 1, 'navigation moved while scrolling')

  const composition = await reveal(page, 'composition', '.composition-preview')
  await assertNoFlips(composition, async () => {}, 'Composition initial entry')
  assert.match(await composition.locator('.flapkit-sr-only').first().textContent(), /深圳/)
  await reveal(page, 'sound', 'button')
  await assertNoFlips(
    composition,
    async () => {
      await reveal(page, 'composition', '.composition-preview')
    },
    'Composition re-entry',
  )

  const looks = await reveal(page, 'looks', '[role="group"][aria-label="Look"]')
  await assertNoFlips(looks, async () => {}, 'Looks initial entry')
  for (const option of ['airport', 'industrial', 'custom']) {
    await assertNoFlips(
      looks,
      async () => {
        await looks.getByRole('button', { name: option, exact: true }).click()
      },
      `Looks ${option} switch`,
    )
    assert.equal(
      await looks.getByRole('button', { name: option, exact: true }).getAttribute('aria-pressed'),
      'true',
    )
  }
  assert.match(await looks.locator('.flapkit-sr-only').textContent(), /FLAPKIT/)
  await reveal(page, 'sound', 'button')
  await assertNoFlips(
    looks,
    async () => {
      await reveal(page, 'looks', '[role="group"][aria-label="Look"]')
    },
    'Looks re-entry',
  )

  const decks = await reveal(page, 'decks', 'button')
  const play = decks.getByRole('button', { name: 'Play', exact: true })
  const finalText = () => decks.locator('.flapkit-sr-only').innerText()
  for (let click = 0; click < 4; click++) {
    await play.click()
    await page.waitForTimeout(2_600)
  }
  assert.equal(await finalText(), '서울🌸🎵')
  await play.click()
  const settledAt = await page.evaluate(async () => {
    const leaves = [...document.querySelectorAll('#decks [data-slot="moving-leaf"]')]
    const start = performance.now()
    const lastActive = Array(leaves.length).fill(null)
    let quietSince = null
    while (performance.now() - start < 10_000) {
      let active = false
      leaves.forEach((leaf, index) => {
        if (Number.parseFloat(getComputedStyle(leaf).opacity) > 0.01) {
          active = true
          lastActive[index] = performance.now() - start
        }
      })
      quietSince = active ? null : (quietSince ?? performance.now())
      if (
        lastActive.every((time) => time !== null) &&
        quietSince &&
        performance.now() - quietSince > 200
      )
        break
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    return lastActive
  })
  assert.equal(settledAt.length, 4, 'Deck preview must have four independently animated cells')
  assert.ok(
    settledAt.every((time) => time !== null) &&
      settledAt[0] > settledAt[1] &&
      settledAt[1] > settledAt[2] &&
      settledAt[2] > settledAt[3],
    `Deck cells did not independently settle in physical-distance order 39,29,7,3: ${settledAt.join(',')}`,
  )
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('#decks [data-slot="moving-leaf"]')].every(
        (leaf) => Number.parseFloat(getComputedStyle(leaf).opacity) <= 0.01,
      ),
    null,
    { timeout: 10_000 },
  )
  assert.equal(await finalText(), '大阪🍣🍵')
  const glyphs = await decks.locator('.flapkit-glyph').allTextContents()
  for (const character of ['大', '阪', '🍣', '🍵']) {
    assert.equal(
      glyphs.filter((glyph) => glyph === character).length,
      4,
      `${character} is not displayed on all four glyph faces`,
    )
  }

  const motion = await reveal(page, 'motion', '[role="group"][aria-label="Motion"]')
  const imports = {
    'Cascade\n(Canvas)': "import { cascade } from 'flapkit/motion/canvas/cascade'",
    'Riffle\n(Canvas)': "import { riffle } from 'flapkit/motion/canvas/riffle'",
    'Cascade\n(CSS)': "import { cascade } from 'flapkit/motion/css/cascade'",
  }
  for (const [name, expected] of Object.entries(imports)) {
    await motion.getByRole('button', { name }).click()
    await page.waitForTimeout(50)
    assert.match(
      await motion.locator('[aria-label="Code example"]').innerText(),
      new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    )
  }

  const sound = await reveal(page, 'sound', 'button')
  const snippet = await sound.locator('[aria-label="Code example"]').innerText()
  assert.match(snippet, /import \{ mechanicalSound \} from 'flapkit\/sound'/)
  assert.ok(snippet.trim().split('\n').length <= 12, 'Sound snippet is no longer concise')
  assert.ok(!/motion=|riffle|Flapkit.Cell/.test(snippet), 'Sound snippet includes unrelated setup')
  const soundButton = sound.getByRole('button', { name: /^(Play|Replay) sounds$/ })
  assert.equal(await soundButton.locator('svg').count(), 1, 'Sound play/replay icon is missing')
  await soundButton.click()
  assert.equal(await sound.getByRole('button', { name: 'Replay sounds', exact: true }).count(), 1)
}

async function mobile(page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await openDocs(page)
  for (const id of [
    'quick-start',
    'how-it-works',
    'composition',
    'decks',
    'looks',
    'motion',
    'sound',
  ]) {
    assert.equal(await page.locator(`#${id}`).count(), 1, `missing #${id}`)
  }
  const looks = await reveal(page, 'looks', '[role="group"][aria-label="Look"]')
  const options = looks.locator('[role="group"][aria-label="Look"] button')
  assert.equal(await options.count(), 3)
  for (const option of ['airport', 'industrial', 'custom']) {
    await looks.getByRole('button', { name: option, exact: true }).click()
    assert.equal(
      await looks.getByRole('button', { name: option, exact: true }).getAttribute('aria-pressed'),
      'true',
    )
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  assert.ok(overflow <= 1, `mobile page overflows horizontally by ${overflow}px`)
}

try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  await context.addInitScript(() => {
    window.__docsAnimateCalls = []
    const animate = Element.prototype.animate
    Element.prototype.animate = function (...args) {
      const section = this.closest?.('#composition, #looks')
      if (section && this.matches?.('[data-slot="moving-leaf"]')) {
        window.__docsAnimateCalls.push({
          section: section.id,
          opacity: getComputedStyle(this).opacity,
        })
      }
      return animate.apply(this, args)
    }
  })
  const page = await context.newPage()
  await desktop(page)
  await mobile(page)
  console.log('Docs E2E regression checks passed (desktop and 390px mobile).')
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await browser?.close()
}
