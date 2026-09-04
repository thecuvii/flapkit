import { splitFlapGraphemes, type Position, type Variant } from '../deck'
import { type ResolvedSplitFlapCell } from '../layout'
// Motion controller shared by the Riffle and Cascade adapters.
import type { SplitFlapMechanicalEvent, SplitFlapMechanicalEventSource } from '../sound/engine'

export type SplitFlapMotionVariant = 'riffle' | 'cascade' | 'scrub'

const cssMotionPrewarmMs = 17
const mechanicalSoundLookaheadMs = 60
const mechanicalSoundMaxLatenessMs = 34
export const specularProperty = '--flapkit-specular'
export const stackShiftProperty = '--flapkit-stack-shift'
export const activeGlyphColorProperty = '--flapkit-active-glyph-color'
let specularPropertyRegistered = false
let stackShiftPropertyRegistered = false

const compactRiffleVaneKeyframes: Keyframe[] = [
  { offset: 0, transform: 'translate3d(0, 0, 0) rotateX(0deg)' },
  { offset: 0.28, transform: 'translate3d(0, 0, 0) rotateX(-55deg)' },
  { offset: 0.5, transform: 'translate3d(0, 0, 0) rotateX(-90deg)' },
  { offset: 0.68, transform: 'translate3d(0, 0, 0) rotateX(-125deg)' },
  { offset: 0.82, transform: 'translate3d(0, 0, 0) rotateX(-180deg)' },
  { offset: 1, transform: 'translate3d(0, 0, 0) rotateX(-180deg)' },
]

const riffleStackKeyframes: Keyframe[] = [
  { offset: 0, [stackShiftProperty]: '0cqw' },
  { offset: 0.45, [stackShiftProperty]: '0cqw' },
  { offset: 0.72, [stackShiftProperty]: '0.08cqw' },
  { offset: 0.82, [stackShiftProperty]: '0.18cqw' },
  { offset: 0.9, [stackShiftProperty]: '-0.03cqw' },
  { offset: 1, [stackShiftProperty]: '0cqw' },
]

const settleStackKeyframes: Keyframe[] = [
  { offset: 0, [stackShiftProperty]: '0cqw' },
  { offset: 0.42, [stackShiftProperty]: '0cqw' },
  { offset: 0.65, [stackShiftProperty]: '0.08cqw' },
  { offset: 0.78, [stackShiftProperty]: '0.2cqw' },
  { offset: 0.9, [stackShiftProperty]: '-0.045cqw' },
  { offset: 1, [stackShiftProperty]: '0cqw' },
]

const riffleStackTransformKeyframes: Keyframe[] = [
  { offset: 0, transform: 'translate3d(0, 0, 0)' },
  { offset: 0.45, transform: 'translate3d(0, 0, 0)' },
  { offset: 0.72, transform: 'translate3d(0, 0.08cqw, 0)' },
  { offset: 0.82, transform: 'translate3d(0, 0.18cqw, 0)' },
  { offset: 0.9, transform: 'translate3d(0, -0.03cqw, 0)' },
  { offset: 1, transform: 'translate3d(0, 0, 0)' },
]

const settleStackTransformKeyframes: Keyframe[] = [
  { offset: 0, transform: 'translate3d(0, 0, 0)' },
  { offset: 0.42, transform: 'translate3d(0, 0, 0)' },
  { offset: 0.65, transform: 'translate3d(0, 0.08cqw, 0)' },
  { offset: 0.78, transform: 'translate3d(0, 0.2cqw, 0)' },
  { offset: 0.9, transform: 'translate3d(0, -0.045cqw, 0)' },
  { offset: 1, transform: 'translate3d(0, 0, 0)' },
]

function compactSettleVaneKeyframes(reboundDeg: number): Keyframe[] {
  return [
    { offset: 0, transform: 'translate3d(0, 0, 0) rotateX(0deg)' },
    { offset: 0.34, transform: 'translate3d(0, 0, 0) rotateX(-55deg)' },
    { offset: 0.5, transform: 'translate3d(0, 0, 0) rotateX(-90deg)' },
    { offset: 0.62, transform: 'translate3d(0, 0, 0) rotateX(-125deg)' },
    { offset: 0.78, transform: 'translate3d(0, 0, 0) rotateX(-180deg)' },
    {
      offset: 0.9,
      transform: `translate3d(0, 0, 0) rotateX(${-180 + reboundDeg}deg)`,
    },
    { offset: 1, transform: 'translate3d(0, 0, 0) rotateX(-180deg)' },
  ]
}

