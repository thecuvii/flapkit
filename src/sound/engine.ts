// Framework-independent engine for Flapkit motion sounds.
export interface SplitFlapMechanicalEvent {
  /** Scheduled impact time on the same monotonic clock used by `now`. */
  at: number
  final: boolean
  index: number
  pan: number
}

export interface SplitFlapMechanicalEventSource {
  subscribeMechanicalEvents(
    listener: (events: readonly SplitFlapMechanicalEvent[]) => void,
  ): () => void
}

export interface SplitFlapSoundBank {
  clicks: readonly string[]
  settles: readonly string[]
}

export interface SplitFlapSoundTuning {
  clickLevel: number
  pitchVariation: number
  settleLevel: number
  stereoWidth: number
  volume: number
}

export const defaultSplitFlapSoundTuning: Readonly<SplitFlapSoundTuning> = {
  clickLevel: 1,
  pitchVariation: 0.045,
  settleLevel: 1,
  stereoWidth: 0.6,
  volume: 0.58,
}

export interface SplitFlapSoundEngineOptions {
  bank: SplitFlapSoundBank
  context?: AudioContext
  fetch?: typeof fetch
  now?: () => number
  tuning?: Partial<SplitFlapSoundTuning>
}

type DecodedBank = { clicks: readonly AudioBuffer[]; settles: readonly AudioBuffer[] }
type EventGroup = { at: number; count: number; final: boolean; pan: number; seed: number }

const bucketMs = 8
const maxVoices = 32
const dataCache = new Map<string, Promise<ArrayBuffer | null>>()
const bufferCache = new WeakMap<AudioContext, Map<string, Promise<AudioBuffer | null>>>()
let sharedContext: AudioContext | null = null
let sharedContextUsers = 0

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function signedNoise(index: number, salt: number) {
  let hash = Math.imul(index + 1 + salt * 101, 0x45d9f3b)
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b)
  hash ^= hash >>> 16
  return ((hash >>> 0) / 0xffffffff) * 2 - 1
}

function browserAudioContext() {
  if (sharedContext) return sharedContext
  if (typeof window === 'undefined') return null
  const Constructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Constructor) return null
  sharedContext = new Constructor()
  return sharedContext
}

function acquireSharedAudioContext() {
  const context = browserAudioContext()
  if (context) sharedContextUsers += 1
  return context
}

function releaseSharedAudioContext() {
  if (sharedContextUsers === 0) return
  sharedContextUsers -= 1
  if (sharedContextUsers > 0 || !sharedContext) return
  const context = sharedContext
  sharedContext = null
  void context.close().catch(() => undefined)
}

function loadData(url: string, fetcher: typeof fetch) {
  const cached = dataCache.get(url)
  if (cached) return cached
  const request = fetcher(url)
    .then((response) => (response.ok ? response.arrayBuffer() : null))
    .catch(() => null)
  dataCache.set(url, request)
  void request.then((data) => {
    if (data === null && dataCache.get(url) === request) dataCache.delete(url)
  })
  return request
}

function decode(context: AudioContext, url: string, fetcher: typeof fetch) {
  let contextCache = bufferCache.get(context)
  if (!contextCache) {
    contextCache = new Map()
    bufferCache.set(context, contextCache)
  }
  const cached = contextCache.get(url)
  if (cached) return cached
  const result = loadData(url, fetcher).then((data) =>
    data ? context.decodeAudioData(data.slice(0)).catch(() => null) : null,
  )
  contextCache.set(url, result)
  void result.then((buffer) => {
    if (buffer === null && contextCache.get(url) === result) contextCache.delete(url)
  })
  return result
}

function mergeTuning(
  current: SplitFlapSoundTuning,
  update: Partial<SplitFlapSoundTuning> | undefined,
) {
  if (!update) return current
  return {
    clickLevel: update.clickLevel ?? current.clickLevel,
    pitchVariation: update.pitchVariation ?? current.pitchVariation,
    settleLevel: update.settleLevel ?? current.settleLevel,
    stereoWidth: update.stereoWidth ?? current.stereoWidth,
    volume: update.volume ?? current.volume,
  }
}

function groupEvents(events: readonly SplitFlapMechanicalEvent[]) {
  const groups = new Map<string, EventGroup>()
  for (const event of events) {
    const timeBucket = Math.round(event.at / bucketMs)
    const panBucket = event.pan < -0.25 ? -1 : event.pan > 0.25 ? 1 : 0
    const key = `${timeBucket}:${panBucket}:${Number(event.final)}`
    const group = groups.get(key)
    if (group) {
      group.count += 1
      group.seed ^= event.index + 1
    } else {
      groups.set(key, {
        at: timeBucket * bucketMs,
        count: 1,
        final: event.final,
        pan: panBucket,
        seed: event.index + timeBucket * 31,
      })
    }
  }
  return groups.values()
}

export class SplitFlapSoundEngine {
  private activeSources = new Set<AudioBufferSourceNode>()
  private bank: DecodedBank | null = null
  private compressor: DynamicsCompressorNode | null = null
  private destroyed = false
  private fetcher: typeof fetch
  private master: GainNode | null = null
  private now: () => number
  private ownsSharedContext = false
  private preparePromise: Promise<boolean> | null = null
  private tuning: SplitFlapSoundTuning
  private unsubscribe: (() => void) | null = null

  constructor(private options: SplitFlapSoundEngineOptions) {
    this.fetcher = options.fetch ?? ((...args) => globalThis.fetch(...args))
    this.now = options.now ?? (() => performance.now())
    this.tuning = mergeTuning(defaultSplitFlapSoundTuning, options.tuning)
  }

