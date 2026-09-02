'use client'

import { useMemo, type ReactElement, type ReactNode } from 'react'
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
  Group,
  Header,
  Row,
  WideCell,
  type BoardProps,
  type CellProps,
  type GroupProps,
  type HeaderProps,
  type RowProps,
  type Variant,
  type WideCellProps,
} from './flapkit.structure'

export type MotionAdapter =
  | { readonly kind: 'cascade'; readonly options: Partial<SplitFlapCascadeMotion> }
  | { readonly kind: 'riffle'; readonly options: Partial<SplitFlapRiffleMotion> }

export type RootProps = {
  children: ReactNode
  material?: Partial<SplitFlapMaterial>
  motion: MotionAdapter
  sound?: ReactElement
}

export function Root({ children, material, motion, sound }: RootProps) {
  const compiled = compileFlapkitBoard(children)
  // The compiler creates a new object; retain it until its serializable source semantics change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const source = useMemo(() => compiled.source, [compiled.sourceSignature])
  const motionSignature = `${motion.kind}:${JSON.stringify(motion.options)}`
  // Adapter factories are convenient inline props; retain equivalent adapters across parent renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableMotion = useMemo(() => motion, [motionSignature])
  const content = (
    <>
      <SplitFlapBoard {...compiled.boardProps}>{compiled.header}</SplitFlapBoard>
      {sound}
    </>
  )

  return stableMotion.kind === 'riffle' ? (
    <SplitFlapRiffle source={source} material={material} motion={stableMotion.options}>
      {content}
    </SplitFlapRiffle>
  ) : (
    <SplitFlapCascade source={source} material={material} motion={stableMotion.options}>
      {content}
    </SplitFlapCascade>
  )
}
