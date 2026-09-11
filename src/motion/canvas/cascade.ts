import { MotionCanvas } from '../../render/canvas'
import { cascade as cssCascade } from '../css/cascade'
import type { CascadeMotion } from '../options'
import type { MotionAdapter } from '../schedules'

/** Row-staggered Canvas motion. */
export function cascade(options: Partial<CascadeMotion> = {}): MotionAdapter {
  return { ...cssCascade(options), renderer: 'canvas', Overlay: MotionCanvas }
}
