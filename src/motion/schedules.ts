import type { ComponentType } from 'react'
import { signedLeafNoise } from './noise'

export type CassetteStart = {
  index: number
  rowIndex: number
}

export type MotionScheduleContext = {
  now: number
  rowDelayMs: number
  salt: number
  start: (index: number, at: number) => void
  startSpreadMs: number
  withinRowJitterMs: number
}

export type MotionSchedule = (
  cassettes: readonly CassetteStart[],
  ctx: MotionScheduleContext,
) => void

export type SharedMotionOptions = {
  cadenceVariationPct: number
  finalReboundDeg: number
  finalSettleMs: number
  pitchMs: number
  rowDelayMs: number
  startSpreadMs: number
  withinRowJitterMs: number
}

export type MotionAdapter = {
  readonly id: string
  readonly options: SharedMotionOptions
  readonly renderer?: 'canvas' | 'css'
  readonly schedule: MotionSchedule
  /** @internal Rendering supplied by the selected motion entry point. */
  readonly Overlay?: ComponentType<{ geometryKey: string }>
}

/** Deterministic -1..1 noise for custom start schedules. */
export function timingNoise(index: number, salt: number) {
  return signedLeafNoise(index, salt)
}

export const scheduleRiffle: MotionSchedule = (cassettes, ctx) => {
  cassettes.forEach((cassette) => {
    const spreadPosition = (timingNoise(cassette.index, ctx.salt) + 1) / 2
    ctx.start(cassette.index, ctx.now + spreadPosition * spreadPosition * ctx.startSpreadMs)
  })
}

export const scheduleCascade: MotionSchedule = (cassettes, ctx) => {
  const affectedRows = Array.from(new Set(cassettes.map((cassette) => cassette.rowIndex))).sort(
    (left, right) => left - right,
  )
  const rowRanks = new Map(affectedRows.map((row, rank) => [row, rank]))

  cassettes.forEach((cassette) => {
    const rowRank = rowRanks.get(cassette.rowIndex) ?? 0
    const jitter = ((timingNoise(cassette.index, ctx.salt) + 1) / 2) * ctx.withinRowJitterMs
    ctx.start(cassette.index, ctx.now + rowRank * ctx.rowDelayMs + jitter)
  })
}

export const idleSchedule: MotionSchedule = () => undefined

export function adapterSignature(adapter: MotionAdapter) {
  return `${adapter.id}:${adapter.renderer ?? 'canvas'}:${motionOptionsSignature(adapter.options)}`
}

export function motionOptionsSignature(options: SharedMotionOptions) {
  return [
    options.cadenceVariationPct,
    options.finalReboundDeg,
    options.finalSettleMs,
    options.pitchMs,
    options.rowDelayMs,
    options.startSpreadMs,
    options.withinRowJitterMs,
  ].join(':')
}
