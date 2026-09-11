'use client'

// Runtime providers used by Flapkit motion adapters.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CompiledBoardPresentation } from '../compiler'
import {
  resolveSplitFlapSource,
  type ResolvedSplitFlapSource,
  type SplitFlapSource,
} from '../layout'
import { splitFlapSpecularStrength } from './constants'
import type { MotionAdapter } from './schedules'
import { idleSchedule } from './schedules'
import { SplitFlapMotionController, type MotionTuning } from './runtime'

export type { CascadeMotion, RiffleMotion } from './options'
export { defaultCascadeMotion, defaultRiffleMotion } from './options'

type SplitFlapContextValue = {
  controller: SplitFlapMotionController
  layout: ResolvedSplitFlapSource
  motion: MotionTuning
  presentation: CompiledBoardPresentation
}

type ScrubPitch = {
  cellIndex: number
  final?: boolean
  fromIndex: number
  progress: number
  settle: boolean
}

const SplitFlapContext = createContext<SplitFlapContextValue | null>(null)
const SplitFlapContentContext = createContext<ResolvedSplitFlapSource | null>(null)

/** Latest labels and accessible content, separate from the stable cassette topology. */
export function useSplitFlapContent() {
  const layout = useContext(SplitFlapContentContext)
  if (!layout) throw new Error('Split-flap parts must be rendered inside a split-flap effect')
  return layout
}

/** @internal Shared renderer context; not exported from package entry points. */
export function useSplitFlap() {
  const context = useContext(SplitFlapContext)
  if (!context) throw new Error('Split-flap parts must be rendered inside a split-flap effect')
  return context
}

/** Runtime event source for optional package integrations such as sound. */
export function useSplitFlapController() {
  return useSplitFlap().controller
}

function SplitFlapEffectProvider({
  children,
  motion,
  presentation,
  scrubPitch,
  source,
}: {
  children: ReactNode
  motion: MotionTuning
  presentation?: CompiledBoardPresentation
  scrubPitch?: ScrubPitch
  source: SplitFlapSource
}) {
  const layout = useMemo(() => resolveSplitFlapSource(source), [source])
  const emptyPresentation = useMemo<CompiledBoardPresentation>(
    () => ({
      rows: layout.rows.map(() => ({
        groups: layout.columns.map((column) => ({
          cells: Array.from({ length: column.cells }, () => ({})),
        })),
      })),
    }),
    [layout.columns, layout.rows],
  )
  const resolvedPresentation = presentation ?? emptyPresentation

  return (
    <SplitFlapContentContext value={layout}>
      <SplitFlapRuntimeProvider
        key={layout.layoutKey}
        layout={layout}
        motion={motion}
        presentation={resolvedPresentation}
        scrubPitch={scrubPitch}
      >
        {children}
      </SplitFlapRuntimeProvider>
    </SplitFlapContentContext>
  )
}

function SplitFlapRuntimeProvider({
  children,
  layout,
  motion,
  presentation,
  scrubPitch,
}: {
  children: ReactNode
  layout: ResolvedSplitFlapSource
  motion: MotionTuning
  presentation: CompiledBoardPresentation
  scrubPitch?: ScrubPitch
}) {
  const tuning = useMemo<MotionTuning>(
    () => ({ ...motion, specularStrength: splitFlapSpecularStrength }),
    [motion],
  )
  const [controller] = useState(() => new SplitFlapMotionController(layout.cells, tuning))
  // Cassette renderers only read topology and highlighting. Targets travel through the
  // effect below, so the layout handed to React stays referentially stable across value updates
  // and memoized rows/cassettes bail out instead of re-rendering the whole board.
  const viewLayoutKey = `${layout.layoutKey}:${layout.rows
    .map((row) => Number(Boolean(row.highlighted)))
    .join('')}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const viewLayout = useMemo(() => layout, [viewLayoutKey])

  // The controller is the only external system here; each effect below is a plain prop write.
  // Scheduling (font readiness, paint frames, superseding stale starts) lives in the controller.
  useEffect(() => controller.setMotion(tuning), [controller, tuning])

  useEffect(() => {
    if (scrubPitch) {
      controller.seekPitch(
        scrubPitch.cellIndex,
        scrubPitch.fromIndex,
        scrubPitch.progress,
        scrubPitch.settle,
        scrubPitch.final ?? scrubPitch.settle,
      )
    } else {
      controller.scheduleTargets(layout.targetIndices)
    }
  }, [controller, layout.targetIndices, scrubPitch])

  useEffect(() => () => controller.destroy(), [controller])

  const value = useMemo(
    () => ({ controller, layout: viewLayout, motion: tuning, presentation }),
    [controller, viewLayout, tuning, presentation],
  )

  return <SplitFlapContext value={value}>{children}</SplitFlapContext>
}

type SplitFlapEffectProps = {
  children: ReactNode
  source: SplitFlapSource
}

type SplitFlapPresentationProps = {
  presentation?: CompiledBoardPresentation
}

export function MotionProvider({
  adapter,
  children,
  presentation,
  reduceMotion = false,
  source,
}: SplitFlapEffectProps &
  SplitFlapPresentationProps & {
    adapter: MotionAdapter
    reduceMotion?: boolean
  }) {
  const tuning = useMemo<MotionTuning>(
    () => ({
      cadenceVariationPct: adapter.options.cadenceVariationPct,
      finalSettleMs: adapter.options.finalSettleMs,
      pitchMs: adapter.options.pitchMs,
      reboundDeg: adapter.options.finalReboundDeg,
      reduceMotion,
      renderer: adapter.renderer ?? 'canvas',
      rowDelayMs: adapter.options.rowDelayMs,
      schedule: adapter.schedule,
      specularStrength: splitFlapSpecularStrength,
      startSpreadMs: adapter.options.startSpreadMs,
      variant: adapter.id === 'cascade' ? 'cascade' : 'riffle',
      withinRowJitterMs: adapter.options.withinRowJitterMs,
    }),
    [adapter, reduceMotion],
  )

  return (
    <SplitFlapEffectProvider presentation={presentation} motion={tuning} source={source}>
      {children}
    </SplitFlapEffectProvider>
  )
}

/** @internal Controlled renderer used by the documentation mechanism preview. */
export function ScrubProvider({
  children,
  final,
  fromIndex,
  mode,
  presentation,
  progress,
  source,
}: SplitFlapEffectProps &
  SplitFlapPresentationProps & {
    final?: boolean
    fromIndex: number
    mode: 'cascade' | 'riffle'
    progress: number
  }) {
  const motion = useMemo<MotionTuning>(
    () => ({
      cadenceVariationPct: 0,
      finalSettleMs: 1_000,
      pitchMs: 1_000,
      reboundDeg: 2,
      reduceMotion: false,
      rowDelayMs: 0,
      schedule: idleSchedule,
      specularStrength: splitFlapSpecularStrength,
      startSpreadMs: 0,
      variant: 'scrub',
      withinRowJitterMs: 0,
    }),
    [],
  )
  const scrubPitch = useMemo(
    () => ({
      cellIndex: 0,
      final,
      fromIndex,
      progress,
      settle: mode === 'cascade',
    }),
    [final, fromIndex, mode, progress],
  )

  return (
    <SplitFlapEffectProvider
      motion={motion}
      presentation={presentation}
      scrubPitch={scrubPitch}
      source={source}
    >
      {children}
    </SplitFlapEffectProvider>
  )
}
