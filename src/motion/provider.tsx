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
import { SplitFlapMotionController, type MotionTuning } from './runtime'

export type CascadeMotion = {
  cadenceVariationPct: number
  finalReboundDeg: number
  finalSettleMs: number
  pitchMs: number
  rowDelayMs: number
  withinRowJitterMs: number
}

export type RiffleMotion = {
  cadenceVariationPct: number
  finalReboundDeg: number
  finalSettleMs: number
  riffleMs: number
  startSpreadMs: number
}

export const defaultCascadeMotion: CascadeMotion = {
  cadenceVariationPct: 6,
  finalReboundDeg: 2,
  finalSettleMs: 260,
  pitchMs: 52,
  rowDelayMs: 150,
  withinRowJitterMs: 16,
}

export const defaultRiffleMotion: RiffleMotion = {
  cadenceVariationPct: 4,
  finalReboundDeg: 2,
  finalSettleMs: 260,
  riffleMs: 36,
  startSpreadMs: 480,
}

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
    <SplitFlapRuntimeProvider
      key={layout.layoutKey}
      layout={layout}
      motion={motion}
      presentation={resolvedPresentation}
      scrubPitch={scrubPitch}
    >
      {children}
    </SplitFlapRuntimeProvider>
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
  const [controller] = useState(() => new SplitFlapMotionController(layout.cells))
  // Renderers only read topology and highlighting. Targets travel to the controller through the
  // effect below, so the layout handed to React stays referentially stable across value updates
  // and memoized rows/cassettes bail out instead of re-rendering the whole board.
  const viewLayoutKey = `${layout.layoutKey}:${layout.rows
    .map((row) => Number(Boolean(row.highlighted)))
    .join('')}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const viewLayout = useMemo(() => layout, [viewLayoutKey])

  useEffect(() => {
    controller.setMotion({ ...motion, specularStrength: splitFlapSpecularStrength })
    if (scrubPitch) {
      controller.seekPitch(
        scrubPitch.cellIndex,
        scrubPitch.fromIndex,
        scrubPitch.progress,
        scrubPitch.settle,
        scrubPitch.final ?? scrubPitch.settle,
      )
      return
    }

    let startFrame = 0
    let prepareFrame = 0
    let cancelled = false
    const start = () => {
      if (cancelled) return
      prepareFrame = requestAnimationFrame(() => {
        startFrame = requestAnimationFrame(() => {
          controller.setTargets(layout.targetIndices)
        })
      })
    }
    void document.fonts.ready.then(start, start)

    return () => {
      cancelled = true
      cancelAnimationFrame(prepareFrame)
      cancelAnimationFrame(startFrame)
    }
  }, [controller, layout.targetIndices, motion, scrubPitch])

  useEffect(() => () => controller.destroy(), [controller])

  const value = useMemo(
    () => ({
      controller,
      layout: viewLayout,
      motion: { ...motion, specularStrength: splitFlapSpecularStrength },
      presentation,
    }),
    [controller, viewLayout, motion, presentation],
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

function CascadeEffect({
  children,
  presentation,
  motion: motionOverrides,
  source,
}: SplitFlapEffectProps & SplitFlapPresentationProps & { motion?: Partial<CascadeMotion> }) {
  const motion = useMemo(() => ({ ...defaultCascadeMotion, ...motionOverrides }), [motionOverrides])
  const tuning = useMemo<MotionTuning>(
    () => ({
      cadenceVariationPct: motion.cadenceVariationPct,
      finalSettleMs: motion.finalSettleMs,
      pitchMs: motion.pitchMs,
      reboundDeg: motion.finalReboundDeg,
      rowDelayMs: motion.rowDelayMs,
      specularStrength: splitFlapSpecularStrength,
      startSpreadMs: 0,
      variant: 'cascade',
      withinRowJitterMs: motion.withinRowJitterMs,
    }),
    [motion],
  )

  return (
    <SplitFlapEffectProvider presentation={presentation} motion={tuning} source={source}>
      {children}
    </SplitFlapEffectProvider>
  )
}

function RiffleEffect({
  children,
  presentation,
  motion: motionOverrides,
  source,
}: SplitFlapEffectProps & SplitFlapPresentationProps & { motion?: Partial<RiffleMotion> }) {
  const motion = useMemo(() => ({ ...defaultRiffleMotion, ...motionOverrides }), [motionOverrides])
  const tuning = useMemo<MotionTuning>(
    () => ({
      cadenceVariationPct: motion.cadenceVariationPct,
      finalSettleMs: motion.finalSettleMs,
      pitchMs: motion.riffleMs,
      reboundDeg: motion.finalReboundDeg,
      rowDelayMs: 0,
      specularStrength: splitFlapSpecularStrength,
      startSpreadMs: motion.startSpreadMs,
      variant: 'riffle',
      withinRowJitterMs: 0,
    }),
    [motion],
  )

  return (
    <SplitFlapEffectProvider presentation={presentation} motion={tuning} source={source}>
      {children}
    </SplitFlapEffectProvider>
  )
}

export function CascadeProvider(
  props: SplitFlapEffectProps & SplitFlapPresentationProps & { motion?: Partial<CascadeMotion> },
) {
  return <CascadeEffect {...props} />
}

export function RiffleProvider(
  props: SplitFlapEffectProps & SplitFlapPresentationProps & { motion?: Partial<RiffleMotion> },
) {
  return <RiffleEffect {...props} />
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
      rowDelayMs: 0,
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
