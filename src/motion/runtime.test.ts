import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  activeCssCassetteAttribute,
  signedLeafNoise,
  SplitFlapMotionController,
  type MotionTuning,
  type SplitFlapRuntime,
  type SplitFlapView,
} from './runtime'
import { resolveSplitFlapSource } from '../layout'

/** Minimal element stand-in covering the DOM surface the controller touches. */
function fakeElement() {
  const attributes = new Map<string, string>()
  const element = {
    animate: () => ({
      cancel() {},
      currentTime: 0,
      effect: { setKeyframes() {}, updateTiming() {} },
      pause() {},
      play() {},
      playState: 'running',
    }),
    dataset: {} as Record<string, string | undefined>,
    hasAttribute: (name: string) => attributes.has(name),
    removeAttribute: (name: string) => attributes.delete(name),
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    style: { setProperty() {} } as Record<string, unknown>,
    textContent: '',
  }
  return element as unknown as HTMLSpanElement
}

function fakeView(): SplitFlapView {
  return {
    animations: [],
    arrivingUpper: fakeElement(),
    arrivingUpperGlyph: fakeElement(),
    compact: true,
    compactMotion: false,
    movingBackGlyph: fakeElement(),
    movingFrontGlyph: fakeElement(),
    movingVane: fakeElement(),
    outgoingLower: fakeElement(),
    outgoingLowerGlyph: fakeElement(),
    root: fakeElement(),
    spareLeafPack: fakeElement(),
  }
}

function isActive(view: SplitFlapView) {
  return view.root.hasAttribute(activeCssCassetteAttribute)
}

const cascadeMotion: MotionTuning = {
  cadenceVariationPct: 0,
  finalSettleMs: 100,
  pitchMs: 20,
  reboundDeg: 2,
  rowDelayMs: 0,
  specularStrength: 0.82,
  startSpreadMs: 0,
  variant: 'cascade',
  withinRowJitterMs: 0,
}

function cells(value: string, count = value.length || 1) {
  return resolveSplitFlapSource({
    columns: [{ id: 'value', label: 'Value', cells: count }],
    rows: [{ id: 'row', values: { value } }],
  })
}

