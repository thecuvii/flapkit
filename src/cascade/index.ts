import type { MotionAdapter } from '../flapkit'
import type { SplitFlapCascadeMotion } from '../flapkit.context'

export type CascadeOptions = Partial<SplitFlapCascadeMotion>

/** Creates a Cascade motion adapter for Flapkit.Root. */
export function cascade(options: CascadeOptions = {}): MotionAdapter {
  return { kind: 'cascade', options }
}
