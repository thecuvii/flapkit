import type { CascadeMotion, RiffleMotion } from './provider'

export type MotionAdapter =
  | { readonly kind: 'cascade'; readonly options: Partial<CascadeMotion> }
  | { readonly kind: 'riffle'; readonly options: Partial<RiffleMotion> }

/** Creates row-staggered canvas motion. */
export function cascade(options: Partial<CascadeMotion> = {}): MotionAdapter {
  return { kind: 'cascade', options }
}

/** Creates randomized, rapid Canvas-assisted motion. */
export function riffle(options: Partial<RiffleMotion> = {}): MotionAdapter {
  return { kind: 'riffle', options }
}
