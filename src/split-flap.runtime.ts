import type { ResolvedSplitFlapCell, SplitFlapPosition, SplitFlapTone } from './split-flap.source'
import type {
  SplitFlapMechanicalEvent,
  SplitFlapMechanicalEventSource,
} from './split-flap.sound-engine'

export type SplitFlapMotionVariant = 'riffle' | 'cascade'

const cssMotionPrewarmMs = 17
const mechanicalSoundLookaheadMs = 60
const mechanicalSoundMaxLatenessMs = 34
export const specularProperty = '--split-flap-specular'
export const stackShiftProperty = '--split-flap-stack-shift'
export const activeGlyphColorProperty = '--split-flap-active-glyph-color'
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
  lowerMotionShadow: HTMLSpanElement
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
  positions: readonly SplitFlapPosition[]
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

function setGlyph(element: HTMLSpanElement, character: string) {
  const glyph = character === ' ' ? '' : character
  if (element.hasAttribute('data-split-flap-compact-glyph')) {
    if (element.dataset.glyph !== glyph) element.dataset.glyph = glyph
    return
  }
  if (element.textContent !== glyph) element.textContent = glyph
}

export function splitFlapToneVariable(tone: SplitFlapTone, lower: boolean) {
  const toneName = tone === 'ochreOrange' ? 'ochre' : tone === 'signalYellow' ? 'signal' : 'warm'
  return `var(--split-flap-glyph-${toneName}-${lower ? 'bottom' : 'top'})`
}

function setGlyphPosition(element: HTMLSpanElement, position: SplitFlapPosition, lower: boolean) {
  setGlyph(element, position.character)
  element.style.setProperty(activeGlyphColorProperty, splitFlapToneVariable(position.tone, lower))
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
      (count, cell) => Math.max(count, cell.columnOffset + cell.columnIndex + 1),
      0,
    )
    this.runtimes = cells.map((cell, index) => {
      const columnIndex = cell.columnOffset + cell.columnIndex

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
        pan: rowCellCount <= 1 ? 0 : (columnIndex / (rowCellCount - 1)) * 2 - 1,
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
      animation.play()
    } else {
      animation = element.animate(keyframes, timing)
      view.animations[slot] = animation
      this.animationKeyframes.set(animation, keyframes)
    }

    if (elapsed > 0) animation.currentTime = Math.min(elapsed, timing.duration)
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
      this.setLowerMotionShadow(view, '0', 'translate3d(0, 0, 0) scaleY(0.45)')
    } else if (view.compact) {
      view.movingVane.style.opacity = '1'
      view.movingVane.style.transform = ''
      this.setLowerMotionShadow(view, '0', 'translate3d(0, 0, 0) scaleY(0.45)')
    } else if (!view.compact) {
      view.movingVane.style.transform = 'translate3d(0, 0, 0) rotateX(0deg)'
      view.movingVane.style.setProperty(specularProperty, '0')
      this.setLowerMotionShadow(view, '0', 'translate3d(0, 0, 0) scaleY(0.45)')
    }
    view.root.dataset.displayedCharacter = position.character === ' ' ? 'blank' : position.character
    view.root.dataset.splitFlapPhase = phase
    view.root.dataset.tone = position.tone
  }

  private animatePitchView(runtime: SplitFlapRuntime, view: SplitFlapView, now: number) {
    const currentPosition = runtime.positions[runtime.currentIndex]
    const nextPosition = runtime.positions[(runtime.currentIndex + 1) % runtime.positions.length]

    if (view.compact && (!view.compactMotion || this.motion.variant !== 'cascade')) return
    ensureStackShiftProperty()
    if (!view.compact) ensureSpecularProperty()
    const delay = Math.max(0, runtime.pitchStart - now)
    const elapsed = Math.max(0, now - runtime.pitchStart)
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
    view.root.dataset.displayedCharacter =
      currentPosition.character === ' ' ? 'blank' : currentPosition.character
    view.root.dataset.splitFlapPhase =
      delay > 0 ? 'waiting' : runtime.finalPitch ? 'settle' : 'riffle'
    view.root.dataset.tone = currentPosition.tone

    if (view.compact) {
      this.setLowerMotionShadow(view, '0.52', 'translate3d(0, 0, 0) scaleY(0.78)')

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
      )
      this.playViewAnimation(
        view,
        2,
        view.spareLeafPack,
        runtime.finalPitch ? settleStackTransformKeyframes : riffleStackTransformKeyframes,
        runtime.finalPitch ? timing : { ...timing, iterations: riffleIterations },
        elapsed,
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
    const shadowKeyframes: Keyframe[] = runtime.finalPitch
      ? [
          { offset: 0, opacity: 0, transform: 'translate3d(0, 0, 0) scaleY(0.45)' },
          {
            offset: 0.5,
            opacity: 0.58,
            transform: 'translate3d(0, -7%, 0) scaleY(1.17)',
          },
          {
            offset: 0.78,
            opacity: 0.72,
            transform: 'translate3d(0, 0, 0) scaleY(0.72)',
          },
          {
            offset: 0.9,
            opacity: 0.22,
            transform: 'translate3d(0, 0, 0) scaleY(0.55)',
          },
          { offset: 1, opacity: 0, transform: 'translate3d(0, 0, 0) scaleY(0.45)' },
        ]
      : [
          { offset: 0, opacity: 0, transform: 'translate3d(0, 0, 0) scaleY(0.45)' },
          {
            offset: 0.5,
            opacity: 0.45,
            transform: 'translate3d(0, -5%, 0) scaleY(1.08)',
          },
          {
            offset: 0.82,
            opacity: 0.62,
            transform: 'translate3d(0, 0, 0) scaleY(0.68)',
          },
          { offset: 1, opacity: 0, transform: 'translate3d(0, 0, 0) scaleY(0.45)' },
        ]
    view.movingVane.style.setProperty(specularProperty, '0')

    this.playViewAnimation(view, 0, view.movingVane, vaneKeyframes, timing, elapsed)
    this.playViewAnimation(view, 1, view.lowerMotionShadow, shadowKeyframes, timing, elapsed)
    this.playViewAnimation(
      view,
      2,
      view.spareLeafPack,
      runtime.finalPitch ? settleStackKeyframes : riffleStackKeyframes,
      timing,
      elapsed,
    )
  }

  private setLowerMotionShadow(view: SplitFlapView, opacity: string, transform: string) {
    if (view.compact) {
      view.lowerMotionShadow.style.setProperty('--compact-motion-shadow-opacity', opacity)
      view.lowerMotionShadow.style.setProperty('--compact-motion-shadow-transform', transform)
      return
    }

    view.lowerMotionShadow.style.opacity = opacity
    view.lowerMotionShadow.style.transform = transform
  }
}