function ensureSpecularProperty() {
  if (specularPropertyRegistered || typeof CSS === 'undefined' || !CSS.registerProperty) return
  specularPropertyRegistered = true

  try {
    CSS.registerProperty({
      name: specularProperty,
      syntax: '<number>',
      inherits: true,
      initialValue: '0',
    })
  } catch {
    // The property may already be registered by a previous hot-reload module.
  }
}

function ensureStackShiftProperty() {
  if (stackShiftPropertyRegistered || typeof CSS === 'undefined' || !CSS.registerProperty) return
  stackShiftPropertyRegistered = true

  try {
    CSS.registerProperty({
      name: stackShiftProperty,
      syntax: '<length>',
      inherits: false,
      initialValue: '0px',
    })
  } catch {
    // The property may already be registered by a previous hot-reload module.
  }
}

export function signedLeafNoise(index: number, salt: number) {
  let hash = Math.imul(index + 1 + salt * 101, 0x45d9f3b)
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b)
  hash ^= hash >>> 16
  return ((hash >>> 0) / 0xffffffff) * 2 - 1
}

export type MotionTuning = {
  cadenceVariationPct: number
  finalSettleMs: number
  maximumConcurrentCassettes: number
  pitchMs: number
  reboundDeg: number
  rowDelayMs: number
  specularStrength: number
  startSpreadMs: number
  variant: SplitFlapMotionVariant
  withinRowJitterMs: number
}

/** @internal DOM adapter contract; not part of the package's public entry points. */
export type SplitFlapView = {
  animations: Animation[]
  arrivingUpper: HTMLSpanElement
  arrivingUpperGlyph: HTMLSpanElement
  compact: boolean
  compactMotion: boolean
  cssRiffleDuration: number | null
  cssRiffleTargetIndex: number | null
  movingBackGlyph: HTMLSpanElement
  movingFrontGlyph: HTMLSpanElement
  movingVane: HTMLSpanElement
  outgoingLower: HTMLSpanElement
  outgoingLowerGlyph: HTMLSpanElement
  root: HTMLSpanElement
  spareLeafPack: HTMLSpanElement
}

/** @internal Renderer-facing state; mutations remain owned by the controller. */
export type SplitFlapRuntime = {
  animationStarted: boolean
  cadenceScale: number
  currentIndex: number
  didImpact: boolean
  duration: number
  finalPitch: boolean
  impactAt: number
  impactEventScheduled: boolean
  index: number
  pan: number
  pitchStart: number
  positions: readonly Position[]
  rowIndex: number
  running: boolean
  targetIndex: number
  views: Set<SplitFlapView>
}

type SplitFlapMechanicalEventListener = (events: readonly SplitFlapMechanicalEvent[]) => void

export type SplitFlapCanvasRenderer = (
  runtimes: readonly SplitFlapRuntime[],
  motion: MotionTuning,
  now: number,
) => void

export type SplitFlapPerformanceCounters = {
  activeCssCassettes: number
  canvasFrames: number
  canvasOperations: number
  runningCassettes: number
}

const cjkGlyphPattern =
  /[\u2e80-\u319f\u31c0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef\u{20000}-\u{2ebef}]/u

export type SplitFlapGlyphScript = 'cjk' | 'default'

export function splitFlapGlyphScript(glyph: string): SplitFlapGlyphScript {
  return cjkGlyphPattern.test(glyph) ? 'cjk' : 'default'
}

function setGlyphScript(element: HTMLElement, glyph: string) {
  if (splitFlapGlyphScript(glyph) === 'cjk') {
    element.dataset.splitFlapScript = 'cjk'
  } else {
    delete element.dataset.splitFlapScript
  }
}

function setGlyph(element: HTMLSpanElement, character: string) {
  const glyph = character.trim() === '' ? '' : character
  if (element.hasAttribute('data-split-flap-wide-glyph')) {
    const glyphParts = element.querySelectorAll<HTMLElement>('[data-split-flap-glyph-part]')
    const graphemes = splitFlapGraphemes(glyph)
    glyphParts.forEach((part, index) => {
      const partGlyph = graphemes[index] ?? ''
      setGlyphScript(part, partGlyph)
      if (part.textContent !== partGlyph) part.textContent = partGlyph
    })
    return
  }
  setGlyphScript(element, glyph)
  if (element.hasAttribute('data-split-flap-compact-glyph')) {
    if (element.dataset.glyph !== glyph) element.dataset.glyph = glyph
    return
  }
  if (element.textContent !== glyph) element.textContent = glyph
}

export function splitFlapVariantVariable(variant: Variant, lower: boolean) {
  return `var(--flapkit-glyph-${variant}-${lower ? 'bottom' : 'top'})`
}

