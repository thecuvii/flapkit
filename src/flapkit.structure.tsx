'use client'

import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import type { SplitFlapBoardProps } from './split-flap.board'
import {
  splitFlapGraphemes,
  type SplitFlapCassetteSpan,
  type SplitFlapDeck,
  type SplitFlapSequence,
  type SplitFlapSource,
  type SplitFlapVariant,
} from './split-flap.source'

export type Variant = SplitFlapVariant

export type BoardProps = Omit<SplitFlapBoardProps, 'children'> & { children: ReactNode }

export type HeaderProps = { children: ReactNode }
export type RowProps = {
  children: ReactNode
  deck?: SplitFlapDeck
  highlighted?: boolean
  id?: string
  label?: string
  sequence?: SplitFlapSequence
  variant?: Variant
}
export type GroupProps = {
  children: ReactNode
  deck?: SplitFlapDeck
  id?: string
  label?: string
  sequence?: SplitFlapSequence
  variant?: Variant
}

export type CellProps = {
  children: number | string
  deck?: SplitFlapDeck
  sequence?: SplitFlapSequence
}

export type WideCellProps = CellProps

type CellDescriptor = {
  deck?: SplitFlapDeck
  sequence?: SplitFlapSequence
  span: SplitFlapCassetteSpan
  text: string
}

type GroupDescriptor = {
  cells: CellDescriptor[]
  id: string
  label: string
  variant: Variant
}

export type CompiledBoard = {
  boardProps: Omit<SplitFlapBoardProps, 'children'>
  header?: ReactNode
  source: SplitFlapSource
  sourceSignature: string
}

/** Structural marker consumed by Root before rendering. */
export const Board: (props: BoardProps) => null = () => null

/** Structural marker consumed by Root before rendering. */
export const Header: (props: HeaderProps) => null = () => null

/** Structural marker consumed by Root before rendering. */
export const Row: (props: RowProps) => null = () => null

/** A horizontal region of adjacent cassettes sharing one label and variant. */
export const Group: (props: GroupProps) => null = () => null

/** One independently driven, single-grapheme cassette. */
export const Cell: (props: CellProps) => null = () => null

/** One independently driven cassette whose leaves carry two graphemes. */
export const WideCell: (props: WideCellProps) => null = () => null

function componentName(element: ReactElement) {
  if (typeof element.type === 'string') return element.type
  return element.type === Fragment
    ? 'Fragment'
    : ((element.type as { displayName?: string; name?: string }).displayName ??
        (element.type as { name?: string }).name ??
        'component')
}

function structuralElements(children: ReactNode, owner: string): ReactElement[] {
  const result: ReactElement[] = []
  Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === 'boolean') return
    if (!isValidElement(child)) {
      throw new Error(`${owner} only accepts Flapkit structural components`)
    }
    if (child.type === Fragment) {
      structuralElements((child.props as { children?: ReactNode }).children, owner).forEach(
        (element) => result.push(element),
      )
      return
    }
    result.push(child)
  })
  return result
}

function cellDescriptor(
  element: ReactElement,
  rowIndex: number,
  defaults: Pick<GroupProps, 'deck' | 'sequence'> = {},
): CellDescriptor {
  const wide = element.type === WideCell
  if (element.type !== Cell && !wide) {
    throw new Error(
      `Flapkit.Row ${rowIndex + 1} only accepts Flapkit.Cell or Flapkit.WideCell; received ${componentName(element)}`,
    )
  }
  const props = element.props as CellProps
  if (typeof props.children !== 'number' && typeof props.children !== 'string') {
    throw new TypeError(`Flapkit Cell content must be a string or number in row ${rowIndex + 1}`)
  }
  const text = String(props.children)
  const deck = props.deck ?? defaults.deck
  const sequence = props.sequence ?? defaults.sequence
  const span = wide ? 2 : 1
  const graphemeCount = splitFlapGraphemes(text).length
  if (graphemeCount !== 0 && graphemeCount !== span) {
    throw new Error(
      `${wide ? 'Flapkit.WideCell' : 'Flapkit.Cell'} requires ${span} grapheme${span === 1 ? '' : 's'}; received ${graphemeCount}`,
    )
  }
  if (wide && !deck) {
    throw new Error('Flapkit.WideCell requires a custom two-grapheme deck on itself or its Group')
  }
  return {
    deck,
    sequence,
    span,
    text,
  }
}

function deckSignature(deck: SplitFlapDeck | undefined) {
  return deck?.map(({ character, variant }) => `${variant}:${character}`).join('\u001f') ?? ''
}

function cellTopologySignature(cell: CellDescriptor) {
  return `${cell.span}:${cell.sequence ?? 'alphanumeric'}:${deckSignature(cell.deck)}`
}

function groupColumnOptions(group: GroupDescriptor) {
  const firstDeck = group.cells[0]!.deck
  const firstSequence = group.cells[0]!.sequence
  const sharesDeck = group.cells.every(
    (cell) => deckSignature(cell.deck) === deckSignature(firstDeck),
  )
  const sharesSequence = group.cells.every((cell) => cell.sequence === firstSequence)

  return {
    ...(sharesDeck
      ? firstDeck
        ? { flapDeck: firstDeck }
        : {}
      : { cassetteFlapDecks: group.cells.map((cell) => cell.deck) }),
    ...(sharesSequence
      ? firstSequence
        ? { flapSequence: firstSequence }
        : {}
      : {
          cassetteSequences: group.cells.map((cell) => cell.sequence ?? ('alphanumeric' as const)),
        }),
  }
}

