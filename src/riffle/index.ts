import type { MotionAdapter } from '../flapkit'
import type { SplitFlapRiffleMotion } from '../flapkit.context'

export type RiffleOptions = Partial<SplitFlapRiffleMotion>

/** Creates a Riffle motion adapter for Flapkit.Root. */
export function riffle(options: RiffleOptions = {}): MotionAdapter {
  return { kind: 'riffle', options }
}
