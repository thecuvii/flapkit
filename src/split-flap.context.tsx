'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultSplitFlapMaterial, type SplitFlapMaterial } from './split-flap.material'
import { SplitFlapMotionController, type MotionTuning } from './split-flap.runtime'
import {
  resolveSplitFlapSource,
  type ResolvedSplitFlapSource,
  type SplitFlapSource,
} from './split-flap.source'

export type SplitFlapCss3dCascadeMotion = {
  cadenceVariationPct: number
  finalReboundDeg: number
  finalSettleMs: number
  maximumConcurrentCassettes: number
  pitchMs: number
  rowDelayMs: number
  withinRowJitterMs: number
}

export type SplitFlapRiffleSettleMotion = {
  cadenceVariationPct: number
  finalReboundDeg: number
  finalSettleMs: number
  riffleMs: number
  startSpreadMs: number
}

export const defaultSplitFlapCss3dCascadeMotion: SplitFlapCss3dCascadeMotion = {
  cadenceVariationPct: 6,
  finalReboundDeg: 2,
  finalSettleMs: 260,
  maximumConcurrentCassettes: 32,
  pitchMs: 52,
  rowDelayMs: 150,
  withinRowJitterMs: 16,
}

export const defaultSplitFlapRiffleSettleMotion: SplitFlapRiffleSettleMotion = {
  cadenceVariationPct: 4,
  finalReboundDeg: 2,
  finalSettleMs: 260,
  riffleMs: 36,
  startSpreadMs: 480,
}

type SplitFlapContextValue = {
  controller: SplitFlapMotionController
  layout: ResolvedSplitFlapSource
  material: SplitFlapMaterial
  motion: MotionTuning
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
  material: materialOverrides,
  motion,
  source,
}: {
  children: ReactNode
  material?: Partial<SplitFlapMaterial>
  motion: MotionTuning
  source: SplitFlapSource
}) {
  const material = useMemo(
    () => ({ ...defaultSplitFlapMaterial, ...materialOverrides }),
    [materialOverrides],
  )
  const layout = useMemo(() => resolveSplitFlapSource(source), [source])

  return (
    <SplitFlapRuntimeProvider
      key={layout.layoutKey}
      layout={layout}
      material={material}
      motion={motion}
    >
      {children}
    </SplitFlapRuntimeProvider>
  )
}

function SplitFlapRuntimeProvider({
  children,
  layout,
  material,
  motion,
}: {
  children: ReactNode
  layout: ResolvedSplitFlapSource
  material: SplitFlapMaterial
  motion: MotionTuning
}) {
  const [controller] = useState(() => new SplitFlapMotionController(layout.cells))

  useEffect(() => {
    controller.setMotion({ ...motion, specularStrength: material.specularStrength })
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
  }, [controller, layout.targetIndices, material.specularStrength, motion])

  useEffect(() => () => controller.destroy(), [controller])

  const value = useMemo(
    () => ({
      controller,
      layout,
      material,
      motion: { ...motion, specularStrength: material.specularStrength },
    }),
    [controller, layout, material, motion],
  )

  return <SplitFlapContext value={value}>{children}</SplitFlapContext>
}

type SplitFlapEffectProps = {
  children: ReactNode
  material?: Partial<SplitFlapMaterial>
  source: SplitFlapSource
}

export function SplitFlapCss3dCascade({
  children,
  material,
  motion: motionOverrides,
  source,
}: SplitFlapEffectProps & { motion?: Partial<SplitFlapCss3dCascadeMotion> }) {
  const motion = useMemo(
    () => ({ ...defaultSplitFlapCss3dCascadeMotion, ...motionOverrides }),
    [motionOverrides],
  )
  const tuning = useMemo<MotionTuning>(
    () => ({
      cadenceVariationPct: motion.cadenceVariationPct,
      finalSettleMs: motion.finalSettleMs,
      maximumConcurrentCassettes: motion.maximumConcurrentCassettes,
      pitchMs: motion.pitchMs,
      reboundDeg: motion.finalReboundDeg,
      rowDelayMs: motion.rowDelayMs,
      specularStrength: defaultSplitFlapMaterial.specularStrength,
      startSpreadMs: 0,
      variant: 'css3dCascade',
      withinRowJitterMs: motion.withinRowJitterMs,
    }),
    [motion],
  )

  return (
    <SplitFlapEffectProvider material={material} motion={tuning} source={source}>
      {children}
    </SplitFlapEffectProvider>
  )
}

export function SplitFlapRiffleSettle({
  children,
  material,
  motion: motionOverrides,
  source,
}: SplitFlapEffectProps & { motion?: Partial<SplitFlapRiffleSettleMotion> }) {
  const motion = useMemo(
    () => ({ ...defaultSplitFlapRiffleSettleMotion, ...motionOverrides }),
    [motionOverrides],
  )
  const tuning = useMemo<MotionTuning>(
    () => ({
      cadenceVariationPct: motion.cadenceVariationPct,
      finalSettleMs: motion.finalSettleMs,
      maximumConcurrentCassettes: defaultSplitFlapCss3dCascadeMotion.maximumConcurrentCassettes,
      pitchMs: motion.riffleMs,
      reboundDeg: motion.finalReboundDeg,
      rowDelayMs: 0,
      specularStrength: defaultSplitFlapMaterial.specularStrength,
      startSpreadMs: motion.startSpreadMs,
      variant: 'riffleSettle',
      withinRowJitterMs: 0,
    }),
    [motion],
  )

  return (
    <SplitFlapEffectProvider material={material} motion={tuning} source={source}>
      {children}
    </SplitFlapEffectProvider>
  )
}
