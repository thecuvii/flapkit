'use client'

import * as Flapkit from 'flapkit'
import { SiteFrame } from '../site'
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

  const metric = (label: string, value: string, note: string) => (
    <div className="min-w-0 bg-panel p-3.5">
      <span className="block min-h-7 text-[10px] leading-[1.4] text-muted uppercase">{label}</span>
      <strong className="mt-1.5 block text-[18px] tabular-nums">{value}</strong>
      <small className="mt-1 block min-h-4 overflow-hidden text-[9px] leading-[1.4] text-ellipsis whitespace-nowrap text-muted">
        {note}
      </small>
    </div>
  )

  return (
    <section
      className="mx-auto mt-[18px] w-[min(100%,1120px)] overflow-hidden rounded-lg border border-rule bg-panel max-[560px]:[&>header]:flex-col max-[560px]:[&>header]:items-start"
      aria-label="Benchmark summary"
      aria-live="polite"
    >
      <header className="flex items-end justify-between gap-6 px-[18px] py-4">
        <div>
          <span className="block text-[10px] font-[680] tracking-[0.05em] text-muted uppercase">
            Run status
          </span>
          <strong className="mt-1 block text-sm">{statusLabel}</strong>
        </div>
        <p className="m-0 text-[11px] text-muted">Medians; p95 where shown.</p>
      </header>
      <div className="grid grid-cols-7 gap-px border-t border-rule bg-rule max-[860px]:grid-cols-4 max-[560px]:grid-cols-2">
        {metric(
          'React render',
          summaries.actualDuration ? `${summaries.actualDuration.median.toFixed(1)} ms` : '—',
          summaries.actualDuration
            ? `p95 ${summaries.actualDuration.p95.toFixed(1)} ms`
            : 'Profiler unavailable',
        )}
        {metric(
          'Input → commit',
          summaries.commitLatency ? `${summaries.commitLatency.median.toFixed(1)} ms` : '—',
          summaries.commitLatency
            ? `p95 ${summaries.commitLatency.p95.toFixed(1)} ms`
            : 'No samples',
        )}
        {metric('Animation FPS', summaries.fps ? summaries.fps.median.toFixed(1) : '—', 'Median')}
        {metric(
          'P95 frame',
          summaries.p95Frame ? `${summaries.p95Frame.median.toFixed(1)} ms` : '—',
          'Median run',
        )}
        {metric('Frames > 20 ms', summaries.droppedFrames?.median.toFixed(0) ?? '—', 'Median run')}
        {metric(
          'Geometry reads',
          summaries.geometryReads?.median.toFixed(0) ?? '—',
          'getBoundingClientRect',
        )}
        {metric(
          'Rendered cassettes',
          String(latestSample?.cassettes ?? size.rows * size.columns),
          `${size.rows} rows`,
        )}
      </div>
    </section>
  )
}

