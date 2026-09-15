import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import worker from '../website/worker.mjs'
const origin = process.env.FLAPKIT_SITE_ORIGIN ?? 'http://127.0.0.1:5192'
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`)
  })
  for (const path of ['', 'lab/', 'experiments/', 'performance/']) {
    const response = await page.goto(`${origin}/flapkit/${path}`)
    assert.equal(response.status(), 200)
    await page.waitForTimeout(1200)
    assert.equal(
      await page.locator('link[rel=canonical]').getAttribute('href'),
      `https://cuvii.dev/flapkit/${path}`,
    )
    assert.ok((await page.locator('[data-slot=cassette]').count()) > 0)
    if (path) assert.ok((await page.locator('a[href="/flapkit/"]').count()) > 0)
  }
  assert.deepEqual(errors, [])
  for (const name of ['click.wav', 'settle.wav']) {
    const audio = await page.evaluate(async (url) => {
      const response = await fetch(url)
      const context = new AudioContext()
      const decoded = await context.decodeAudioData(await response.arrayBuffer())
      await context.close()
      return { status: response.status, duration: decoded.duration }
    }, `${origin}/flapkit/audio/${name}`)
    assert.equal(audio.status, 200)
    assert.ok(audio.duration > 0)
  }
  assert.equal((await page.request.get(`${origin}/flapkit/missing-page`)).status(), 404)
  const redirect = worker.fetch(new Request('https://flapkit.cuvii.dev/lab/?example=1'), {})
  assert.equal(redirect.status, 301)
  assert.equal(redirect.headers.get('location'), 'https://cuvii.dev/flapkit/lab/?example=1')
  console.log(
    'PASS: four pages, canonical URLs, return links, hydrated cassettes, no page/resource errors, decoded audio, 404, legacy redirect',
  )
} finally {
  await browser.close()
}
