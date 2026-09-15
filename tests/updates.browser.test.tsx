/// <reference types="vite/client" />

import { act, createRef, StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot, type Root as ReactRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import {
  Board,
  Cell,
  Grid,
  Header,
  Root,
  Row,
  WideCell,
  createDeck,
  motion,
  type MotionAdapter,
} from 'flapkit'
import { cascade } from 'flapkit/motion/canvas/cascade'
import { cascade as cssCascade } from 'flapkit/motion/css/cascade'
import { riffle } from 'flapkit/motion/canvas/riffle'
import { useSplitFlapController } from '../src/motion/provider'
import type { SplitFlapMotionController } from '../src/motion/runtime'
import { SplitFlapSound } from '../src/sound/adapter'
import { SplitFlapSoundEngine } from '../src/sound/engine'
import '../src/styles/flapkit.css'
import '../src/styles/airport.css'
import '../src/styles/industrial.css'

const deck = createDeck(' AB')
const adapter = riffle({
  riffleMs: 100,
  finalSettleMs: 150,
  startSpreadMs: 0,
  cadenceVariationPct: 0,
})
let host: HTMLDivElement
let root: ReactRoot
let controller: SplitFlapMotionController

function Probe() {
  const value = useSplitFlapController()
  useEffect(() => {
    controller = value
  }, [value])
  return null
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  host.style.cssText = 'padding:24px;background:#ecece8;width:max-content'
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

async function render(children: ReactNode) {
  await act(async () => root.render(<StrictMode>{children}</StrictMode>))
  await document.fonts.ready
  // Flush initial measurement, the deferred target start, and ResizeObserver delivery.
  for (let index = 0; index < 4; index++) {
    await new Promise(requestAnimationFrame)
  }
}

function display({
  text = ' ',
  label = 'OLD',
  grid = false,
  look = 'airport',
  theme = '',
  className = '',
  schedule = adapter,
}: {
  text?: string
  label?: string
  grid?: boolean
  look?: string
  theme?: string
  className?: string
  schedule?: MotionAdapter
} = {}) {
  const Display = grid ? Grid : Board
  return (
    <Root motion={schedule} sound={<Probe />}>
      <Display data-look={look} data-theme={theme} className={className}>
        {!grid && <Header>FLAPKIT</Header>}
        <Row id="first" label={label} deck={deck}>
          <Cell>{text}</Cell>
        </Row>
        <Row id="second" label={label} deck={deck}>
          <Cell>{text}</Cell>
        </Row>
      </Display>
    </Root>
  )
}

// Freeze the real controller at a chosen frame without replacing the renderer or its geometry.
function freezePitch() {
  let frame: FrameRequestCallback | undefined
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frame = callback
    return 1
  })
  const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
  controller.setTargets([2, 2])
  return (elapsed: number) => {
    now.mockReturnValue(1000 + elapsed)
    frame?.(1000 + elapsed)
  }
}

it('plays CSS 3D cascade without a canvas and switches back to Canvas', async () => {
  const options = {
    pitchMs: 100,
    finalSettleMs: 180,
    rowDelayMs: 70,
    withinRowJitterMs: 0,
    cadenceVariationPct: 0,
  }
  await render(display({ schedule: cssCascade(options) }))
  expect(host.querySelector('canvas')).toBeNull()
  controller.setTargets([2, 1])
  await expect.poll(() => host.getAnimations({ subtree: true }).length).toBeGreaterThan(0)
  const transforms = host
    .getAnimations({ subtree: true })
    .flatMap((animation) =>
      (animation.effect as KeyframeEffect).getKeyframes().map((frame) => frame.transform),
    )
  expect(transforms.some((transform) => String(transform).includes('rotateX'))).toBe(true)
  await expect.poll(() => controller.readPerformanceCounters().runningCassettes).toBe(0)
  // DOM geometry alone cannot detect lower leaves hidden behind the 3D cavity.
  if (import.meta.env.FLAPKIT_VISUAL_TESTS) {
    await expect.element(page.elementLocator(host)).toMatchScreenshot('css-settled')
  }

  await render(display({ text: 'B', schedule: cascade(options) }))
  expect(host.querySelector('canvas')).not.toBeNull()
  await render(display({ text: 'A', schedule: cssCascade(options) }))
  expect(host.querySelector('canvas')).toBeNull()
  await expect.poll(() => host.getAnimations({ subtree: true }).length).toBeGreaterThan(0)
  await expect.poll(() => controller.readPerformanceCounters().runningCassettes).toBe(0)
})

