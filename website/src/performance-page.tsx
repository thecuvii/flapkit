import * as Flapkit from '@thecuvii/flapkit'
import { cascade } from '@thecuvii/flapkit/cascade'
import { riffle } from '@thecuvii/flapkit/riffle'
import {
  Profiler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ProfilerOnRenderCallback,
} from 'react'

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const sampleDuration = 1_500

const sizes = [
  { columns: 12, label: '96 cassettes', rows: 8 },
  { columns: 20, label: '200 cassettes', rows: 10 },
  { columns: 25, label: '500 cassettes', rows: 20 },
  { columns: 40, label: '1,000 cassettes', rows: 25 },
] as const

const runCounts = [5, 10, 20] as const

type MotionKind = 'cascade' | 'riffle'
type Sample = {
  actualDuration?: number
  cassettes: number
  commitLatency: number
  droppedFrames: number
  fps: number
  geometryReads: number
  id: number
  p95Frame: number
}
type PendingSample = {
  committed: boolean
  geometryReads: () => number
  resolve: (sample: Sample) => void
  restoreGeometryProbe: () => void
  startedAt: number
}
type RunStatus = {
  current: number
  phase: 'idle' | 'measuring' | 'warming'
  total: number
}

function percentile(values: readonly number[], fraction: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]!
}

