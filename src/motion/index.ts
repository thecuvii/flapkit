import type { CascadeMotion } from './options'
import { MotionCanvas } from '../render/canvas'
import { cascade as canvasCascade } from './canvas/cascade'
import { cascade as cssCascade } from './css/cascade'
import { type MotionAdapter, type MotionSchedule, type SharedMotionOptions } from './schedules'

export {
  timingNoise,
  type CassetteStart,
  type MotionSchedule,
  type MotionScheduleContext,
} from './schedules'
export { riffle } from './canvas/riffle'
export { adapterSignature } from './schedules'
export type { CascadeMotion, RiffleMotion } from './options'
export type { MotionAdapter, SharedMotionOptions }
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
    Overlay: MotionCanvas,
    options: { ...defaultSharedMotion, ...options },
    schedule,
  }
}

/** @deprecated Import cascade from a renderer-specific motion entry point. */
export function cascade(
  options: Partial<CascadeMotion> & Pick<MotionAdapter, 'renderer'> = {},
): MotionAdapter {
  const { renderer, ...tuning } = options
  return renderer === 'css' ? cssCascade(tuning) : canvasCascade(tuning)
}