it.runIf(import.meta.env.FLAPKIT_VISUAL_TESTS).each(['airport', 'industrial'])(
  'preserves %s idle and moving appearance',
  async (look) => {
    await render(display({ look }))
    await expect.element(page.elementLocator(host)).toMatchScreenshot(`${look}-idle`)
    const step = freezePitch()
    for (const elapsed of [30, 80, 180, 350]) {
      step(elapsed)
      await expect.element(page.elementLocator(host)).toMatchScreenshot(`${look}-${elapsed}ms`)
    }
  },
)

it.each([false, true])(
  'updates text and labels without replacing the controller (grid=%s)',
  async (grid) => {
    await render(display({ grid, text: 'A' }))
    const originalController = controller
    const cassette = host.querySelector('[data-split-flap-cassette]')
    await render(display({ grid, text: 'B', label: 'NEW' }))
    expect(controller).toBe(originalController)
    expect(host.querySelector('[data-split-flap-cassette]')).toBe(cassette)
    expect(host.querySelector('[aria-live]')?.textContent).toBe('NEW B. NEW B')
    if (!grid) expect(host.querySelector('.flapkit-board-column-label')?.textContent).toBe('NEW')
    await expect
      .poll(() =>
        host
          .querySelector('[data-slot="stationary-upper"] [data-slot="glyph"]')
          ?.getAttribute('data-glyph'),
      )
      .toBe('B')
  },
)

it.each([false, true])('exposes the stable styling anatomy (grid=%s)', async (grid) => {
  await render(display({ grid }))

  expect(host.querySelectorAll(`[data-slot="split-flap-${grid ? 'grid' : 'board'}"]`)).toHaveLength(
    1,
  )
  expect(host.querySelectorAll('[data-slot="row"]')).toHaveLength(2)
  expect(host.querySelectorAll('[data-slot="group"]')).toHaveLength(2)
  expect(host.querySelectorAll('[data-slot="cassette"]')).toHaveLength(2)
  expect(host.querySelectorAll('[data-part="face"]')).not.toHaveLength(0)
  expect(host.querySelectorAll('[data-part="retainer"]')).not.toHaveLength(0)
})

it('uses the latest schedule closure without remounting or restarting unchanged targets', async () => {
  const first = vi.fn<Parameters<typeof motion>[0]>((cells, context) =>
    cells.forEach((cell) => context.start(cell.index, context.now)),
  )
  const next = vi.fn<Parameters<typeof motion>[0]>((cells, context) =>
    cells.forEach((cell) => context.start(cell.index, context.now + 500)),
  )
  await render(display({ schedule: motion(first) }))
  const originalController = controller
  first.mockClear()
  await render(display({ schedule: motion(next) }))
  expect(next).not.toHaveBeenCalled()
  await render(display({ text: 'B', schedule: motion(next) }))
  expect(controller).toBe(originalController)
  expect(first).not.toHaveBeenCalled()
  expect(next).toHaveBeenCalledOnce()
  expect(next.mock.calls[0][0]).toHaveLength(2)
})