function metricSummary(values: readonly (number | undefined)[]) {
  const present = values.filter((value): value is number => value !== undefined)
  if (present.length === 0) return null
  return { median: percentile(present, 0.5), p95: percentile(present, 0.95) }
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

function CommitProbe({ onCommit, revision }: { onCommit: () => void; revision: number }) {
  useLayoutEffect(() => onCommit(), [onCommit, revision])
  return null
}

function BenchmarkSummary({
  samples,
  size,
  statusLabel,
}: {
  samples: readonly Sample[]
  size: (typeof sizes)[number]
  statusLabel: string
}) {
  const summaries = useMemo(
    () => ({
      actualDuration: metricSummary(samples.map((sample) => sample.actualDuration)),
      commitLatency: metricSummary(samples.map((sample) => sample.commitLatency)),
      droppedFrames: metricSummary(samples.map((sample) => sample.droppedFrames)),
      fps: metricSummary(samples.map((sample) => sample.fps)),
      geometryReads: metricSummary(samples.map((sample) => sample.geometryReads)),
      p95Frame: metricSummary(samples.map((sample) => sample.p95Frame)),
    }),
    [samples],
  )
  const latestSample = samples.at(-1)

  return (
    <section className="performance-summary" aria-label="Benchmark summary" aria-live="polite">
      <header>
        <div>
          <span>Run status</span>
          <strong>{statusLabel}</strong>
        </div>
        <p>Median across measured runs. p95 is shown where it helps expose tail latency.</p>
      </header>
      <div className="performance-results">
        <div>
          <span>React render</span>
          <strong>
            {summaries.actualDuration ? `${summaries.actualDuration.median.toFixed(1)} ms` : '—'}
          </strong>
          <small>
            {summaries.actualDuration
              ? `p95 ${summaries.actualDuration.p95.toFixed(1)} ms`
              : 'Profiler unavailable'}
          </small>
        </div>
        <div>
          <span>Input → commit</span>
          <strong>
            {summaries.commitLatency ? `${summaries.commitLatency.median.toFixed(1)} ms` : '—'}
          </strong>
          <small>
            {summaries.commitLatency
              ? `p95 ${summaries.commitLatency.p95.toFixed(1)} ms`
              : 'No samples'}
          </small>
        </div>
        <div>
          <span>Animation FPS</span>
          <strong>{summaries.fps ? summaries.fps.median.toFixed(1) : '—'}</strong>
          <small>Median</small>
        </div>
        <div>
          <span>P95 frame</span>
          <strong>{summaries.p95Frame ? `${summaries.p95Frame.median.toFixed(1)} ms` : '—'}</strong>
          <small>Median run</small>
        </div>
        <div>
          <span>Frames &gt; 20 ms</span>
          <strong>{summaries.droppedFrames?.median.toFixed(0) ?? '—'}</strong>
          <small>Median run</small>
        </div>
        <div>
          <span>Geometry reads</span>
          <strong>{summaries.geometryReads?.median.toFixed(0) ?? '—'}</strong>
          <small>getBoundingClientRect</small>
        </div>
        <div>
          <span>Rendered cassettes</span>
          <strong>{latestSample?.cassettes ?? size.rows * size.columns}</strong>
          <small>{size.rows} rows</small>
        </div>
      </div>
    </section>
  )
}

function MeasuredRuns({ samples }: { samples: readonly Sample[] }) {
  if (samples.length === 0) return null

  return (
    <section className="performance-samples" aria-label="Individual benchmark runs">
      <header>
        <h2>Measured runs</h2>
        <span>{samples.length} samples</span>
      </header>
      <div>
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>React</th>
              <th>Commit</th>
              <th>FPS</th>
              <th>P95 frame</th>
              <th>&gt;20 ms</th>
              <th>Geometry</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample, index) => (
              <tr key={sample.id}>
                <td>{index + 1}</td>
                <td>
                  {sample.actualDuration === undefined
                    ? '—'
                    : `${sample.actualDuration.toFixed(1)} ms`}
                </td>
                <td>{sample.commitLatency.toFixed(1)} ms</td>
                <td>{sample.fps.toFixed(1)}</td>
                <td>{sample.p95Frame.toFixed(1)} ms</td>
                <td>{sample.droppedFrames}</td>
                <td>{sample.geometryReads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function PerformancePage() {
  const [motionKind, setMotionKind] = useState<MotionKind>('riffle')
  const [revision, setRevision] = useState(0)
  const [runCount, setRunCount] = useState<(typeof runCounts)[number]>(10)
  const [runStatus, setRunStatus] = useState<RunStatus>({ current: 0, phase: 'idle', total: 0 })
  const [samples, setSamples] = useState<Sample[]>([])
  const [sizeIndex, setSizeIndex] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const pendingSampleRef = useRef<PendingSample | null>(null)
  const profileDurationRef = useRef<number | undefined>(undefined)
  const frameRef = useRef(0)
  const size = sizes[sizeIndex]!
  const running = runStatus.phase !== 'idle'
  const motion = useMemo(() => (motionKind === 'riffle' ? riffle() : cascade()), [motionKind])

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current)
      pendingSampleRef.current?.restoreGeometryProbe()
    },
    [],
  )

  const clearResults = () => {
    cancelAnimationFrame(frameRef.current)
    setSamples([])
    setRunStatus({ current: 0, phase: 'idle', total: 0 })
  }

  const measureFrames = useCallback(
    (renderResult: Omit<Sample, 'droppedFrames' | 'fps' | 'geometryReads' | 'id' | 'p95Frame'>) => {
      const intervals: number[] = []
      let previous = 0
      let started = 0

      const sample = (time: number) => {
        if (started === 0) started = time
        if (previous !== 0) intervals.push(time - previous)
        previous = time
        if (time - started < sampleDuration) {
          frameRef.current = requestAnimationFrame(sample)
          return
        }

        const elapsed = intervals.reduce((total, interval) => total + interval, 0)
        const pendingSample = pendingSampleRef.current
        if (!pendingSample) return
        const geometryReads = pendingSample.geometryReads()
        pendingSample.restoreGeometryProbe()
        pendingSampleRef.current = null
        pendingSample.resolve({
          ...renderResult,
          droppedFrames: intervals.filter((interval) => interval > 20).length,
          fps: elapsed === 0 ? 0 : (intervals.length * 1_000) / elapsed,
          geometryReads,
          id: pendingSample.startedAt,
          p95Frame: percentile(intervals, 0.95),
        })
      }

      frameRef.current = requestAnimationFrame(sample)
    },
    [],
  )

  const handleRender = useCallback<ProfilerOnRenderCallback>((_id, _phase, actualDuration) => {
    profileDurationRef.current = actualDuration
  }, [])

  const handleCommit = useCallback(() => {
    const pendingSample = pendingSampleRef.current
    if (!pendingSample || pendingSample.committed) return
    pendingSample.committed = true
    const commitLatency = performance.now() - pendingSample.startedAt
    frameRef.current = requestAnimationFrame(() => {
      measureFrames({
        actualDuration: profileDurationRef.current,
        cassettes: stageRef.current?.querySelectorAll('[data-split-flap-cassette]').length ?? 0,
        commitLatency,
      })
    })
  }, [measureFrames])

  const requestSample = useCallback(
    () =>
      new Promise<Sample>((resolve) => {
        const elementPrototype = Element.prototype
        const descriptor = Object.getOwnPropertyDescriptor(
          elementPrototype,
          'getBoundingClientRect',
        )
        if (!descriptor || typeof descriptor.value !== 'function') {
          throw new Error('Element geometry API is unavailable')
        }
        const original = descriptor.value as (this: Element) => DOMRect
        let geometryReads = 0
        Object.defineProperty(elementPrototype, 'getBoundingClientRect', {
          ...descriptor,
          value: function getBoundingClientRect(this: Element) {
            geometryReads += 1
            return original.call(this)
          },
        })
        profileDurationRef.current = undefined
        pendingSampleRef.current = {
          committed: false,
          geometryReads: () => geometryReads,
          resolve,
          restoreGeometryProbe: () => {
            Object.defineProperty(elementPrototype, 'getBoundingClientRect', descriptor)
          },
          startedAt: performance.now(),
        }
        setRevision((value) => value + 1)
      }),
    [],
  )

  const runOnce = async () => {
    setSamples([])
    setRunStatus({ current: 1, phase: 'measuring', total: 1 })
    await nextFrame()
    const sample = await requestSample()
    setSamples([sample])
    setRunStatus({ current: 1, phase: 'idle', total: 1 })
  }

  const runBenchmark = async () => {
    setSamples([])
    setRunStatus({ current: 1, phase: 'warming', total: 1 })
    await nextFrame()
    await requestSample()
    await nextFrame()

    const measured: Sample[] = []
    for (let index = 0; index < runCount; index += 1) {
      setRunStatus({ current: index + 1, phase: 'measuring', total: runCount })
      await nextFrame()
      const sample = await requestSample()
      measured.push(sample)
      setSamples([...measured])
      await nextFrame()
    }
    setRunStatus({ current: runCount, phase: 'idle', total: runCount })
  }

  const rows = useMemo(
    () =>
      Array.from({ length: size.rows }, (_, rowIndex) =>
        Array.from(
          { length: size.columns },
          (_, columnIndex) =>
            characters[
              (rowIndex * size.columns + columnIndex + revision * 17) % characters.length
            ]!,
        ),
      ),
    [revision, size.columns, size.rows],
  )

  const statusLabel =
    runStatus.phase === 'warming'
      ? 'Warm-up run'
      : runStatus.total > 0
        ? `${runStatus.current} / ${runStatus.total} runs`
        : 'Ready'

  return (
    <main className="performance-page">
      <header className="performance-header">
        <div>
          <a href="/">← Documentation</a>
          <span>Browser benchmark · local results</span>
        </div>
        <h1>Performance bench</h1>
        <p>
          Warm up the selected renderer, repeat identical target updates, and compare median and p95
          results in the same browser. The board stays mounted between measured runs.
        </p>
      </header>

      <section className="performance-controls" aria-label="Benchmark controls">
        <label>
          Motion
          <select
            value={motionKind}
            disabled={running}
            onChange={(event) => {
              clearResults()
              setMotionKind(event.target.value as MotionKind)
            }}
          >
            <option value="riffle">Riffle · Canvas</option>
            <option value="cascade">Cascade · CSS 3D</option>
          </select>
        </label>
        <label>
          Scale
          <select
            value={sizeIndex}
            disabled={running}
            onChange={(event) => {
              clearResults()
              setSizeIndex(Number(event.target.value))
            }}
          >
            {sizes.map((preset, index) => (
              <option key={preset.label} value={index}>
                {preset.label} · {preset.rows}×{preset.columns}
              </option>
            ))}
          </select>
        </label>
        <label>
          Measured runs
          <select
            value={runCount}
            disabled={running}
            onChange={(event) => {
              clearResults()
              setRunCount(Number(event.target.value) as (typeof runCounts)[number])
            }}
          >
            {runCounts.map((count) => (
              <option key={count} value={count}>
                {count} runs
              </option>
            ))}
          </select>
        </label>
        <div className="performance-actions">
          <button type="button" disabled={running} onClick={runOnce}>
            Run once
          </button>
          <button type="button" disabled={running} onClick={runBenchmark}>
            {running ? statusLabel : 'Run benchmark'}
          </button>
        </div>
      </section>

      <BenchmarkSummary samples={samples} size={size} statusLabel={statusLabel} />
      <MeasuredRuns samples={samples} />

      <section ref={stageRef} className="performance-stage" aria-label="Benchmark board">
        <Profiler id="flapkit-bench" onRender={handleRender}>
          <Flapkit.Root motion={motion}>
            <Flapkit.Board aria-label={`${size.label} benchmark board`} className="flapkit-airport">
              <Flapkit.Header>
                {motionKind.toUpperCase()} · {size.label}
              </Flapkit.Header>
              {rows.map((row, rowIndex) => (
                <Flapkit.Row key={`row-${rowIndex}`}>
                  <Flapkit.Group label="LOCAL">
                    {row.map((cell, columnIndex) => (
                      <Flapkit.Cell key={columnIndex}>{cell}</Flapkit.Cell>
                    ))}
                  </Flapkit.Group>
                </Flapkit.Row>
              ))}
            </Flapkit.Board>
          </Flapkit.Root>
          <CommitProbe revision={revision} onCommit={handleCommit} />
        </Profiler>
      </section>

      <p className="performance-note">
        One warm-up run is excluded. Each measured update samples 1.5 seconds of animation frames.
        Keep the tab visible and compare configurations in the same browser; these results are
        diagnostic, not cross-device scores.
      </p>
    </main>
  )
}