function setGlyphPosition(element: HTMLSpanElement, position: Position, lower: boolean) {
  setGlyph(element, position.character)
  element.style.setProperty(
    activeGlyphColorProperty,
    splitFlapVariantVariable(position.variant, lower),
  )
}

export class SplitFlapMotionController implements SplitFlapMechanicalEventSource {
  private activeCssCassettes = new Set<number>()
  private animationKeyframes = new WeakMap<Animation, Keyframe[]>()
  private canvasFrameCount = 0
  private canvasOperationCount = 0
  private canvasRenderers = new Set<SplitFlapCanvasRenderer>()
  private compactSettleKeyframes = compactSettleVaneKeyframes(1.2)
  private cssCassetteListeners = new Map<number, Set<(active: boolean) => void>>()
  private frameId: number | null = null
  private mechanicalEventListeners = new Set<SplitFlapMechanicalEventListener>()
  private scrubbedPitches = new Map<
    number,
    { final: boolean; fromIndex: number; progress: number; settle: boolean }
  >()
  private motion: MotionTuning = {
    cadenceVariationPct: 4,
    finalSettleMs: 260,
    maximumConcurrentCassettes: 32,
    pitchMs: 52,
    reboundDeg: 2,
    rowDelayMs: 150,
    specularStrength: 0.82,
    startSpreadMs: 120,
    variant: 'cascade',
    withinRowJitterMs: 16,
  }
  private runtimes: SplitFlapRuntime[]
  private updateId = 0

  constructor(cells: readonly ResolvedSplitFlapCell[]) {
    const rowCellCount = cells.reduce(
      (count, cell) => Math.max(count, cell.trackIndex + cell.span),
      0,
    )
    this.runtimes = cells.map((cell, index) => {
      const columnCenter = cell.trackIndex + (cell.span - 1) / 2

      return {
        animationStarted: false,
        cadenceScale: 1,
        currentIndex: cell.homeIndex,
        didImpact: false,
        duration: 80,
        finalPitch: false,
        impactAt: 65.6,
        impactEventScheduled: false,
        index,
        pan: rowCellCount <= 1 ? 0 : (columnCenter / (rowCellCount - 1)) * 2 - 1,
        pitchStart: 0,
        positions: cell.flapDeck,
        rowIndex: cell.rowIndex,
        running: false,
        targetIndex: cell.homeIndex,
        views: new Set<SplitFlapView>(),
      }
    })
  }

  registerView(index: number, view: SplitFlapView) {
    const runtime = this.runtimes[index]
    runtime.views.add(view)
    const scrubbedPitch = this.scrubbedPitches.get(index)
    if (scrubbedPitch) {
      this.renderScrubbedPitchView(
        runtime,
        view,
        scrubbedPitch.fromIndex,
        scrubbedPitch.progress,
        scrubbedPitch.settle,
      )
      return () => {
        this.disposeViewAnimations(view)
        runtime.views.delete(view)
      }
    }
    const now = performance.now()

    if (view.compact && !view.compactMotion) {
      this.renderIdleView(runtime, view, runtime.running ? 'waiting' : 'idle')
    } else if (runtime.running && now < runtime.pitchStart) {
      this.renderIdleView(runtime, view, 'waiting')
    } else if (runtime.running && now < runtime.pitchStart + runtime.duration) {
      this.animatePitchView(runtime, view, now)
      if (view.compactMotion) runtime.animationStarted = true
    } else {
      this.renderIdleView(runtime, view)
    }

    return () => {
      this.disposeViewAnimations(view)
      runtime.views.delete(view)
    }
  }

  registerCanvasRenderer(renderer: SplitFlapCanvasRenderer) {
    this.canvasRenderers.add(renderer)
    renderer(this.runtimes, this.motion, performance.now())

    return () => {
      this.canvasRenderers.delete(renderer)
    }
  }

  requestCanvasRender() {
    this.renderCanvases(performance.now())
  }

  recordCanvasFrame(operations: number) {
    this.canvasFrameCount += 1
    this.canvasOperationCount += operations
  }

  readPerformanceCounters(): SplitFlapPerformanceCounters {
    return {
      activeCssCassettes: this.activeCssCassettes.size,
      canvasFrames: this.canvasFrameCount,
      canvasOperations: this.canvasOperationCount,
      runningCassettes: this.runtimes.reduce(
        (count, runtime) => count + Number(runtime.running),
        0,
      ),
    }
  }

