import type { MotionAdapter } from '../components'
import type { CascadeMotion } from '../motion/provider'

export type CascadeOptions = Partial<CascadeMotion>

/** Creates a Cascade motion adapter for Flapkit.Root. */
export function cascade(options: CascadeOptions = {}): MotionAdapter {
  return { kind: 'cascade', options }
}