describe('Flapkit motion controller', () => {
  let now = 0
  let nextFrameId = 1
  let frames = new Map<number, FrameRequestCallback>()

  beforeEach(() => {
    now = 0
    nextFrameId = 1
    frames = new Map()
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextFrameId++
      frames.set(id, callback)
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function frame(at: number) {
    now = at
    const pending = [...frames.values()]
    frames.clear()
    pending.forEach((callback) => callback(at))
  }

  it('does not schedule work for fixed targets', () => {
    const layout = cells(' ')
    const controller = new SplitFlapMotionController(layout.cells)

    controller.setTargets(layout.targetIndices)

    expect(frames).toHaveLength(0)
    expect(controller.readPerformanceCounters().runningCassettes).toBe(0)
  })

  it('seeks one adjacent deck pitch without scheduling animation frames', () => {
    const controller = new SplitFlapMotionController(cells(' ').cells)
    let runtime: SplitFlapRuntime | undefined
    controller.registerCanvasRenderer((runtimes) => {
      runtime = runtimes[0]
    })

    controller.seekPitch(0, 2, 0.5)

    expect(runtime?.currentIndex).toBe(2)
    expect(runtime?.finalPitch).toBe(true)
    expect(runtime?.targetIndex).toBe(3)
    expect(runtime?.running).toBe(false)
    expect(frames).toHaveLength(0)

    controller.seekPitch(0, 2, 1)
    expect(runtime?.currentIndex).toBe(3)

    controller.seekPitch(0, 3, 0.5, false)
    expect(runtime?.finalPitch).toBe(false)
  })

  it('publishes a mechanical impact when a scrubbed pitch crosses the settle point', () => {
    const controller = new SplitFlapMotionController(cells(' ').cells)
    const listener = vi.fn()
    controller.subscribeMechanicalEvents(listener)

    controller.seekPitch(0, 2, 0.7, true, false)
    expect(listener).not.toHaveBeenCalled()

    controller.seekPitch(0, 2, 0.8, true, false)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toEqual([
      { at: expect.any(Number), final: false, index: 0, pan: 0 },
    ])

    controller.seekPitch(0, 2, 0.95, true, false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('starts only cells whose targets differ', () => {
    const controller = new SplitFlapMotionController(cells('  ', 2).cells)
    controller.setMotion(cascadeMotion)

    controller.setTargets(cells(' A', 2).targetIndices)

    expect(controller.readPerformanceCounters().runningCassettes).toBe(1)
    expect(frames).toHaveLength(1)
  })

  it('uses the 480ms squared ripple spread', () => {
    const controller = new SplitFlapMotionController(cells(' ').cells)
    let runtime: SplitFlapRuntime | undefined
    controller.registerCanvasRenderer((runtimes) => {
      runtime = runtimes[0]
    })
    controller.setMotion({
      ...cascadeMotion,
      startSpreadMs: 480,
      variant: 'riffle',
    })

    controller.setTargets(cells('A').targetIndices)

    const spreadPosition = (signedLeafNoise(0, 418) + 1) / 2
    expect(runtime?.pitchStart).toBeCloseTo(spreadPosition ** 2 * 480)
  })

  it('does not promote compact cascade views onto CSS 3D', () => {
    const controller = new SplitFlapMotionController(cells('  ', 2).cells)
    controller.setMotion({
      ...cascadeMotion,
      withinRowJitterMs: 16,
    })
    const views = [fakeView(), fakeView()]
    controller.registerView(0, views[0])
    controller.registerView(1, views[1])

    controller.setTargets(cells('AA', 2).targetIndices)
    frame(0)
    frame(200)

    expect(controller.readPerformanceCounters().activeCssCassettes).toBe(0)
    expect(views.map(isActive)).toEqual([false, false])
    expect(views.map((view) => view.compactMotion)).toEqual([false, false])
  })

  it('leaves a compact view unpromoted when it registers mid-cascade', () => {
    const controller = new SplitFlapMotionController(cells(' ').cells)
    controller.setMotion({ ...cascadeMotion, withinRowJitterMs: 16 })

    controller.setTargets(cells('A').targetIndices)
    frame(0)
    const view = fakeView()
    controller.registerView(0, view)

    expect(isActive(view)).toBe(false)
    expect(view.compactMotion).toBe(false)
  })

  it('publishes one look-ahead mechanical impact with final and pan metadata', () => {
    const controller = new SplitFlapMotionController(cells(' ').cells)
    controller.setMotion({ ...cascadeMotion, withinRowJitterMs: 16 })
    const listener = vi.fn()
    controller.subscribeMechanicalEvents(listener)

    controller.setTargets(cells('A').targetIndices)
    frame(0)
    frame(35)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toEqual([
      { at: expect.any(Number), final: true, index: 0, pan: 0 },
    ])
    expect(listener.mock.calls[0][0][0].at).toBeGreaterThanOrEqual(78)
    expect(listener.mock.calls[0][0][0].at).toBeLessThanOrEqual(94)

    frame(95)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('applies scheduled targets two frames after readiness', async () => {
    const controller = new SplitFlapMotionController(cells(' ').cells, cascadeMotion)

    controller.scheduleTargets(cells('A').targetIndices)
    expect(frames).toHaveLength(0)
    await Promise.resolve()
    expect(frames).toHaveLength(1)

    frame(0)
    expect(controller.readPerformanceCounters().runningCassettes).toBe(0)
    frame(16)
    expect(controller.readPerformanceCounters().runningCassettes).toBe(1)
  })

  it('lets a newer schedule supersede a pending one', async () => {
    const controller = new SplitFlapMotionController(cells(' ').cells, cascadeMotion)
    let runtime: SplitFlapRuntime | undefined
    controller.registerCanvasRenderer((runtimes) => {
      runtime = runtimes[0]
    })

    controller.scheduleTargets(cells('A').targetIndices)
    await Promise.resolve()
    frame(0)
    controller.scheduleTargets(cells('B').targetIndices)
    await Promise.resolve()
    frame(16)
    frame(32)

    expect(runtime?.targetIndex).toBe(cells('B').targetIndices[0])
    expect(controller.readPerformanceCounters().runningCassettes).toBe(1)
  })

  it('drops a pending schedule on destroy', async () => {
    const controller = new SplitFlapMotionController(cells(' ').cells, cascadeMotion)

    controller.scheduleTargets(cells('A').targetIndices)
    controller.destroy()
    await Promise.resolve()
    frame(0)
    frame(16)

    expect(frames).toHaveLength(0)
    expect(controller.readPerformanceCounters().runningCassettes).toBe(0)
  })

  it('schedules again after destroy (StrictMode remounts the same controller)', async () => {
    const controller = new SplitFlapMotionController(cells(' ').cells, cascadeMotion)

    controller.scheduleTargets(cells('A').targetIndices)
    controller.destroy()
    controller.scheduleTargets(cells('A').targetIndices)
    await Promise.resolve()
    frame(0)
    frame(16)

    expect(controller.readPerformanceCounters().runningCassettes).toBe(1)
  })

  it('cancels frames and clears subscriptions on destroy', () => {
    const controller = new SplitFlapMotionController(cells(' ').cells)
    controller.setMotion(cascadeMotion)
    const eventListener = vi.fn()
    const canvasRenderer = vi.fn()
    controller.subscribeMechanicalEvents(eventListener)
    controller.registerCanvasRenderer(canvasRenderer)
    controller.setTargets(cells('A').targetIndices)

    controller.destroy()
    controller.requestCanvasRender()
    frame(100)

    expect(frames).toHaveLength(0)
    expect(canvasRenderer).toHaveBeenCalledTimes(2)
    expect(eventListener).not.toHaveBeenCalled()
  })
})