  subscribeCssCassette(index: number, listener: (active: boolean) => void) {
    const listeners = this.cssCassetteListeners.get(index) ?? new Set<(active: boolean) => void>()
    listeners.add(listener)
    this.cssCassetteListeners.set(index, listeners)
    listener(this.activeCssCassettes.has(index))

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.cssCassetteListeners.delete(index)
    }
  }

  subscribeMechanicalEvents(listener: SplitFlapMechanicalEventListener) {
    this.mechanicalEventListeners.add(listener)
    return () => {
      this.mechanicalEventListeners.delete(listener)
    }
  }

  setMotion(motion: MotionTuning) {
    if (motion.variant !== 'cascade') this.clearActiveCssCassettes()
    if (motion.reboundDeg !== this.motion.reboundDeg) {
      this.compactSettleKeyframes = compactSettleVaneKeyframes(motion.reboundDeg)
    }
    this.motion = motion
    this.renderCanvases(performance.now())
  }

  setTargets(targetIndices: readonly number[]) {
    this.updateId += 1
    const now = performance.now()
    const runtimesToStart: SplitFlapRuntime[] = []

    this.runtimes.forEach((runtime) => {
      const targetIndex = targetIndices[runtime.index] ?? runtime.targetIndex
      if (runtime.targetIndex === targetIndex) return

      if (runtime.running && (this.motion.variant !== 'cascade' || runtime.animationStarted)) {
        this.advanceRuntime(runtime, now)
        if (!runtime.running && this.activeCssCassettes.delete(runtime.index)) {
          this.emitCssCassette(runtime.index, false)
        }
      }
      runtime.targetIndex = targetIndex
      if (runtime.running) {
        this.replanRuntime(runtime, now)
      } else if (runtime.currentIndex !== targetIndex) {
        runtimesToStart.push(runtime)
      }
    })

    this.startRuntimes(runtimesToStart, now, 401 + this.updateId * 17)
    this.ensureFrame()
    this.renderCanvases(now)
  }

  seekPitch(cellIndex: number, fromIndex: number, progress: number, settle = true, final = settle) {
    const runtime = this.runtimes[cellIndex]
    if (!runtime || runtime.positions.length === 0) return

    const positionCount = runtime.positions.length
    const resolvedFromIndex =
      ((Math.floor(fromIndex) % positionCount) + positionCount) % positionCount
    const resolvedProgress = Math.max(0, Math.min(1, progress))
    const previous = this.scrubbedPitches.get(cellIndex)
    this.scrubbedPitches.set(cellIndex, {
      final,
      fromIndex: resolvedFromIndex,
      progress: resolvedProgress,
      settle,
    })
    const nextIndex = (resolvedFromIndex + 1) % positionCount
    runtime.currentIndex = resolvedProgress >= 1 ? nextIndex : resolvedFromIndex
    runtime.finalPitch = settle
    runtime.targetIndex = nextIndex
    runtime.running = false
    runtime.views.forEach((view) =>
      this.renderScrubbedPitchView(runtime, view, resolvedFromIndex, resolvedProgress, settle),
    )
    this.emitScrubMechanicalEvents(
      runtime,
      previous,
      resolvedFromIndex,
      resolvedProgress,
      settle,
      final,
    )
  }

  private emitScrubMechanicalEvents(
    runtime: SplitFlapRuntime,
    previous: { final: boolean; fromIndex: number; progress: number; settle: boolean } | undefined,
    fromIndex: number,
    progress: number,
    settle: boolean,
    final: boolean,
  ) {
    if (!previous || this.mechanicalEventListeners.size === 0) return

    const impactOf = (isSettle: boolean) => (isSettle ? 0.78 : 0.82)
    const now = performance.now()
    const events: SplitFlapMechanicalEvent[] = []
    const push = (soundFinal: boolean) => {
      events.push({ at: now, final: soundFinal, index: runtime.index, pan: runtime.pan })
    }

    if (fromIndex === previous.fromIndex) {
      const impact = impactOf(settle)
      if (previous.progress < impact && progress >= impact) push(final)
    } else if (fromIndex > previous.fromIndex || fromIndex + 1 < previous.fromIndex) {
      if (previous.progress < impactOf(previous.settle)) push(previous.final)
      if (progress >= impactOf(settle)) push(final)
    }

    if (events.length === 0) return
    this.mechanicalEventListeners.forEach((listener) => listener(events))
  }

  private replanRuntime(runtime: SplitFlapRuntime, now: number) {
    const waiting =
      now < runtime.pitchStart || (this.motion.variant === 'cascade' && !runtime.animationStarted)

    if (waiting) {
      if (runtime.currentIndex === runtime.targetIndex) {
        runtime.running = false
        runtime.animationStarted = false
        this.renderIdle(runtime)
        if (this.activeCssCassettes.delete(runtime.index)) {
          this.emitCssCassette(runtime.index, false)
        }
        return
      }

      const startAt =
        this.motion.variant === 'cascade'
          ? Math.max(runtime.pitchStart, now + cssMotionPrewarmMs)
          : runtime.pitchStart
      this.startPitch(runtime, startAt)
      return
    }

    const progress = Math.max(0, Math.min(1, (now - runtime.pitchStart) / runtime.duration))
    runtime.finalPitch =
      (runtime.currentIndex + 1) % runtime.positions.length === runtime.targetIndex
    runtime.duration = Math.max(
      20,
      (runtime.finalPitch ? this.motion.finalSettleMs : this.motion.pitchMs) * runtime.cadenceScale,
    )
    runtime.impactAt = runtime.duration * (runtime.finalPitch ? 0.78 : 0.82)
    runtime.pitchStart = now - progress * runtime.duration
    runtime.views.forEach((view) => this.animatePitchView(runtime, view, now))
    runtime.animationStarted = true
  }

  private startRuntimes(runtimes: SplitFlapRuntime[], now: number, noiseSalt: number) {
    if (this.motion.variant === 'cascade') {
      const affectedRows = Array.from(new Set(runtimes.map((runtime) => runtime.rowIndex))).sort(
        (a, b) => a - b,
      )
      const rowRanks = new Map(affectedRows.map((row, rank) => [row, rank]))

      runtimes.forEach((runtime) => {
        const rowRank = rowRanks.get(runtime.rowIndex) ?? 0
        const jitter =
          ((signedLeafNoise(runtime.index, noiseSalt) + 1) / 2) * this.motion.withinRowJitterMs

        this.startPitch(runtime, now + rowRank * this.motion.rowDelayMs + jitter)
      })
      return
    }

    runtimes.forEach((runtime) => {
      runtime.views.forEach((view) => {
        if (!view.compact || view.compactMotion) return
        setGlyph(view.outgoingLowerGlyph, ' ')
        setGlyph(view.arrivingUpperGlyph, ' ')
      })
      const spreadPosition = (signedLeafNoise(runtime.index, noiseSalt) + 1) / 2
      // Keep the opening burst dense while a few late starters create a gradual board-level tail.
      const spread = spreadPosition * spreadPosition * this.motion.startSpreadMs
      this.startPitch(runtime, now + spread)
    })
  }

  destroy() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
    this.runtimes.forEach((runtime) => {
      runtime.views.forEach((view) => this.disposeViewAnimations(view))
      runtime.views.clear()
    })
    this.canvasRenderers.clear()
    this.cssCassetteListeners.clear()
    this.mechanicalEventListeners.clear()
    this.scrubbedPitches.clear()
  }

  private clearActiveCssCassettes() {
    if (this.activeCssCassettes.size === 0) return
    const activeIndices = Array.from(this.activeCssCassettes)
    this.activeCssCassettes.clear()
    activeIndices.forEach((index) => this.emitCssCassette(index, false))
  }

  private emitCssCassette(index: number, active: boolean) {
    this.cssCassetteListeners.get(index)?.forEach((listener) => listener(active))
  }

  private startPitch(runtime: SplitFlapRuntime, startAt: number, animate = true) {
    const cadenceVariation =
      signedLeafNoise(runtime.index, 337) * (this.motion.cadenceVariationPct / 100)
    runtime.cadenceScale = 1 + cadenceVariation
    runtime.finalPitch =
      (runtime.currentIndex + 1) % runtime.positions.length === runtime.targetIndex
    const baseDuration = Math.max(
      20,
      (runtime.finalPitch ? this.motion.finalSettleMs : this.motion.pitchMs) * runtime.cadenceScale,
    )
    runtime.duration = baseDuration
    runtime.impactAt = baseDuration * (runtime.finalPitch ? 0.78 : 0.82)
    runtime.impactEventScheduled = false
    runtime.pitchStart = startAt
    runtime.didImpact = false
    runtime.running = true
    runtime.animationStarted = false

    if (animate) {
      const now = performance.now()
      if (this.motion.variant !== 'cascade' || now >= startAt) {
        runtime.views.forEach((view) => this.animatePitchView(runtime, view, now))
        runtime.animationStarted = true
      }
    }
  }

  private ensureFrame() {
    if (this.frameId !== null || !this.runtimes.some((runtime) => runtime.running)) return
    this.frameId = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    this.frameId = null
    let hasRunningRuntime = false
    const mechanicalEvents =
      this.mechanicalEventListeners.size === 0 ? null : ([] as SplitFlapMechanicalEvent[])

    this.runtimes.forEach((runtime) => {
      if (!runtime.running) return

      if (
        this.motion.variant === 'cascade' &&
        !runtime.animationStarted &&
        now >= runtime.pitchStart - cssMotionPrewarmMs &&
        !this.activeCssCassettes.has(runtime.index)
      ) {
        if (this.activeCssCassettes.size >= this.motion.maximumConcurrentCassettes) {
          hasRunningRuntime = true
          return
        }

        // Mount one frame before a scheduled start so the browser can rasterize
        // and promote the 3D vane before it moves. A cassette that waited for an
        // available slot gets the same preparation frame from its actual slot time.
        if (now >= runtime.pitchStart) runtime.pitchStart = now + cssMotionPrewarmMs
        this.activeCssCassettes.add(runtime.index)
        this.emitCssCassette(runtime.index, true)
      }

      if (mechanicalEvents) this.collectMechanicalEvent(runtime, now, mechanicalEvents)
      this.advanceRuntime(runtime, now)
      if (runtime.running) {
        hasRunningRuntime = true
      } else if (this.activeCssCassettes.delete(runtime.index)) {
        this.emitCssCassette(runtime.index, false)
      }
    })

    this.renderCanvases(now)
    if (mechanicalEvents?.length) {
      this.mechanicalEventListeners.forEach((listener) => listener(mechanicalEvents))
    }

    if (hasRunningRuntime) this.frameId = requestAnimationFrame(this.tick)
  }

  private collectMechanicalEvent(
    runtime: SplitFlapRuntime,
    now: number,
    events: SplitFlapMechanicalEvent[],
  ) {
    if (runtime.impactEventScheduled) return
    const at = runtime.pitchStart + runtime.impactAt
    if (at - now > mechanicalSoundLookaheadMs) return

    runtime.impactEventScheduled = true
    if (now - at > mechanicalSoundMaxLatenessMs) return
    events.push({ at, final: runtime.finalPitch, index: runtime.index, pan: runtime.pan })
  }

  private renderCanvases(now: number) {
    this.canvasRenderers.forEach((renderer) => renderer(this.runtimes, this.motion, now))
  }

  private advanceRuntime(runtime: SplitFlapRuntime, now: number) {
    if (now < runtime.pitchStart) return

    let elapsed = now - runtime.pitchStart
    let needsAnimation = this.motion.variant === 'cascade' && !runtime.animationStarted

    while (elapsed >= runtime.duration) {
      if (!runtime.didImpact) this.emitImpact(runtime)
      runtime.currentIndex = (runtime.currentIndex + 1) % runtime.positions.length

      if (runtime.currentIndex === runtime.targetIndex) {
        runtime.running = false
        this.renderIdle(runtime)
        return
      }

      const nextPitchStart = runtime.pitchStart + runtime.duration
      this.startPitch(runtime, nextPitchStart, false)
      elapsed = now - runtime.pitchStart
      needsAnimation = true
    }

    if (needsAnimation) {
      runtime.views.forEach((view) => this.animatePitchView(runtime, view, now))
      runtime.animationStarted = true
    }

    if (!runtime.didImpact) {
      runtime.views.forEach((view) => {
        if (view.root.dataset.splitFlapPhase === 'waiting') {
          view.root.dataset.splitFlapPhase = runtime.finalPitch ? 'settle' : 'riffle'
        }
      })
    }
    if (elapsed >= runtime.impactAt && !runtime.didImpact) this.emitImpact(runtime)
  }

  private emitImpact(runtime: SplitFlapRuntime) {
    runtime.didImpact = true
    runtime.views.forEach((view) => {
      if (view.compact) return
      view.root.dataset.splitFlapPhase = 'impact'
    })
  }

  private cancelViewAnimations(view: SplitFlapView) {
    view.animations.forEach((animation) => {
      if (animation.playState !== 'idle') animation.cancel()
    })
  }

  private disposeViewAnimations(view: SplitFlapView) {
    this.cancelViewAnimations(view)
    view.animations = []
  }

  private playViewAnimation(
    view: SplitFlapView,
    slot: number,
    element: HTMLSpanElement,
    keyframes: Keyframe[],
    timing: KeyframeAnimationOptions & { duration: number },
    elapsed: number,
    paused = false,
  ) {
    let animation = view.animations[slot]

    if (animation) {
      animation.cancel()
      const effect = animation.effect as KeyframeEffect
      if (this.animationKeyframes.get(animation) !== keyframes) {
        effect.setKeyframes(keyframes)
        this.animationKeyframes.set(animation, keyframes)
      }
      effect.updateTiming(timing)
      if (!paused) animation.play()
    } else {
      animation = element.animate(keyframes, timing)
      view.animations[slot] = animation
      this.animationKeyframes.set(animation, keyframes)
    }

    if (paused) animation.pause()
    animation.currentTime = Math.min(elapsed, timing.duration)
  }

  private renderIdle(runtime: SplitFlapRuntime, phase = 'idle') {
    runtime.views.forEach((view) => this.renderIdleView(runtime, view, phase))
  }

  private renderIdleView(runtime: SplitFlapRuntime, view: SplitFlapView, phase = 'idle') {
    const position = runtime.positions[runtime.currentIndex]

    this.cancelViewAnimations(view)
    view.cssRiffleDuration = null
    view.cssRiffleTargetIndex = null
    view.spareLeafPack.style.setProperty(stackShiftProperty, '0px')
    setGlyphPosition(view.outgoingLowerGlyph, position, true)
    setGlyphPosition(view.arrivingUpperGlyph, position, false)
    if (view.movingFrontGlyph !== view.outgoingLowerGlyph) {
      setGlyphPosition(view.movingFrontGlyph, position, false)
    }
    if (view.movingBackGlyph !== view.arrivingUpperGlyph) {
      setGlyphPosition(view.movingBackGlyph, position, true)
    }
    view.outgoingLower.style.opacity = '1'
    view.outgoingLower.style.transform = 'translate3d(0, 0, 0) rotateX(0deg)'
    view.arrivingUpper.style.opacity = '1'
    view.arrivingUpper.style.transform = 'translate3d(0, 0, 0) rotateX(0deg)'
    if (view.compactMotion) {
      view.movingVane.style.opacity = '0'
      view.movingVane.style.transform = 'translate3d(0, 0, 0) rotateX(0deg)'
    } else if (view.compact) {
      view.movingVane.style.opacity = '1'
      view.movingVane.style.transform = ''
    } else if (!view.compact) {
      view.movingVane.style.opacity = '0'
      view.movingVane.style.transform = 'translate3d(0, 0, 0) rotateX(0deg)'
      view.movingVane.style.setProperty(specularProperty, '0')
    }
    view.root.dataset.displayedCharacter =
      position.character.trim() === '' ? 'blank' : position.character
    view.root.dataset.splitFlapPhase = phase
    delete view.root.dataset.pitchHalf
    view.root.dataset.variant = position.variant
  }

  private renderScrubbedPitchView(
    runtime: SplitFlapRuntime,
    view: SplitFlapView,
    fromIndex: number,
    progress: number,
    settle: boolean,
  ) {
    const nextIndex = (fromIndex + 1) % runtime.positions.length
    if (progress <= 0) {
      runtime.currentIndex = fromIndex
      runtime.targetIndex = fromIndex
      this.renderIdleView(runtime, view, 'scrub')
      return
    }
    if (progress >= 1) {
      runtime.currentIndex = nextIndex
      runtime.targetIndex = nextIndex
      this.renderIdleView(runtime, view, 'scrub')
      return
    }

    runtime.currentIndex = fromIndex
    runtime.targetIndex = nextIndex
    runtime.duration = 1_000
    runtime.finalPitch = settle
    runtime.pitchStart = performance.now() - progress * runtime.duration
    this.animatePitchView(runtime, view, performance.now(), progress)
    view.root.dataset.splitFlapPhase = 'scrub'
  }

  private animatePitchView(
    runtime: SplitFlapRuntime,
    view: SplitFlapView,
    now: number,
    scrubProgress?: number,
  ) {
    const currentPosition = runtime.positions[runtime.currentIndex]
    const nextPosition = runtime.positions[(runtime.currentIndex + 1) % runtime.positions.length]

    if (view.compact && (!view.compactMotion || this.motion.variant !== 'cascade')) return
    ensureStackShiftProperty()
    if (!view.compact) ensureSpecularProperty()
    const paused = scrubProgress !== undefined
    const delay = paused ? 0 : Math.max(0, runtime.pitchStart - now)
    const elapsed = paused
      ? Math.max(0, Math.min(1, scrubProgress)) * runtime.duration
      : Math.max(0, now - runtime.pitchStart)
    const timing = {
      delay,
      duration: runtime.duration,
      easing: 'linear',
      fill: 'forwards' as const,
    }

    setGlyphPosition(view.outgoingLowerGlyph, currentPosition, true)
    setGlyphPosition(view.movingFrontGlyph, currentPosition, false)
    setGlyphPosition(view.movingBackGlyph, nextPosition, true)
    setGlyphPosition(view.arrivingUpperGlyph, nextPosition, false)
    view.outgoingLower.style.opacity = '1'
    view.outgoingLower.style.transform = 'translate3d(0, 0, 0) rotateX(0deg)'
    view.arrivingUpper.style.opacity = '1'
    view.arrivingUpper.style.transform = 'translate3d(0, 0, 0) rotateX(0deg)'
    view.movingVane.style.opacity = '1'
    const pitchProgress = Math.max(0, Math.min(1, elapsed / runtime.duration))
    view.root.dataset.displayedCharacter =
      currentPosition.character.trim() === '' ? 'blank' : currentPosition.character
    view.root.dataset.splitFlapPhase =
      delay > 0 ? 'waiting' : runtime.finalPitch ? 'settle' : 'riffle'
    view.root.dataset.pitchHalf = pitchProgress <= 0.5 ? 'outgoing' : 'incoming'
    view.root.dataset.variant = currentPosition.variant

    if (view.compact) {
      if (
        !runtime.finalPitch &&
        view.cssRiffleDuration === runtime.duration &&
        view.cssRiffleTargetIndex === runtime.targetIndex
      ) {
        return
      }

      const riffleIterations = Math.max(
        1,
        ((runtime.targetIndex - runtime.currentIndex + runtime.positions.length) %
          runtime.positions.length) -
          1,
      )
      view.cssRiffleDuration = runtime.finalPitch ? null : runtime.duration
      view.cssRiffleTargetIndex = runtime.finalPitch ? null : runtime.targetIndex
      this.playViewAnimation(
        view,
        0,
        view.movingVane,
        runtime.finalPitch ? this.compactSettleKeyframes : compactRiffleVaneKeyframes,
        runtime.finalPitch ? timing : { ...timing, iterations: riffleIterations },
        elapsed,
        paused,
      )
      this.playViewAnimation(
        view,
        2,
        view.spareLeafPack,
        runtime.finalPitch ? settleStackTransformKeyframes : riffleStackTransformKeyframes,
        runtime.finalPitch ? timing : { ...timing, iterations: riffleIterations },
        elapsed,
        paused,
      )
      return
    }

    const specularPeak = Math.min(1, this.motion.specularStrength * 0.72)
    const vaneKeyframes: Keyframe[] = runtime.finalPitch
      ? [
          {
            offset: 0,
            transform: 'translate3d(0, 0, 0) rotateX(0deg)',
            [specularProperty]: 0,
          },
          {
            offset: 0.34,
            transform: 'translate3d(0, 0, 0) rotateX(-55deg)',
            [specularProperty]: specularPeak,
          },
          {
            offset: 0.5,
            transform: 'translate3d(0, 0, 0) rotateX(-90deg)',
            [specularProperty]: 0,
          },
          {
            offset: 0.62,
            transform: 'translate3d(0, 0, 0) rotateX(-125deg)',
            [specularProperty]: specularPeak * 0.72,
          },
          {
            offset: 0.78,
            transform: 'translate3d(0, 0, 0) rotateX(-180deg)',
            [specularProperty]: 0,
          },
          {
            offset: 0.9,
            transform: `translate3d(0, 0, 0) rotateX(${-180 + this.motion.reboundDeg}deg)`,
            [specularProperty]: 0,
          },
          {
            offset: 1,
            transform: 'translate3d(0, 0, 0) rotateX(-180deg)',
            [specularProperty]: 0,
          },
        ]
      : [
          {
            offset: 0,
            transform: 'translate3d(0, 0, 0) rotateX(0deg)',
            [specularProperty]: 0,
          },
          {
            offset: 0.28,
            transform: 'translate3d(0, 0, 0) rotateX(-55deg)',
            [specularProperty]: specularPeak * 0.62,
          },
          {
            offset: 0.5,
            transform: 'translate3d(0, 0, 0) rotateX(-90deg)',
            [specularProperty]: 0,
          },
          {
            offset: 0.68,
            transform: 'translate3d(0, 0, 0) rotateX(-125deg)',
            [specularProperty]: specularPeak * 0.4,
          },
          {
            offset: 0.82,
            transform: 'translate3d(0, 0, 0) rotateX(-180deg)',
            [specularProperty]: 0,
          },
          {
            offset: 1,
            transform: 'translate3d(0, 0, 0) rotateX(-180deg)',
            [specularProperty]: 0,
          },
        ]
    view.movingVane.style.setProperty(specularProperty, '0')

    this.playViewAnimation(view, 0, view.movingVane, vaneKeyframes, timing, elapsed, paused)
    this.playViewAnimation(
      view,
      1,
      view.spareLeafPack,
      runtime.finalPitch ? settleStackKeyframes : riffleStackKeyframes,
      timing,
      elapsed,
      paused,
    )
  }
}
