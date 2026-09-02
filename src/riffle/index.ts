export {
  defaultSplitFlapRiffleMotion,
  SplitFlapRiffle,
  type SplitFlapRiffleMotion,
} from '../split-flap.context'
import type { MotionAdapter } from '../flapkit'
import type { SplitFlapRiffleMotion } from '../split-flap.context'

/** Creates a Riffle motion adapter for Flapkit.Root. */
export function riffle(options: Partial<SplitFlapRiffleMotion> = {}): MotionAdapter {
  return { kind: 'riffle', options }
}
