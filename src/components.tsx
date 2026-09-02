'use client'

import { useMemo, type ReactElement, type ReactNode } from 'react'
import { compileFlapkitBoard } from './compiler'
import type { Deck, Sequence, Variant as DeckVariant } from './deck'
import type { MotionAdapter } from './motion'
import { CascadeProvider, RiffleProvider } from './motion/provider'
import { BoardView, type BoardViewProps, GridView, type GridViewProps } from './render/board'

export type BoardProps = Omit<BoardViewProps, 'children'> & { children: ReactNode }
export type GridProps = GridViewProps & { children: ReactNode }
export type HeaderProps = { children: ReactNode }
export type Variant = DeckVariant
export type RowProps = {
  children: ReactNode
  className?: string
  deck?: Deck
  highlighted?: boolean
  id?: string
  label?: string
  sequence?: Sequence
  variant?: Variant
}
export type GroupProps = {
  children: ReactNode
  className?: string
  deck?: Deck
  id?: string
  label?: string
  sequence?: Sequence
  variant?: Variant
}
export type CellProps = {
  children: number | string
  className?: string
  deck?: Deck
  sequence?: Sequence
}
export type WideCellProps = CellProps

/** Framed display consumed by Root. */
export const Board: (props: BoardProps) => null = () => null

/** Frameless display consumed by Root. */
export const Grid: (props: GridProps) => null = () => null

/** Board heading consumed by Root. */
export const Header: (props: HeaderProps) => null = () => null

/** Horizontal display row consumed by Root. */
export const Row: (props: RowProps) => null = () => null

/** Adjacent cassettes sharing one label and variant. */
export const Group: (props: GroupProps) => null = () => null

/** One independently driven, single-grapheme cassette. */
export const Cell: (props: CellProps) => null = () => null

/** One independently driven cassette whose leaves carry two graphemes. */
export const WideCell: (props: WideCellProps) => null = () => null

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