it('reapplies tuning after enabling, changing bank, and replacing prepareRef', async () => {
  vi.spyOn(SplitFlapSoundEngine.prototype, 'preload').mockImplementation(() => {})
  const tuning = vi.spyOn(SplitFlapSoundEngine.prototype, 'setTuning')
  const destroy = vi.spyOn(SplitFlapSoundEngine.prototype, 'destroy')
  const originalRef = createRef<(() => Promise<boolean>) | null>()
  const nextRef = createRef<(() => Promise<boolean>) | null>()
  const values = {
    volume: 0,
    clickLevel: 0.2,
    settleLevel: 0.3,
    stereoWidth: 0.4,
    pitchVariation: 0.02,
  }
  const tree = (enabled: boolean, url: string, prepareRef = originalRef) => (
    <Root
      motion={adapter}
      sound={
        <SplitFlapSound
          bank={{ clicks: [url], settles: [] }}
          enabled={enabled}
          prepareRef={prepareRef}
          {...values}
        />
      }
    >
      <Grid data-look="airport">
        <Row deck={deck}>
          <Cell> </Cell>
        </Row>
      </Grid>
    </Root>
  )
  await render(tree(false, '/first.wav'))
  expect(tuning).not.toHaveBeenCalled()
  for (const [url, ref] of [
    ['/first.wav', originalRef],
    ['/second.wav', originalRef],
    ['/second.wav', nextRef],
  ] as const) {
    tuning.mockClear()
    await render(tree(true, url, ref))
    expect(tuning).toHaveBeenCalledExactlyOnceWith(values)
    expect(ref.current).toBeTypeOf('function')
  }
  expect(originalRef.current).toBeNull()
  expect(destroy).toHaveBeenCalledTimes(2)
  await render(tree(false, '/second.wav', nextRef))
  expect(nextRef.current).toBeNull()
})

it('measures each cassette rather than treating equal class names as equal styles', async () => {
  await render(
    <>
      <style>{`
        .custom [data-part="face"] { background-color: rgb(20, 30, 200); }
        .custom [data-slot="row"]:nth-child(2) [data-part="face"] { background-color: rgb(200, 20, 30); }
      `}</style>
      {display({ className: 'custom' })}
    </>,
  )
  const colors: string[] = []
  const fillRect = CanvasRenderingContext2D.prototype.fillRect
  vi.spyOn(CanvasRenderingContext2D.prototype, 'fillRect').mockImplementation(function (
    this: CanvasRenderingContext2D,
    ...args
  ) {
    if (typeof this.fillStyle === 'string') colors.push(this.fillStyle)
    return fillRect.apply(this, args)
  })
  freezePitch()(30)
  expect(colors).toContain('#c8141e')
  expect(colors).toContain('#141ec8')
})

it('remeasures data attributes without relying on a resize', async () => {
  const css = `.themed[data-theme="red"] [data-part="face"] { background-color: rgb(200, 20, 30); }`
  await render(
    <>
      <style>{css}</style>
      {display({ className: 'themed' })}
    </>,
  )
  const size = host.getBoundingClientRect().toJSON()
  await render(
    <>
      <style>{css}</style>
      {display({ className: 'themed', theme: 'red' })}
    </>,
  )
  expect(host.getBoundingClientRect().toJSON()).toEqual(size)
  const colors: string[] = []
  const fillRect = CanvasRenderingContext2D.prototype.fillRect
  vi.spyOn(CanvasRenderingContext2D.prototype, 'fillRect').mockImplementation(function (
    this: CanvasRenderingContext2D,
    ...args
  ) {
    if (typeof this.fillStyle === 'string') colors.push(this.fillStyle)
    return fillRect.apply(this, args)
  })
  freezePitch()(30)
  expect(colors).toContain('#c8141e')
})

it('keeps zero-opacity glyphs transparent on canvas', async () => {
  const alphas: number[] = []
  const fillText = OffscreenCanvasRenderingContext2D.prototype.fillText
  vi.spyOn(OffscreenCanvasRenderingContext2D.prototype, 'fillText').mockImplementation(function (
    this: OffscreenCanvasRenderingContext2D,
    ...args
  ) {
    alphas.push(this.globalAlpha)
    return fillText.apply(this, args)
  })
  await render(
    <>
      <style>{`.transparent { --flapkit-glyph-opacity: 0; --flapkit-glyph-font-family: serif; }`}</style>
      {display({ className: 'transparent' })}
    </>,
  )
  expect(alphas.length).toBeGreaterThan(0)
  expect(alphas.every((alpha) => alpha === 0)).toBe(true)
})

