import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { DURATION, finalRows } from './timeline.ts'

const CAPTURE_RATE = 4
const output = fileURLToPath(new URL('./output/', import.meta.url))
await mkdir(output, { recursive: true })
async function record(theme) {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  let motionSamples
  const frames = []
  let startedAt
  const frameDirectory = resolve(output, `capture-${theme}-${Date.now()}`)
  await mkdir(frameDirectory)
  try {
    const url = new URL(process.env.FLAPKIT_VIDEO_URL ?? 'http://127.0.0.1:5189/')
    url.searchParams.set('capture', '')
    url.searchParams.set('theme', theme)
    await page.goto(url.href)
    await page.waitForFunction(() => window.flapkitFilm)
    const session = await context.newCDPSession(page)
    session.on('Page.screencastFrame', (event) => {
      frames.push({ time: event.metadata.timestamp, data: Buffer.from(event.data, 'base64') })
      void session.send('Page.screencastFrameAck', { sessionId: event.sessionId })
    })
    await session.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: 1920,
      maxHeight: 1080,
      everyNthFrame: 1,
    })
    startedAt = await page.evaluate((rate) => {
      const epoch = Date.now() / 1000
      window.filmSamples = []
      window.filmAudioEvents = []
      window.filmAudioStart = performance.now()
      const startedAt = performance.now()
      const timer = setInterval(() => {
        const seconds = (performance.now() - startedAt) / 1000 / rate
        const active = [...document.querySelectorAll('[data-slot="moving-leaf"]')].filter(
          (el) => +getComputedStyle(el).opacity > 0,
        ).length
        window.filmSamples.push({ seconds, active })
        if (seconds >= 9.8) clearInterval(timer)
      }, 100 * rate)
      window.flapkitFilm.play()
      return epoch
    }, CAPTURE_RATE)
    // Record actual elapsed browser time: no fake clocks, controller access or seeks.
    await page.waitForTimeout(DURATION * 1000 * CAPTURE_RATE)
    const audioEvents = await page.evaluate(
      (rate) =>
        window.filmAudioEvents.map((event) => ({
          ...event,
          at: (event.at - window.filmAudioStart) / rate / 1000,
        })),
      CAPTURE_RATE,
    )
    assert.ok(audioEvents.length > 0, 'Mechanical impact events must be recorded')
    await writeFile(resolve(output, 'mechanical-events.json'), JSON.stringify(audioEvents))
    motionSamples = await page.evaluate(() => window.filmSamples)
    const glyphs = await page.locator('[data-slot=cassette]').evaluateAll((cells) =>
      cells.map((cell) => {
        const glyph = cell.querySelector('[data-part=glyph]')
        return glyph?.textContent || glyph?.getAttribute('data-glyph') || ' '
      }),
    )
    assert.deepEqual(glyphs, finalRows.flat(), 'All four rows must reach their exact final copy')
    assert.equal(errors.length, 0, errors.join('\n'))
    assert.ok(
      motionSamples.filter((s) => s.seconds >= 1 && s.seconds <= 6).every((s) => s.active > 0),
      'No intermediate full-board stops',
    )
    await session.send('Page.stopScreencast')
    await context.close()
  } finally {
    await browser.close()
  }
  const captured = frames.filter(
    (frame) => frame.time >= startedAt && frame.time < startedAt + DURATION * CAPTURE_RATE,
  )
  assert.ok(captured.length > 100, 'Recording must contain actual compositor frames')
  const concat = []
  for (let index = 0; index < captured.length; index++) {
    const filename = `${String(index).padStart(5, '0')}.jpg`
    await writeFile(resolve(frameDirectory, filename), captured[index].data)
    const end = captured[index + 1]?.time ?? startedAt + DURATION * CAPTURE_RATE
    const start = index === 0 ? startedAt : captured[index].time
    concat.push(
      `file '${filename}'`,
      'option framerate 1000',
      `duration ${Math.max(0.001, (end - start) / CAPTURE_RATE)}`,
    )
  }
  concat.push(`file '${String(captured.length - 1).padStart(5, '0')}.jpg'`, 'option framerate 1000')
  await writeFile(resolve(frameDirectory, 'frames.txt'), concat.join('\n'))
  const file = resolve(output, `flapkit-${theme}.mp4`)
  const encode = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      resolve(frameDirectory, 'frames.txt'),
      '-vf',
      'fps=60,scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-colorspace',
      'bt709',
      '-t',
      String(DURATION),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '17',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      file,
    ],
    { encoding: 'utf8' },
  )
  assert.equal(encode.status, 0, encode.stderr)
  await writeFile(
    resolve(output, `verification-${theme}.json`),
    JSON.stringify(
      {
        mode: '4x slow recording through public motion parameters, restored to normal speed',
        duration: DURATION,
        compositorFrames: captured.length,
        width: 1920,
        height: 1080,
        motionSamples,
        pageErrors: errors,
        finalCopy: 'PASS',
      },
      null,
      2,
    ),
  )
  console.log(file)
  const gaps = captured
    .slice(1)
    .map((f, i) => (f.time - captured[i].time) / CAPTURE_RATE)
    .filter((_, i) => captured[i].time < startedAt + 8 * CAPTURE_RATE)
  console.log(
    JSON.stringify({
      theme,
      frames: captured.length,
      maxGap: Math.max(...gaps),
      over50ms: gaps.filter((g) => g > 0.05).length,
    }),
  )
}
await record('industrial')
await import('./edit.mjs')
