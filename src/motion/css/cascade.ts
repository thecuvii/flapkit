import { defaultCascadeMotion, type CascadeMotion } from '../options'
import { scheduleCascade, type MotionAdapter } from '../schedules'

/** Row-staggered CSS 3D motion, without the Canvas renderer. */
export function cascade(options: Partial<CascadeMotion> = {}): MotionAdapter {
  const resolved = { ...defaultCascadeMotion, ...options }
  return {
    id: 'cascade',
    renderer: 'css',
    options: {
      ...resolved,
      startSpreadMs: 0,
    },
    schedule: scheduleCascade,
  }
}
