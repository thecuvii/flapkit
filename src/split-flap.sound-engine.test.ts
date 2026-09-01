import { expect, it } from 'vitest'
import { SplitFlapSoundEngine, type SplitFlapMechanicalEvent } from './split-flap.sound-engine'

const fake = <T>(value: unknown) => value as T
class Param {
  value = 0
  targets: number[] = []
  setTargetAtTime(value: number) {
    this.targets.push(value)
  }
}
class Node {
  disconnected = false
  connect(node: Node) {
    return node
  }
  disconnect() {
    this.disconnected = true
  }
}
class Source extends Node {
  buffer: AudioBuffer | null = null
  playbackRate = fake<AudioParam>(new Param())
  startedAt = -1
  stopped = false
  listener?: () => void
  addEventListener(_name: string, listener: () => void) {
    this.listener = listener
  }
  start(at: number) {
    this.startedAt = at
  }
  stop() {
    this.stopped = true
  }
}
class Context {
  currentTime = 4
  state: AudioContextState = 'running'
  destination = new Node()
  sources: Source[] = []
  panners: Param[] = []
  decoded = 0
  createGain() {
    return fake<GainNode>(Object.assign(new Node(), { gain: fake<AudioParam>(new Param()) }))
  }
  createDynamicsCompressor() {
    return fake<DynamicsCompressorNode>(
      Object.assign(new Node(), {
        threshold: new Param(),
        knee: new Param(),
        ratio: new Param(),
        attack: new Param(),
        release: new Param(),
      }),
    )
  }
  createStereoPanner() {
    const pan = new Param()
    this.panners.push(pan)
    return fake<StereoPannerNode>(Object.assign(new Node(), { pan }))
  }
  createBufferSource() {
    const source = new Source()
    this.sources.push(source)
    return fake<AudioBufferSourceNode>(source)
  }
  decodeAudioData() {
    this.decoded += 1
    return Promise.resolve({} as AudioBuffer)
  }
  resume() {
    this.state = 'running'
    return Promise.resolve()
  }
}

const response = { ok: true, arrayBuffer: async () => new ArrayBuffer(2) } as Response
const event = (overrides: Partial<SplitFlapMechanicalEvent> = {}): SplitFlapMechanicalEvent => ({
  at: 1_060,
  final: false,
  index: 0,
  pan: 0,
  ...overrides,
})

it('groups nearby impacts and schedules them against the audio clock', async () => {
  const context = new Context()
  const engine = new SplitFlapSoundEngine({
    bank: { clicks: ['group-click'], settles: [] },
    context: fake<AudioContext>(context),
    fetch: async () => response,
    now: () => 1_000,
  })
  expect(await engine.prepare()).toBe(true)
  engine.schedule([event(), event({ at: 1_063, index: 1 }), event({ at: 1_061, index: 2 })])
  expect(context.sources).toHaveLength(2)
  expect(context.sources[0]?.startedAt).toBe(4.064)
})

it('separates pan/final buckets and applies pan and pitch variation', async () => {
  const context = new Context()
  const engine = new SplitFlapSoundEngine({
    bank: { clicks: ['pan-click'], settles: ['pan-settle'] },
    context: fake<AudioContext>(context),
    fetch: async () => response,
    now: () => 1_000,
    tuning: { stereoWidth: 0.5, pitchVariation: 0.1 },
  })
  await engine.prepare()
  engine.schedule([
    event({ pan: -1 }),
    event({ pan: 1, index: 1 }),
    event({ final: true, index: 2 }),
  ])
  expect(context.sources).toHaveLength(3)
  expect(context.sources[0]?.playbackRate.value).not.toBe(context.sources[2]?.playbackRate.value)
  expect(context.panners.map((panner) => panner.value)).toEqual([-0.5, 0.5, 0])
})

it('caps active voices and releases or stops them during cleanup', async () => {
  const context = new Context()
  const engine = new SplitFlapSoundEngine({
    bank: { clicks: ['cap-click'], settles: [] },
    context: fake<AudioContext>(context),
    fetch: async () => response,
    now: () => 0,
  })
  await engine.prepare()
  engine.schedule(Array.from({ length: 40 }, (_, index) => event({ at: index * 16, index })))
  expect(context.sources).toHaveLength(32)
  context.sources[0]?.listener?.()
  engine.schedule([event({ at: 2_000, index: 99 })])
  expect(context.sources).toHaveLength(33)
  engine.destroy()
  expect(context.sources.slice(1).every((source) => source.stopped)).toBe(true)
})

it('caches fetch/decode and treats decode failure as optional', async () => {
  let fetches = 0
  const fetcher = async () => {
    fetches += 1
    return response
  }
  const context = new Context()
  const first = new SplitFlapSoundEngine({
    bank: { clicks: ['cached-click'], settles: [] },
    context: fake<AudioContext>(context),
    fetch: fetcher,
  })
  const second = new SplitFlapSoundEngine({
    bank: { clicks: ['cached-click'], settles: [] },
    context: fake<AudioContext>(context),
    fetch: fetcher,
  })
  expect(await first.prepare()).toBe(true)
  expect(await second.prepare()).toBe(true)
  expect(fetches).toBe(1)
  expect(context.decoded).toBe(1)

  const otherContext = new Context()
  const crossContext = new SplitFlapSoundEngine({
    bank: { clicks: ['cached-click'], settles: [] },
    context: fake<AudioContext>(otherContext),
    fetch: fetcher,
  })
  expect(await crossContext.prepare()).toBe(true)
  expect(fetches).toBe(1)
  expect(otherContext.decoded).toBe(1)

  const failing = new Context()
  failing.decodeAudioData = () => Promise.reject(new Error('unsupported'))
  const optional = new SplitFlapSoundEngine({
    bank: { clicks: ['bad-click'], settles: [] },
    context: fake<AudioContext>(failing),
    fetch: fetcher,
  })
  expect(await optional.prepare()).toBe(false)
})

it('retries transient fetch and decode failures', async () => {
  let fetches = 0
  const fetchRetryContext = new Context()
  const fetchRetry = new SplitFlapSoundEngine({
    bank: { clicks: ['retry-fetch-click'], settles: [] },
    context: fake<AudioContext>(fetchRetryContext),
    fetch: async () => {
      fetches += 1
      return fetches === 1 ? ({ ok: false } as Response) : response
    },
  })

  expect(await fetchRetry.prepare()).toBe(false)
  expect(await fetchRetry.prepare()).toBe(true)
  expect(fetches).toBe(2)

  let decodes = 0
  const decodeRetryContext = new Context()
  decodeRetryContext.decodeAudioData = () => {
    decodes += 1
    return decodes === 1
      ? Promise.reject(new Error('transient decode failure'))
      : Promise.resolve({} as AudioBuffer)
  }
  const decodeRetry = new SplitFlapSoundEngine({
    bank: { clicks: ['retry-decode-click'], settles: [] },
    context: fake<AudioContext>(decodeRetryContext),
    fetch: async () => response,
  })

  expect(await decodeRetry.prepare()).toBe(false)
  expect(await decodeRetry.prepare()).toBe(true)
  expect(decodes).toBe(2)
})