function groupDescriptor(
  element: ReactElement,
  rowIndex: number,
  groupIndex: number,
): GroupDescriptor {
  if (element.type !== Group) {
    throw new Error(
      `Flapkit.Row ${rowIndex + 1} only accepts Flapkit.Group or a flat list of cells; received ${componentName(element)}`,
    )
  }
  const props = element.props as GroupProps
  const cells = structuralElements(props.children, `Flapkit.Group in row ${rowIndex + 1}`).map(
    (cell) => cellDescriptor(cell, rowIndex, props),
  )
  if (cells.length === 0) throw new Error('Flapkit.Group requires at least one Cell')
  if (cells.some((cell) => cell.span !== cells[0]!.span)) {
    throw new Error(`Flapkit.Group in row ${rowIndex + 1} requires one cassette width`)
  }
  return {
    cells,
    id: props.id ?? `group-${groupIndex}`,
    label: props.label ?? '',
    variant: props.variant ?? 'white',
  }
}

function rowGroups(row: ReactElement<RowProps>, rowIndex: number) {
  const parts = structuralElements(row.props.children, `Flapkit.Row ${rowIndex + 1}`)
  if (parts.length === 0) throw new Error('Flapkit.Row requires at least one Cell or Group')
  const hasGroups = parts.some((part) => part.type === Group)
  if (hasGroups && parts.some((part) => part.type !== Group)) {
    throw new Error(`Flapkit.Row ${rowIndex + 1} cannot mix Group and Cell children`)
  }
  if (hasGroups) {
    if (
      row.props.deck !== undefined ||
      row.props.label !== undefined ||
      row.props.sequence !== undefined ||
      row.props.variant !== undefined
    ) {
      throw new Error(
        `Flapkit.Row ${rowIndex + 1} cannot set label, variant, deck, or sequence when it contains Groups`,
      )
    }
    return parts.map((part, groupIndex) => groupDescriptor(part, rowIndex, groupIndex))
  }

  const cells = parts.map((part) => cellDescriptor(part, rowIndex, row.props))
  if (cells.some((cell) => cell.span !== cells[0]!.span)) {
    throw new Error(
      `Flapkit.Row ${rowIndex + 1} requires Group boundaries around different cassette widths`,
    )
  }
  return [
    {
      cells,
      id: 'group-0',
      label: row.props.label ?? '',
      variant: row.props.variant ?? 'white',
    },
  ]
}

/** Purely compiles structural components into the current source model. */
export function compileFlapkitBoard(children: ReactNode): CompiledBoard {
  const rootChildren = structuralElements(children, 'Flapkit.Root')
  if (rootChildren.length !== 1 || rootChildren[0]?.type !== Board) {
    throw new Error('Flapkit.Root requires exactly one Flapkit.Board child')
  }

  const boardElement = rootChildren[0] as ReactElement<BoardProps>
  const { children: boardChildren, ...boardProps } = boardElement.props
  const parts = structuralElements(boardChildren, 'Flapkit.Board')
  const headers = parts.filter((part) => part.type === Header)
  const rowElements = parts.filter((part) => part.type === Row) as ReactElement<RowProps>[]
  const invalidPart = parts.find((part) => part.type !== Header && part.type !== Row)
  if (invalidPart) {
    throw new Error(
      `Flapkit.Board only accepts Flapkit.Header or Flapkit.Row; received ${componentName(invalidPart)}`,
    )
  }
  if (headers.length > 1) throw new Error('Flapkit.Board accepts at most one Flapkit.Header')
  if (rowElements.length === 0) throw new Error('Flapkit.Board requires at least one Flapkit.Row')

  const rows = rowElements.map((row, rowIndex) => ({
    groups: rowGroups(row, rowIndex),
    highlighted: row.props.highlighted,
    id: row.props.id ?? `row-${rowIndex}`,
  }))
  const firstRow = rows[0]!
  const topology = firstRow.groups.map((group) => group.cells.map(cellTopologySignature).join('|'))
  for (const [rowIndex, row] of rows.entries()) {
    const matches =
      row.groups.length === topology.length &&
      row.groups.every(
        (group, groupIndex) =>
          group.id === firstRow.groups[groupIndex]?.id &&
          group.label === firstRow.groups[groupIndex]?.label &&
          group.cells.map(cellTopologySignature).join('|') === topology[groupIndex],
      )
    if (!matches) {
      throw new Error(
        `Flapkit.Row ${rowIndex + 1} must use the same Group, Cell, and WideCell structure as the first row`,
      )
    }
  }

  const columns = firstRow.groups.map((group) => ({
    ...groupColumnOptions(group),
    cassetteSpan: group.cells[0]!.span,
    cells: group.cells.length,
    id: group.id,
    label: group.label,
  }))
  const sourceRows = rows.map((row) => ({
    highlighted: row.highlighted,
    id: row.id,
    values: Object.fromEntries(
      row.groups.map((group) => [
        group.id,
        group.variant === 'white'
          ? group.cells.map((cell) => cell.text).join('')
          : {
              text: group.cells.map((cell) => cell.text).join(''),
              variant: group.variant,
            },
      ]),
    ),
  }))
  const source = { columns, rows: sourceRows }

  return {
    boardProps,
    header: headers[0] ? (headers[0].props as HeaderProps).children : undefined,
    source,
    sourceSignature: JSON.stringify(source),
  }
}
