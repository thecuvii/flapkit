import { defaultCascadeMotion, defaultRiffleMotion, type CascadeMotion, type RiffleMotion } from './options'
import {
  motionOptionsSignature,
  scheduleCascade,
  scheduleRiffle,
  type MotionAdapter,
  type MotionSchedule,
  type SharedMotionOptions,
} from './schedules'

export { timingNoise, type CassetteStart, type MotionSchedule, type MotionScheduleContext } from './schedules'
export type { CascadeMotion, MotionAdapter, RiffleMotion, SharedMotionOptions }
export { defaultCascadeMotion, defaultRiffleMotion } from './options'

export const defaultSharedMotion: SharedMotionOptions = {
  cadenceVariationPct: 4,
  finalReboundDeg: 2,
  finalSettleMs: 260,
  pitchMs: 52,
  rowDelayMs: 0,
  startSpreadMs: 0,
  withinRowJitterMs: 0,
}

/** Creates a motion adapter with a custom start schedule. */
export function motion(
  schedule: MotionSchedule,
  options: Partial<SharedMotionOptions> = {},
): MotionAdapter {
  return {
    id: 'custom',
    options: { ...defaultSharedMotion, ...options },
    schedule,
  }
}

/** Creates row-staggered canvas motion. */
export function cascade(options: Partial<CascadeMotion> = {}): MotionAdapter {
  const resolved = { ...defaultCascadeMotion, ...options }
  return {
    id: 'cascade',
    options: {
      cadenceVariationPct: resolved.cadenceVariationPct,
      finalReboundDeg: resolved.finalReboundDeg,
      finalSettleMs: resolved.finalSettleMs,
      pitchMs: resolved.pitchMs,
      rowDelayMs: resolved.rowDelayMs,
      startSpreadMs: 0,
      withinRowJitterMs: resolved.withinRowJitterMs,
    },
    schedule: scheduleCascade,
  }
}

/** Creates randomized, rapid Canvas-assisted motion. */
export function riffle(options: Partial<RiffleMotion> = {}): MotionAdapter {
  const resolved = { ...defaultRiffleMotion, ...options }
  return {
    id: 'riffle',
    options: {
      cadenceVariationPct: resolved.cadenceVariationPct,
      finalReboundDeg: resolved.finalReboundDeg,
      finalSettleMs: resolved.finalSettleMs,
      pitchMs: resolved.riffleMs,
      rowDelayMs: 0,
      startSpreadMs: resolved.startSpreadMs,
      withinRowJitterMs: 0,
    },
    schedule: scheduleRiffle,
  }
}

export function adapterSignature(adapter: MotionAdapter) {
  return `${adapter.id}:${motionOptionsSignature(adapter.options)}`
}