function MeasuredRuns({ samples }: { samples: readonly Sample[] }) {
  if (samples.length === 0) return null

  return (
    <section
      className="mx-auto mt-[18px] w-[min(100%,1120px)] overflow-hidden rounded-lg border border-rule bg-panel"
      aria-label="Individual benchmark runs"
    >
      <header className="flex items-baseline justify-between gap-6 px-[18px] py-3.5">
        <h2 className="m-0 text-sm">Measured runs</h2>
        <span className="text-[10px] font-[680] tracking-[0.05em] text-muted uppercase">
          {samples.length} samples
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs tabular-nums whitespace-nowrap">
          <thead>
            <tr>
              <th className="border-t border-rule px-[18px] py-2.5 text-left text-[9px] tracking-[0.04em] text-muted uppercase">
                Run
              </th>
              <th className="border-t border-rule px-[18px] py-2.5 text-right text-[9px] tracking-[0.04em] text-muted uppercase">
                React
              </th>
              <th className="border-t border-rule px-[18px] py-2.5 text-right text-[9px] tracking-[0.04em] text-muted uppercase">
                Commit
              </th>
              <th className="border-t border-rule px-[18px] py-2.5 text-right text-[9px] tracking-[0.04em] text-muted uppercase">
                FPS
              </th>
              <th className="border-t border-rule px-[18px] py-2.5 text-right text-[9px] tracking-[0.04em] text-muted uppercase">
                P95 frame
              </th>
              <th className="border-t border-rule px-[18px] py-2.5 text-right text-[9px] tracking-[0.04em] text-muted uppercase">
                &gt;20 ms
              </th>
              <th className="border-t border-rule px-[18px] py-2.5 text-right text-[9px] tracking-[0.04em] text-muted uppercase">
                Geometry
              </th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample, index) => (
              <tr key={sample.id}>
                <td className="border-t border-rule px-[18px] py-2.5 text-left">{index + 1}</td>
                <td className="border-t border-rule px-[18px] py-2.5 text-right">
                  {sample.actualDuration === undefined
                    ? '—'
                    : `${sample.actualDuration.toFixed(1)} ms`}
                </td>
                <td className="border-t border-rule px-[18px] py-2.5 text-right">
                  {sample.commitLatency.toFixed(1)} ms
                </td>
                <td className="border-t border-rule px-[18px] py-2.5 text-right">
                  {sample.fps.toFixed(1)}
                </td>
                <td className="border-t border-rule px-[18px] py-2.5 text-right">
                  {sample.p95Frame.toFixed(1)} ms
                </td>
                <td className="border-t border-rule px-[18px] py-2.5 text-right">
                  {sample.droppedFrames}
                </td>
                <td className="border-t border-rule px-[18px] py-2.5 text-right">
                  {sample.geometryReads}
                </td>
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
  const motion = useMemo(
    () => (motionKind === 'riffle' ? Flapkit.riffle() : Flapkit.cascade()),
    [motionKind],
  )

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
    <SiteFrame>
      <main className="min-h-dvh px-[clamp(24px,5vw,72px)] pt-7 pb-24 max-[560px]:px-5 max-[560px]:pt-[22px] max-[560px]:pb-[72px]">
        <header className="mx-auto w-[min(100%,1120px)]">
          <div className="flex justify-between gap-6 text-xs font-[680] tracking-[0.04em] text-muted uppercase max-[560px]:flex-col max-[560px]:items-start">
            <a className="text-ink no-underline" href="/">
              ← Docs
            </a>
            <span>Browser benchmark · local results</span>
          </div>
          <h1 className="mt-[72px] mb-[18px] max-[560px]:mt-14">Bench</h1>
          <p className="m-0 max-w-[720px] leading-[1.65] text-muted">
            Compare median and p95 for identical updates in the same browser.
          </p>
        </header>

        <section
          className="mx-auto mt-12 grid w-[min(100%,1120px)] grid-cols-[repeat(3,minmax(0,1fr))_auto] items-end gap-3 max-[860px]:grid-cols-2 max-[560px]:grid-cols-1"
          aria-label="Benchmark controls"
        >
          <label className="grid gap-2 text-[11px] font-[680] tracking-[0.05em] text-muted uppercase">
            Motion
            <select
              className="min-h-11 rounded-[7px] border border-rule-strong bg-panel px-[13px] font-[inherit] text-ink disabled:cursor-wait disabled:opacity-50"
              value={motionKind}
              disabled={running}
              onChange={(event) => {
                clearResults()
                setMotionKind(event.target.value as MotionKind)
              }}
            >
              <option value="riffle">Riffle · Canvas</option>
              <option value="cascade">Cascade · canvas</option>
            </select>
          </label>
          <label className="grid gap-2 text-[11px] font-[680] tracking-[0.05em] text-muted uppercase">
            Scale
            <select
              className="min-h-11 rounded-[7px] border border-rule-strong bg-panel px-[13px] font-[inherit] text-ink disabled:cursor-wait disabled:opacity-50"
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
          <label className="grid gap-2 text-[11px] font-[680] tracking-[0.05em] text-muted uppercase">
            Measured runs
            <select
              className="min-h-11 rounded-[7px] border border-rule-strong bg-panel px-[13px] font-[inherit] text-ink disabled:cursor-wait disabled:opacity-50"
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
          <div className="flex gap-2 max-[860px]:col-span-full max-[560px]:grid max-[560px]:grid-cols-2">
            <button
              type="button"
              className="min-h-11 cursor-pointer rounded-[7px] border border-rule-strong bg-panel px-[13px] font-[680] whitespace-nowrap text-ink disabled:cursor-wait disabled:opacity-50"
              disabled={running}
              onClick={runOnce}
            >
              Run once
            </button>
            <button
              type="button"
              className="min-h-11 cursor-pointer rounded-[7px] border border-ink bg-ink px-[13px] font-[680] whitespace-nowrap text-on-ink disabled:cursor-wait disabled:opacity-50"
              disabled={running}
              onClick={runBenchmark}
            >
              {running ? statusLabel : 'Run benchmark'}
            </button>
          </div>
        </section>

        <BenchmarkSummary samples={samples} size={size} statusLabel={statusLabel} />
        <MeasuredRuns samples={samples} />

        <section
          ref={stageRef}
          className="mx-auto mt-7 max-h-[680px] w-[min(100%,1120px)] overflow-auto rounded-[10px] bg-surface p-12 max-[560px]:p-7 [&>div]:mx-auto [&>div]:w-max"
          aria-label="Benchmark board"
        >
          <Profiler id="flapkit-bench" onRender={handleRender}>
            <Flapkit.Root motion={motion}>
              <Flapkit.Board
                aria-label={`${size.label} benchmark board`}
                className="flapkit-airport"
              >
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

        <p className="mx-auto mt-3.5 w-[min(100%,1120px)] text-xs leading-[1.5] text-muted">
          Excludes one warm-up. Each run samples 1.5 seconds of animation. Keep this tab visible;
          results are not comparable across devices.
        </p>
      </main>
    </SiteFrame>
  )
}
