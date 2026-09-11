'use client'

import {
  createContext,
  createElement,
  cloneElement,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { compileFlapkitBoard } from './compiler'
import type { Deck, Variant as DeckVariant } from './deck'
import { markFlapkit } from './kind'
import { adapterSignature, type MotionAdapter } from './motion/schedules'
import { usePrefersReducedMotion } from './motion/reduced-motion'
import { MotionProvider } from './motion/provider'
import { BoardView, type BoardViewProps, GridView, type GridViewProps } from './render/board'

export type BoardProps = Omit<BoardViewProps, 'children'> & { children: ReactNode }
export type GridProps = GridViewProps & { children: ReactNode }
export type HeaderProps = { children: ReactNode; className?: string; style?: CSSProperties }
export type Variant = DeckVariant
export type RowProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  deck?: Deck
  highlighted?: boolean
  id?: string
  label?: string
  variant?: Variant
}
export type GroupProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  deck?: Deck
  id?: string
  label?: string
  variant?: Variant
}
export type CellProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  deck?: Deck
}
export type WideCellProps = CellProps

export type FaceProps = { className?: string; style?: CSSProperties }
export type GlyphProps = FaceProps & { children: string | number }
export type RetainerProps = FaceProps
export const Face = markFlapkit((_props: FaceProps) => null, 'face')
export const Glyph = markFlapkit((_props: GlyphProps) => null, 'glyph')
export const Retainer = markFlapkit((_props: RetainerProps) => null, 'retainer')

type Declaration = { element: ReactElement<{ children?: ReactNode }>; terminal: boolean }
type Collection = {
  setHost: (host: HTMLElement | null) => void
  nodes: Map<HTMLElement, Declaration>
  changed: () => void
}
const CollectionContext = createContext<Collection | null>(null)

function createCollection(commit: (tree: ReactNode) => void): Collection {
  let host: HTMLElement | null = null
  let pending = false
  let previous: Declaration[] = []
  const nodes = new Map<HTMLElement, Declaration>()
  return {
    setHost(element) {
      host = element
    },
    nodes,
    changed() {
      if (pending) return
      pending = true
      queueMicrotask(() => {
        pending = false
        const root = host
        if (!root) return
        const current: Declaration[] = []
        const read = (parent: HTMLElement): ReactElement[] =>
          Array.from(parent.children).flatMap((element): ReactElement[] => {
            const node = element as HTMLElement
            const entry = nodes.get(node)
            if (!entry) return read(node)
            current.push(entry)
            return [
              cloneElement(entry.element, {
                children: entry.terminal ? entry.element.props.children : read(node),
              }),
            ]
          })
        const tree = read(root)
        if (
          current.length === previous.length &&
          current.every((entry, index) => entry === previous[index])
        )
          return
        previous = current
        commit(current.length ? tree : null)
      })
    },
  }
}

/** Mount declarations through React, then read their committed DOM order. Never evaluate
 * consumer components ourselves: their hooks, context, keys and effects belong to React. */
function declaration<P extends { children?: ReactNode }>(
  kind: Parameters<typeof markFlapkit>[1],
  terminal = false,
) {
  const Component = markFlapkit(function DeclarationNode(props: P) {
    const collection = useContext(CollectionContext)
    if (!collection) throw new Error('Flapkit components require Root')
    const key = useId()
    const ref = useRef<HTMLDivElement>(null)
    useLayoutEffect(() => {
      const node = ref.current!
      collection.nodes.set(node, { element: createElement(Component, { ...props, key }), terminal })
      collection.changed()
      return () => {
        collection.nodes.delete(node)
        collection.changed()
      }
    }, [collection, key, props])
    return <div ref={ref}>{terminal ? null : props.children}</div>
  }, kind)
  return Component
}

export const Board = declaration<BoardProps>('board')
export const Grid = declaration<GridProps>('grid')
export const Header = declaration<HeaderProps>('header', true)
export const Row = declaration<RowProps>('row')
export const Group = declaration<GroupProps>('group')
export const Cell = declaration<CellProps>('cell', true)
export const WideCell = declaration<WideCellProps>('wide-cell', true)

export type RootProps = {
  children: ReactNode
  motion: MotionAdapter
  sound?: ReactElement
}

export function Root({ children, motion, sound }: RootProps) {
  const host = useRef<HTMLDivElement>(null)
  const [committed, setCommitted] = useState<ReactNode>(null)
  const [collection] = useState(() => createCollection(setCommitted))
  useLayoutEffect(() => {
    collection.setHost(host.current)
    const observer = new MutationObserver(collection.changed)
    observer.observe(host.current!, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      collection.setHost(null)
    }
  }, [collection])
  return (
    <>
      <CollectionContext value={collection}>
        <div hidden ref={host} data-flapkit-declarations>
          {children}
        </div>
      </CollectionContext>
      {committed && (
        <CompiledDisplay motion={motion} sound={sound}>
          {committed}
        </CompiledDisplay>
      )}
    </>
  )
}

function CompiledDisplay({ children, motion, sound }: RootProps) {
  const compiled = compileFlapkitBoard(children)
  const reduceMotion = usePrefersReducedMotion()
  // The compiler creates a new object; retain it until its serializable source semantics change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const source = useMemo(() => compiled.source, [compiled.sourceSignature])
  // Presentation affects styling only and must not reset the motion controller on parent renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const presentation = useMemo(() => compiled.presentation, [compiled.presentationSignature])
  const motionSignature = adapterSignature(motion)
  // A new schedule may close over new props. Updating tuning does not remount the controller.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableMotion = useMemo(() => motion, [motionSignature, motion.schedule])
  const display = compiled.frame ? (
    <BoardView {...compiled.boardProps}>{compiled.header}</BoardView>
  ) : (
    <GridView {...compiled.boardProps} />
  )

  return (
    <MotionProvider
      adapter={stableMotion}
      presentation={presentation}
      reduceMotion={reduceMotion}
      source={source}
    >
      {display}
      {sound}
    </MotionProvider>
  )
}
