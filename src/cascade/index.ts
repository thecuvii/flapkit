export {
  defaultSplitFlapCascadeMotion,
  SplitFlapCascade,
  type SplitFlapCascadeMotion,
} from '../split-flap.context'
import type { MotionAdapter } from '../flapkit'
import type { SplitFlapCascadeMotion } from '../split-flap.context'

/** Creates a Cascade motion adapter for Flapkit.Root. */
export function cascade(options: Partial<SplitFlapCascadeMotion> = {}): MotionAdapter {
  return { kind: 'cascade', options }
}
