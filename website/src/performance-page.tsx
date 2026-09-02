import * as stylex from '@stylexjs/stylex'
import * as Flapkit from '@thecuvii/flapkit'
import { cascade } from '@thecuvii/flapkit/cascade'
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'
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

const sizes = [
  { columns: 12, label: '96 cassettes', rows: 8 },
  { columns: 20, label: '200 cassettes', rows: 10 },
  { columns: 25, label: '500 cassettes', rows: 20 },
  { columns: 40, label: '1,000 cassettes', rows: 25 },
] as const

type MotionKind = 'cascade' | 'riffle'
type Result = {
  actualDuration?: number
  cassettes: number
  commitLatency: number
  droppedFrames?: number
  fps?: number
  p95Frame?: number
}

function percentile(values: readonly number[], fraction: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]!
}

function CommitProbe({ onCommit, revision }: { onCommit: () => void; revision: number }) {
  useLayoutEffect(() => onCommit(), [onCommit, revision])
  return null
}

export function PerformancePage() {
  const [motionKind, setMotionKind] = useState<MotionKind>('riffle')
  const [revision, setRevision] = useState(0)
  const [sizeIndex, setSizeIndex] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pendingStartRef = useRef<number | null>(null)
  const profileDurationRef = useRef<number | undefined>(undefined)
  const frameRef = useRef(0)
  const size = sizes[sizeIndex]!
  const motion = useMemo(() => (motionKind === 'riffle' ? riffle() : cascade()), [motionKind])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const resetResult = () => {
    pendingStartRef.current = null
    cancelAnimationFrame(frameRef.current)
    setResult(null)
  }

  const measureFrames = useCallback(
    (renderResult: Omit<Result, 'droppedFrames' | 'fps' | 'p95Frame'>) => {
      const intervals: number[] = []
      let previous = 0
      let started = 0

      const sample = (time: number) => {
        if (started === 0) started = time
        if (previous !== 0) intervals.push(time - previous)
        previous = time
        if (time - started < 1_500) {
          frameRef.current = requestAnimationFrame(sample)
          return
        }
        const elapsed = intervals.reduce((total, interval) => total + interval, 0)
        setResult({
          ...renderResult,
          droppedFrames: intervals.filter((interval) => interval > 20).length,
          fps: elapsed === 0 ? 0 : (intervals.length * 1_000) / elapsed,
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
    const pendingStart = pendingStartRef.current
    if (pendingStart === null) return
    pendingStartRef.current = null
    const commitLatency = performance.now() - pendingStart
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const renderResult = {
        actualDuration: profileDurationRef.current,
        cassettes: stageRef.current?.querySelectorAll('[data-split-flap-cassette]').length ?? 0,
        commitLatency,
      }
      setResult(renderResult)
      measureFrames(renderResult)
    })
  }, [measureFrames])

  const runUpdate = () => {
    pendingStartRef.current = performance.now()
    setResult(null)
    setRevision((value) => value + 1)
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

  return (
    <main className="performance-page">
      <header className="performance-header">
        <div>
          <a href="/">← Documentation</a>
          <span>Experimental compound interface</span>
        </div>
        <h1>Performance bench</h1>
        <p>
          Measures React commit cost and animation-frame health while the new structural component
          compiler drives the existing motion runtime.
        </p>
      </header>

      <section className="performance-controls" aria-label="Benchmark controls">
        <label>
          Motion
          <select
            value={motionKind}
            onChange={(event) => {
              resetResult()
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
            onChange={(event) => {
              resetResult()
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
        <button type="button" onClick={runUpdate}>
          Run target update
        </button>
      </section>

      <section
        className="performance-results"
        aria-label="Latest benchmark result"
        aria-live="polite"
      >
        <div>
          <span>React render</span>
          <strong>
            {result?.actualDuration === undefined ? '—' : `${result.actualDuration.toFixed(1)} ms`}
          </strong>
        </div>
        <div>
          <span>Input → commit</span>
          <strong>{result ? `${result.commitLatency.toFixed(1)} ms` : '—'}</strong>
        </div>
        <div>
          <span>Animation FPS</span>
          <strong>{result?.fps === undefined ? '—' : result.fps.toFixed(1)}</strong>
        </div>
        <div>
          <span>P95 frame</span>
          <strong>
            {result?.p95Frame === undefined ? '—' : `${result.p95Frame.toFixed(1)} ms`}
          </strong>
        </div>
        <div>
          <span>Frames &gt; 20 ms</span>
          <strong>{result?.droppedFrames ?? '—'}</strong>
        </div>
        <div>
          <span>Rendered cassettes</span>
          <strong>{result?.cassettes ?? size.rows * size.columns}</strong>
        </div>
      </section>

      <section ref={stageRef} className="performance-stage" aria-label="Benchmark board">
        <div {...stylex.props(airportBoardLook)}>
          <Profiler id="flapkit-bench" onRender={handleRender}>
            <Flapkit.Root motion={motion}>
              <Flapkit.Board aria-label={`${size.label} benchmark board`}>
                <Flapkit.Header>
                  {motionKind.toUpperCase()} · {size.label}
                </Flapkit.Header>
                {rows.map((row, rowIndex) => (
                  <Flapkit.Row key={`row-${rowIndex}`}>
                    <Flapkit.Field label="LOCAL">
                      {row.map((cell, columnIndex) => (
                        <Flapkit.Cell key={columnIndex}>{cell}</Flapkit.Cell>
                      ))}
                    </Flapkit.Field>
                  </Flapkit.Row>
                ))}
              </Flapkit.Board>
            </Flapkit.Root>
            <CommitProbe revision={revision} onCommit={handleCommit} />
          </Profiler>
        </div>
      </section>

      <p className="performance-note">
        React render duration is available in development builds. Input-to-commit and frame metrics
        also run in production; compare runs in the same browser.
      </p>
    </main>
  )
}