  /** Starts fetching assets without creating an AudioContext. */
  preload() {
    for (const url of [...this.options.bank.clicks, ...this.options.bank.settles]) {
      void loadData(url, this.fetcher)
    }
  }

  /** Call from a user gesture. Failure is intentionally reported as `false`. */
  prepare(): Promise<boolean> {
    if (this.destroyed) return Promise.resolve(false)
    if (this.bank) return Promise.resolve(true)
    if (this.preparePromise) return this.preparePromise
    const context =
      this.options.context ??
      (this.ownsSharedContext ? browserAudioContext() : acquireSharedAudioContext())
    if (!context) return Promise.resolve(false)
    if (!this.options.context) this.ownsSharedContext = true

    const request = (context.state === 'running' ? Promise.resolve() : context.resume())
      .then(async () => {
        const [clicks, settles] = await Promise.all([
          Promise.all(this.options.bank.clicks.map((url) => decode(context, url, this.fetcher))),
          Promise.all(this.options.bank.settles.map((url) => decode(context, url, this.fetcher))),
        ])
        if (this.destroyed) return false
        const decodedClicks = clicks.filter((value): value is AudioBuffer => value !== null)
        if (decodedClicks.length === 0) return false
        this.bank = {
          clicks: decodedClicks,
          settles: settles.filter((value): value is AudioBuffer => value !== null),
        }
        this.createOutput(context)
        return true
      })
      .catch(() => false)
    this.preparePromise = request
    void request.then((prepared) => {
      if (!prepared && !this.destroyed && this.preparePromise === request) {
        this.preparePromise = null
      }
    })
    return request
  }

  connect(source: SplitFlapMechanicalEventSource) {
    this.unsubscribe?.()
    this.unsubscribe = source.subscribeMechanicalEvents((events) => this.schedule(events))
    return () => {
      this.unsubscribe?.()
      this.unsubscribe = null
    }
  }

  setTuning(tuning: Partial<SplitFlapSoundTuning>) {
    this.tuning = mergeTuning(this.tuning, tuning)
    if (this.master && this.options.context) {
      this.master.gain.setTargetAtTime(
        clamp(this.tuning.volume, 0, 1),
        this.options.context.currentTime,
        0.012,
      )
    } else if (this.master && sharedContext) {
      this.master.gain.setTargetAtTime(
        clamp(this.tuning.volume, 0, 1),
        sharedContext.currentTime,
        0.012,
      )
    }
  }

  schedule(events: readonly SplitFlapMechanicalEvent[]) {
    const context = this.options.context ?? sharedContext
    if (
      !context ||
      context.state !== 'running' ||
      !this.bank ||
      !this.master ||
      events.length === 0
    )
      return
    const clockNow = this.now()
    const audioNow = context.currentTime

    for (const group of groupEvents(events)) {
      const buffers = group.final && this.bank.settles.length ? this.bank.settles : this.bank.clicks
      const voices = Math.min(3, group.count >= 8 ? 3 : group.count >= 3 ? 2 : 1)
      const level = group.final ? this.tuning.settleLevel * 0.18 : this.tuning.clickLevel * 0.085
      const voiceLevel = (level * Math.min(2.4, Math.sqrt(group.count))) / voices ** 0.72
      const when = audioNow + Math.max(0, (group.at - clockNow) / 1000)

      for (let voice = 0; voice < voices && this.activeSources.size < maxVoices; voice += 1) {
        const hash = Math.imul(group.seed + voice * 131, 0x45d9f3b) >>> 0
        const buffer = buffers[hash % buffers.length]
        if (!buffer) continue
        const source = context.createBufferSource()
        const gain = context.createGain()
        const panner = context.createStereoPanner()
        const variation =
          signedNoise(group.seed + voice * 17, 809) * clamp(this.tuning.pitchVariation, 0, 0.2)
        source.buffer = buffer
        source.playbackRate.value = Math.max(0.72, 1 + variation - Number(group.final) * 0.025)
        gain.gain.value = voiceLevel * (0.92 + ((hash >>> 8) % 17) / 100)
        panner.pan.value = group.pan * clamp(this.tuning.stereoWidth, 0, 1)
        source.connect(gain).connect(panner).connect(this.master)
        this.activeSources.add(source)
        source.addEventListener(
          'ended',
          () => {
            this.activeSources.delete(source)
            source.disconnect()
            gain.disconnect()
            panner.disconnect()
          },
          { once: true },
        )
        source.start(when)
      }
    }
  }

  destroy() {
    this.destroyed = true
    this.unsubscribe?.()
    this.unsubscribe = null
    for (const source of this.activeSources) {
      try {
        source.stop()
      } catch {
        /* An ended source has nothing left to stop. */
      }
      source.disconnect()
    }
    this.activeSources.clear()
    this.master?.disconnect()
    this.compressor?.disconnect()
    this.master = null
    this.compressor = null
    this.bank = null
    if (this.ownsSharedContext) {
      this.ownsSharedContext = false
      releaseSharedAudioContext()
    }
  }

  private createOutput(context: AudioContext) {
    this.master = context.createGain()
    this.compressor = context.createDynamicsCompressor()
    this.compressor.threshold.value = -16
    this.compressor.knee.value = 10
    this.compressor.ratio.value = 6
    this.compressor.attack.value = 0.002
    this.compressor.release.value = 0.08
    this.master.connect(this.compressor)
    this.compressor.connect(context.destination)
    this.master.gain.setTargetAtTime(clamp(this.tuning.volume, 0, 1), context.currentTime, 0.012)
  }
}
