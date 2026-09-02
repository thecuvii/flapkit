'use client'

import { useMemo, type ReactElement, type ReactNode } from 'react'
import { BoardView, GridView } from './flapkit.board'
import {
  CascadeProvider,
  RiffleProvider,
  type SplitFlapCascadeMotion,
  type SplitFlapRiffleMotion,
} from './flapkit.context'
import { compileFlapkitBoard } from './flapkit.structure'

export {
  Board,
  Cell,
  Grid,
  Group,
  Header,
  Row,
  WideCell,
  type BoardProps,
  type CellProps,
  type GridProps,
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
  motion: MotionAdapter
  sound?: ReactElement
}

export function Root({ children, motion, sound }: RootProps) {
  const compiled = compileFlapkitBoard(children)
  // The compiler creates a new object; retain it until its serializable source semantics change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const source = useMemo(() => compiled.source, [compiled.sourceSignature])
  // Presentation affects styling only and must not reset the motion controller on parent renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const presentation = useMemo(() => compiled.presentation, [compiled.presentationSignature])
  const motionSignature = `${motion.kind}:${JSON.stringify(motion.options)}`
  // Adapter factories are convenient inline props; retain equivalent adapters across parent renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableMotion = useMemo(() => motion, [motionSignature])
  const display = compiled.frame ? (
    <BoardView {...compiled.boardProps}>{compiled.header}</BoardView>
  ) : (
    <GridView {...compiled.boardProps} />
  )
  const content = (
    <>
      {display}
      {sound}
    </>
  )

  return stableMotion.kind === 'riffle' ? (
    <RiffleProvider source={source} presentation={presentation} motion={stableMotion.options}>
      {content}
    </RiffleProvider>
  ) : (
    <CascadeProvider source={source} presentation={presentation} motion={stableMotion.options}>
      {content}
    </CascadeProvider>
  )
}
