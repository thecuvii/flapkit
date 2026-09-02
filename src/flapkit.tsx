'use client'

import { useMemo, type ReactNode } from 'react'
import { SplitFlapBoard } from './split-flap.board'
import {
  SplitFlapCascade,
  SplitFlapRiffle,
  type SplitFlapCascadeMotion,
  type SplitFlapRiffleMotion,
} from './split-flap.context'
import type { SplitFlapMaterial } from './split-flap.material'
import { compileFlapkitBoard } from './flapkit.structure'

export {
  Board,
  Cell,
  Field,
  Header,
  Row,
  WideCell,
  type BoardProps,
  type CellProps,
  type FieldProps,
  type HeaderProps,
  type RowProps,
} from './flapkit.structure'

export type MotionAdapter =
  | { readonly kind: 'cascade'; readonly options: Partial<SplitFlapCascadeMotion> }
  | { readonly kind: 'riffle'; readonly options: Partial<SplitFlapRiffleMotion> }

export type SoundAdapter = {
  /** @internal Rendered inside Root's motion-controller context. */
  readonly render: () => ReactNode
}

export type RootProps = {
  children: ReactNode
  material?: Partial<SplitFlapMaterial>
  motion: MotionAdapter
  sound?: SoundAdapter
}

export function Root({ children, material, motion, sound }: RootProps) {
  const compiled = compileFlapkitBoard(children)
  // The compiler creates a new object; retain it until its serializable source semantics change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const source = useMemo(() => compiled.source, [compiled.sourceSignature])
  const content = (
    <>
      <SplitFlapBoard {...compiled.boardProps}>{compiled.header}</SplitFlapBoard>
      {sound?.render()}
    </>
  )

  return motion.kind === 'riffle' ? (
    <SplitFlapRiffle source={source} material={material} motion={motion.options}>
      {content}
    </SplitFlapRiffle>
  ) : (
    <SplitFlapCascade source={source} material={material} motion={motion.options}>
      {content}
    </SplitFlapCascade>
  )
}
