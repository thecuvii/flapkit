'use client'

import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import {
  type BoardProps,
  type CellProps,
  type GridProps,
  type GroupProps,
  type HeaderProps,
  type RowProps,
  type Variant,
} from './components'
import { splitFlapGraphemes, type Deck, type Sequence } from './deck'
import { kindOf } from './kind'
import { type SplitFlapCassetteSpan, type SplitFlapSource } from './layout'
import type { BoardViewProps } from './render/board'

type CellDescriptor = {
  className?: string
  deck?: Deck
  sequence?: Sequence
  span: SplitFlapCassetteSpan
  text: string
}

type GroupDescriptor = {
  cells: CellDescriptor[]
  className?: string
  id: string
  label: string
  variant: Variant
}

export type CompiledBoard = {
  boardProps: Omit<BoardViewProps, 'children'>
  frame: boolean
  header?: ReactNode
  presentation: CompiledBoardPresentation
  presentationSignature: string
  source: SplitFlapSource
  sourceSignature: string
}

export type CompiledBoardPresentation = {
  rows: Array<{
    className?: string
    groups: Array<{ className?: string; cells: Array<{ className?: string }> }>
  }>
}

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
  const kind = kindOf(element)
  const wide = kind === 'wide-cell'
  if (kind !== 'cell' && !wide) {
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
    className: props.className,
    deck,
    sequence,
    span,
    text,
  }
}

export function deckSignature(deck: Deck | undefined) {
  return deck?.map(({ character, variant }) => `${variant}:${character}`).join('\u001f') ?? ''
}

export function presentationSignature(presentation: CompiledBoardPresentation) {
  return presentation.rows
    .map((row) =>
      [
        row.className ?? '',
        ...row.groups.map((group) =>
          [group.className ?? '', ...group.cells.map((cell) => cell.className ?? '')].join(','),
        ),
      ].join(';'),
    )
    .join('|')
}

function splitFlapValueSignature(value: SplitFlapSource['rows'][number]['values'][string]) {
  return typeof value === 'string'
    ? `white:${value}`
    : `${value.variant ?? 'white'}:${value.text}:${JSON.stringify(value.cassettes ?? [])}`
}

export function sourceSignature(source: SplitFlapSource) {
  return [
    source.columns
      .map((column) =>
        [
          column.id,
          column.cells,
          column.cassetteSpan ?? 1,
          column.label,
          column.flapSequence ?? '',
          column.cassetteSequences?.join(',') ?? '',
          deckSignature(column.flapDeck),
          column.cassetteFlapDecks?.map((deck) => deckSignature(deck)).join(';') ?? '',
        ].join(':'),
      )
      .join('|'),
    source.rows
      .map((row) =>
        [
          row.id,
          Number(Boolean(row.highlighted)),
          Object.entries(row.values)
            .map(([id, value]) => `${id}=${splitFlapValueSignature(value)}`)
            .join(','),
        ].join(':'),
      )
      .join('|'),
  ].join('::')
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
  if (kindOf(element) !== 'group') {
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
    className: props.className,
    id: props.id ?? `group-${groupIndex}`,
    label: props.label ?? '',
    variant: props.variant ?? 'white',
  }
}

function rowGroups(row: ReactElement<RowProps>, rowIndex: number) {
  const parts = structuralElements(row.props.children, `Flapkit.Row ${rowIndex + 1}`)
  if (parts.length === 0) throw new Error('Flapkit.Row requires at least one Cell or Group')
  const hasGroups = parts.some((part) => kindOf(part) === 'group')
  if (hasGroups && parts.some((part) => kindOf(part) !== 'group')) {
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
  if (
    rootChildren.length !== 1 ||
    (kindOf(rootChildren[0]!) !== 'board' && kindOf(rootChildren[0]!) !== 'grid')
  ) {
    throw new Error('Flapkit.Root requires exactly one Flapkit.Board or Flapkit.Grid child')
  }

  const boardElement = rootChildren[0] as ReactElement<BoardProps | GridProps>
  const frame = kindOf(boardElement) === 'board'
  const { children: boardChildren, ...boardProps } = boardElement.props
  const owner = frame ? 'Flapkit.Board' : 'Flapkit.Grid'
  const parts = structuralElements(boardChildren, owner)
  const headers = parts.filter((part) => kindOf(part) === 'header')
  const rowElements = parts.filter((part) => kindOf(part) === 'row') as ReactElement<RowProps>[]
  const invalidPart = parts.find((part) => {
    const kind = kindOf(part)
    return kind !== 'header' && kind !== 'row'
  })
  if (invalidPart) {
    throw new Error(
      `${owner} only accepts Flapkit.Header or Flapkit.Row; received ${componentName(invalidPart)}`,
    )
  }
  if (headers.length > 1) throw new Error('Flapkit.Board accepts at most one Flapkit.Header')
  if (!frame && headers.length > 0) throw new Error('Flapkit.Grid does not accept Flapkit.Header')
  if (rowElements.length === 0) throw new Error(`${owner} requires at least one Flapkit.Row`)

  const rows = rowElements.map((row, rowIndex) => ({
    groups: rowGroups(row, rowIndex),
    highlighted: row.props.highlighted,
    id: row.props.id ?? `row-${rowIndex}`,
    className: row.props.className,
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
      row.groups.map((group) => {
        const cassettes = group.cells.map((cell) => cell.text || ' '.repeat(cell.span))
        return [
          group.id,
          {
            cassettes,
            text: cassettes.join(''),
            ...(group.variant === 'white' ? null : { variant: group.variant }),
          },
        ]
      }),
    ),
  }))
  const source = { columns, rows: sourceRows }
  const presentation = {
    rows: rows.map((row) => ({
      className: row.className,
      groups: row.groups.map((group) => ({
        className: group.className,
        cells: group.cells.map((cell) => ({ className: cell.className })),
      })),
    })),
  }

  return {
    boardProps: boardProps as Omit<BoardViewProps, 'children'>,
    frame,
    header: headers[0] ? (headers[0].props as HeaderProps).children : undefined,
    presentation,
    presentationSignature: presentationSignature(presentation),
    source,
    sourceSignature: sourceSignature(source),
  }
}
