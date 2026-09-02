import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  signedLeafNoise,
  SplitFlapMotionController,
  type MotionTuning,
  type SplitFlapRuntime,
} from './runtime'
import { resolveSplitFlapSource } from '../layout'

const cascadeMotion: MotionTuning = {
  cadenceVariationPct: 0,
  finalSettleMs: 100,
  maximumConcurrentCassettes: 32,
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

  it('prewarms CSS cassettes and respects the concurrency limit', () => {
    const controller = new SplitFlapMotionController(cells('  ', 2).cells)
    controller.setMotion({
      ...cascadeMotion,
      maximumConcurrentCassettes: 1,
      withinRowJitterMs: 16,
    })
    const activity = [vi.fn(), vi.fn()]
    controller.subscribeCssCassette(0, activity[0])
    controller.subscribeCssCassette(1, activity[1])

    controller.setTargets(cells('AA', 2).targetIndices)
    frame(0)

    expect(controller.readPerformanceCounters().activeCssCassettes).toBe(1)
    expect(activity.map((listener) => listener.mock.calls)).toEqual([[[false], [true]], [[false]]])

    frame(200)
    frame(201)
    expect(activity[0]).toHaveBeenLastCalledWith(false)
    expect(activity[1]).toHaveBeenLastCalledWith(true)
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

  it('cancels frames and clears subscriptions on destroy', () => {
    const controller = new SplitFlapMotionController(cells(' ').cells)
    controller.setMotion(cascadeMotion)
    const cssListener = vi.fn()
    const eventListener = vi.fn()
    const canvasRenderer = vi.fn()
    controller.subscribeCssCassette(0, cssListener)
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
