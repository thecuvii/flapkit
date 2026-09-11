import { MotionCanvas } from '../../render/canvas'
import { defaultRiffleMotion, type RiffleMotion } from '../options'
import { scheduleRiffle, type MotionAdapter } from '../schedules'

/** Randomized, rapid Canvas motion. */
export function riffle(options: Partial<RiffleMotion> = {}): MotionAdapter {
  const resolved = { ...defaultRiffleMotion, ...options }
  return {
    id: 'riffle',
    renderer: 'canvas',
    Overlay: MotionCanvas,
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
