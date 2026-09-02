import type { MotionAdapter } from '../components'
import type { RiffleMotion } from '../motion/provider'

export type RiffleOptions = Partial<RiffleMotion>

/** Creates a Riffle motion adapter for Flapkit.Root. */
export function riffle(options: RiffleOptions = {}): MotionAdapter {
  return { kind: 'riffle', options }
}