it('measures per-row fonts for wide Latin and CJK glyphs and restores DOM attributes', async () => {
  const fonts = new Map<string, Set<string>>()
  const fillText = OffscreenCanvasRenderingContext2D.prototype.fillText
  vi.spyOn(OffscreenCanvasRenderingContext2D.prototype, 'fillText').mockImplementation(function (
    this: OffscreenCanvasRenderingContext2D,
    ...args
  ) {
    const values = fonts.get(args[0]) ?? new Set<string>()
    values.add(this.font)
    fonts.set(args[0], values)
    return fillText.apply(this, args)
  })
  const wideDeck = createDeck(['  ', 'AB', '中文'])
  await render(
    <>
      <style>{`
        .fonts [data-split-flap-glyph-part] { font-size: 19px; }
        .fonts [data-split-flap-row]:nth-child(2) [data-split-flap-glyph-part] { font-size: 31px; }
      `}</style>
      <Root motion={adapter} sound={<Probe />}>
        <Grid data-look="airport" className="fonts">
          <Row deck={wideDeck}>
            <WideCell>{'  '}</WideCell>
          </Row>
          <Row deck={wideDeck}>
            <WideCell>{'  '}</WideCell>
          </Row>
        </Grid>
      </Root>
    </>,
  )
  for (const character of ['A', '中']) {
    expect([...(fonts.get(character) ?? [])].some((font) => font.includes('19px'))).toBe(true)
    expect([...(fonts.get(character) ?? [])].some((font) => font.includes('31px'))).toBe(true)
  }
  expect(host.querySelector('[data-split-flap-script="cjk"]')).toBeNull()
  const frames = controller.readPerformanceCounters().canvasFrames
  await act(async () => {
    document.fonts.dispatchEvent(new Event('loadingdone'))
    await new Promise(requestAnimationFrame)
  })
  expect(controller.readPerformanceCounters().canvasFrames).toBeGreaterThan(frames)
  expect(host.querySelector('[data-split-flap-script="cjk"]')).toBeNull()
})

it('keeps measured colors during presentation updates and does not loop on its own DOM writes', async () => {
  const tree = (highlighted: boolean) => (
    <>
      <style>{`.colored [data-part="face"] { background-color: rgb(20, 30, 200); }`}</style>
      <Root motion={adapter} sound={<Probe />}>
        <Grid data-look="airport" className="colored">
          <Row deck={deck} highlighted={highlighted}>
            <Cell> </Cell>
            <Cell> </Cell>
          </Row>
        </Grid>
      </Root>
    </>
  )
  await render(tree(false))
  const frames = controller.readPerformanceCounters().canvasFrames
  for (let index = 0; index < 4; index++) await new Promise(requestAnimationFrame)
  expect(controller.readPerformanceCounters().canvasFrames).toBe(frames)
  const step = freezePitch()
  step(30)
  const colors: string[] = []
  const fillRect = CanvasRenderingContext2D.prototype.fillRect
  vi.spyOn(CanvasRenderingContext2D.prototype, 'fillRect').mockImplementation(function (
    this: CanvasRenderingContext2D,
    ...args
  ) {
    if (typeof this.fillStyle === 'string') colors.push(this.fillStyle)
    return fillRect.apply(this, args)
  })
  await act(async () => {
    root.render(<StrictMode>{tree(true)}</StrictMode>)
    await Promise.resolve()
  })
  // Measurement is deferred to RAF; an intervening motion frame must retain resolved colors.
  controller.requestCanvasRender()
  expect(colors).toContain('#141ec8')
  expect(colors).not.toContain('#282921')
})
