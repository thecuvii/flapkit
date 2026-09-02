import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import type { SplitFlapBoardProps } from './split-flap.board'
import {
  splitFlapGraphemes,
  type SplitFlapCassetteSpan,
  type SplitFlapDeck,
  type SplitFlapSequence,
  type SplitFlapSource,
  type SplitFlapTone,
} from './split-flap.source'

export type BoardProps = Omit<SplitFlapBoardProps, 'children'> & { children: ReactNode }

export type HeaderProps = { children: ReactNode }
export type RowProps = { children: ReactNode; highlighted?: boolean }
export type FieldProps = { children: ReactNode; label?: string }

export type CellProps = {
  children: string
  flapDeck?: SplitFlapDeck
  flapSequence?: SplitFlapSequence
  tone?: SplitFlapTone
}

type CellDescriptor = {
  flapDeck?: SplitFlapDeck
  flapSequence?: SplitFlapSequence
  span: SplitFlapCassetteSpan
  text: string
  tone?: SplitFlapTone
}

type FieldDescriptor = {
  cells: CellDescriptor[]
  label: string
}

export type CompiledBoard = {
  boardProps: Omit<BoardProps, 'children'>
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

/** A legacy board field containing adjacent cassettes with one shared label. */
export const Field: (props: FieldProps) => null = () => null

/** One independently driven, single-grapheme cassette. */
export const Cell: (props: CellProps) => null = () => null

/** One independently driven cassette whose leaves carry two graphemes. */
export const WideCell: (props: CellProps) => null = () => null

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

function cellDescriptor(element: ReactElement, rowIndex: number): CellDescriptor {
  const wide = element.type === WideCell
  if (element.type !== Cell && !wide) {
    throw new Error(
      `Flapkit.Row ${rowIndex + 1} only accepts Flapkit.Cell or Flapkit.WideCell; received ${componentName(element)}`,
    )
  }
  const props = element.props as CellProps
  if (typeof props.children !== 'string') {
    throw new TypeError(`Flapkit Cell content must be a string in row ${rowIndex + 1}`)
  }
  const span = wide ? 2 : 1
  const graphemeCount = splitFlapGraphemes(props.children).length
  if (graphemeCount !== 0 && graphemeCount !== span) {
    throw new Error(
      `${wide ? 'Flapkit.WideCell' : 'Flapkit.Cell'} requires ${span} grapheme${span === 1 ? '' : 's'}; received ${graphemeCount}`,
    )
  }
  return {
    flapDeck: props.flapDeck,
    flapSequence: props.flapSequence,
    span,
    text: props.children,
    tone: props.tone,
  }
}

function deckSignature(deck: SplitFlapDeck | undefined) {
  return deck?.map(({ character, tone }) => `${tone}:${character}`).join('\u001f') ?? ''
}

function cellTopologySignature(cell: CellDescriptor) {
  return `${cell.span}:${cell.flapSequence ?? 'alphanumeric'}:${deckSignature(cell.flapDeck)}`
}

function fieldColumnOptions(field: FieldDescriptor) {
  const firstDeck = field.cells[0]!.flapDeck
  const firstSequence = field.cells[0]!.flapSequence
  const sharesDeck = field.cells.every(
    (cell) => deckSignature(cell.flapDeck) === deckSignature(firstDeck),
  )
  const sharesSequence = field.cells.every((cell) => cell.flapSequence === firstSequence)

  return {
    ...(sharesDeck
      ? firstDeck
        ? { flapDeck: firstDeck }
        : {}
      : { cassetteFlapDecks: field.cells.map((cell) => cell.flapDeck) }),
    ...(sharesSequence
      ? firstSequence
        ? { flapSequence: firstSequence }
        : {}
      : {
          cassetteSequences: field.cells.map(
            (cell) => cell.flapSequence ?? ('alphanumeric' as const),
          ),
        }),
  }
}

function fieldDescriptor(element: ReactElement, rowIndex: number): FieldDescriptor {
  if (element.type !== Field) {
    throw new Error(
      `Flapkit.Row ${rowIndex + 1} only accepts Flapkit.Field or a flat list of cells; received ${componentName(element)}`,
    )
  }
  const props = element.props as FieldProps
  const cells = structuralElements(props.children, `Flapkit.Field in row ${rowIndex + 1}`).map(
    (cell) => cellDescriptor(cell, rowIndex),
  )
  if (cells.length === 0) throw new Error('Flapkit.Field requires at least one Cell')
  if (cells.some((cell) => cell.span !== cells[0]!.span)) {
    throw new Error(`Flapkit.Field in row ${rowIndex + 1} requires one cassette width`)
  }
  const tones = new Set(cells.map((cell) => cell.tone ?? 'warmWhite'))
  if (tones.size > 1) {
    throw new Error(`Flapkit.Field in row ${rowIndex + 1} requires one tone`)
  }
  return { cells, label: props.label ?? '' }
}

function rowFields(row: ReactElement<RowProps>, rowIndex: number) {
  const parts = structuralElements(row.props.children, `Flapkit.Row ${rowIndex + 1}`)
  if (parts.length === 0) throw new Error('Flapkit.Row requires at least one Cell or Field')
  const hasFields = parts.some((part) => part.type === Field)
  if (hasFields && parts.some((part) => part.type !== Field)) {
    throw new Error(`Flapkit.Row ${rowIndex + 1} cannot mix Field and Cell children`)
  }
  if (hasFields) return parts.map((part) => fieldDescriptor(part, rowIndex))

  const cells = parts.map((part) => cellDescriptor(part, rowIndex))
  if (cells.some((cell) => cell.span !== cells[0]!.span)) {
    throw new Error(
      `Flapkit.Row ${rowIndex + 1} requires Field boundaries around different cassette widths`,
    )
  }
  const tones = new Set(cells.map((cell) => cell.tone ?? 'warmWhite'))
  if (tones.size > 1) {
    throw new Error(`Flapkit.Row ${rowIndex + 1} requires Field boundaries around different tones`)
  }
  return [{ cells, label: '' }]
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
    fields: rowFields(row, rowIndex),
    highlighted: row.props.highlighted,
    id: `row-${rowIndex}`,
  }))
  const firstRow = rows[0]!
  const topology = firstRow.fields.map((field) => field.cells.map(cellTopologySignature).join('|'))
  for (const [rowIndex, row] of rows.entries()) {
    const matches =
      row.fields.length === topology.length &&
      row.fields.every(
        (field, fieldIndex) =>
          field.label === firstRow.fields[fieldIndex]?.label &&
          field.cells.map(cellTopologySignature).join('|') === topology[fieldIndex],
      )
    if (!matches) {
      throw new Error(
        `Flapkit.Row ${rowIndex + 1} must use the same Field, Cell, and WideCell structure as the first row`,
      )
    }
  }

  const columns = firstRow.fields.map((field, fieldIndex) => ({
    ...fieldColumnOptions(field),
    cassetteSpan: field.cells[0]!.span,
    cells: field.cells.length,
    id: `field-${fieldIndex}`,
    label: field.label,
  }))
  const sourceRows = rows.map((row) => ({
    highlighted: row.highlighted,
    id: row.id,
    values: Object.fromEntries(
      row.fields.map((field, fieldIndex) => [
        `field-${fieldIndex}`,
        field.cells[0]?.tone
          ? { text: field.cells.map((cell) => cell.text).join(''), tone: field.cells[0].tone }
          : field.cells.map((cell) => cell.text).join(''),
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
