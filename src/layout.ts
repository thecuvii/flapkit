// Internal layout model compiled from Flapkit compound components.
import {
  createDeck,
  normalizeDeckCharacter,
  splitFlapCharacters,
  splitFlapGraphemes,
  splitFlapNumericCharacters,
  splitFlapPunctuationCharacters,
  type Deck,
  type Sequence,
  type Variant,
} from './deck'

export type SplitFlapCassetteSpan = 1 | 2

export type SplitFlapColumn = {
  cassetteFlapDecks?: readonly (Deck | undefined)[]
  /** Number of standard character-cell widths occupied by each cassette. */
  cassetteSpan?: SplitFlapCassetteSpan
  /** Number of independently driven cassettes in this column. */
  cells: number
  cassetteSequences?: readonly Sequence[]
  flapDeck?: Deck
  flapSequence?: Sequence
  id: string
  label: string
}

export type SplitFlapValue =
  | string
  | {
      text: string
      variant?: Variant
    }

export type SplitFlapRow = {
  id: string
  highlighted?: boolean
  values: Readonly<Record<string, SplitFlapValue>>
}

export type SplitFlapSource = {
  columns: readonly SplitFlapColumn[]
  rows: readonly SplitFlapRow[]
}

export type ResolvedSplitFlapColumn = SplitFlapColumn & {
  cassetteSpan: SplitFlapCassetteSpan
  offset: number
  trackOffset: number
}

export type ResolvedSplitFlapCell = {
  character: string
  columnId: string
  columnIndex: number
  columnOffset: number
  flapDeck: Deck
  flapSequence: Sequence
  homeIndex: number
  id: string
  index: number
  rowId: string
  rowIndex: number
  span: SplitFlapCassetteSpan
  targetIndex: number
  trackIndex: number
  variant: Variant
}

export type ResolvedSplitFlapSource = {
  cells: readonly ResolvedSplitFlapCell[]
  cellIndexById: ReadonlyMap<string, number>
  columns: readonly ResolvedSplitFlapColumn[]
  layoutKey: string
  rowCellCount: number
  rows: readonly SplitFlapRow[]
  targetIndices: readonly number[]
}

const builtInDecks: Readonly<Record<Sequence, Deck>> = {
  alphanumeric: createDeck(splitFlapCharacters),
  numeric: createDeck(splitFlapNumericCharacters),
  punctuation: createDeck(splitFlapPunctuationCharacters),
}

function assertUniqueIds(items: readonly { id: string }[], kind: 'column' | 'row') {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`Split-flap source has duplicate ${kind} id "${item.id}"`)
    }
    ids.add(item.id)
  }
}

function resolveSplitFlapDeck(
  deck: Deck | undefined,
  sequence: Sequence,
  cassetteSpan: SplitFlapCassetteSpan,
  columnId: string,
) {
  if (!deck?.length) {
    if (cassetteSpan > 1) {
      throw new Error(
        `Split-flap column "${columnId}" requires a custom deck with ${cassetteSpan}-grapheme positions`,
      )
    }
    return builtInDecks[sequence]
  }

  const positions = deck.map((position) => ({
    character: normalizeDeckCharacter(position.character),
    variant: position.variant,
  }))
  const invalidPosition = positions.find(
    (position) => splitFlapGraphemes(position.character).length !== cassetteSpan,
  )
  if (invalidPosition) {
    throw new Error(
      `Split-flap deck for column "${columnId}" has position "${invalidPosition.character}" with the wrong grapheme count for a ${cassetteSpan}-cell cassette`,
    )
  }
  return positions
}

function targetPositionIndex(deck: Deck, character: string, variant: Variant, cellId: string) {
  const normalizedCharacter = normalizeDeckCharacter(character)
  const exactIndex = deck.findIndex(
    (position) => position.character === normalizedCharacter && position.variant === variant,
  )
  if (exactIndex >= 0) return exactIndex

  const blankIndex = deck.findIndex((position) => position.character.trim() === '')
  if (
    normalizedCharacter.trim() === '' ||
    !deck.some((position) => position.character === normalizedCharacter)
  ) {
    if (blankIndex >= 0) return blankIndex
    throw new Error(`Split-flap deck for "${cellId}" has no blank fallback position`)
  }

  throw new Error(
    `Split-flap deck for "${cellId}" has no ${variant} "${normalizedCharacter}" position`,
  )
}

function splitFlapDeckKey(deck: Deck | undefined) {
  return deck?.map((position) => `${position.character}:${position.variant}`).join(',') ?? ''
}

function splitFlapValue(value: SplitFlapValue | undefined) {
  return typeof value === 'string'
    ? { text: value, variant: 'white' as const }
    : { text: value?.text ?? '', variant: value?.variant ?? ('white' as const) }
}

export function resolveSplitFlapSource(source: SplitFlapSource): ResolvedSplitFlapSource {
  assertUniqueIds(source.columns, 'column')
  assertUniqueIds(source.rows, 'row')

  let offset = 0
  let trackOffset = 0
  const columns = source.columns.map((column) => {
    const cells = Math.max(1, Math.round(column.cells))
    const cassetteSpan = column.cassetteSpan ?? 1
    const resolved = { ...column, cassetteSpan, cells, offset, trackOffset }
    offset += cells
    trackOffset += cells * cassetteSpan
    return resolved
  })
  const rowCellCount = offset
  const cells = source.rows.flatMap((row, rowIndex) =>
    columns.flatMap((column) => {
      const value = splitFlapValue(row.values[column.id])
      const valueCharacters = splitFlapGraphemes(value.text)
      const characters = Array.from({ length: column.cells }, (_, cassetteIndex) =>
        Array.from(
          { length: column.cassetteSpan },
          (_, spanIndex) => valueCharacters[cassetteIndex * column.cassetteSpan + spanIndex] ?? ' ',
        ).join(''),
      )

      return characters.map((character, columnIndex) => {
        const index = rowIndex * rowCellCount + column.offset + columnIndex
        const flapSequence =
          column.cassetteSequences?.[columnIndex] ??
          column.flapSequence ??
          ('alphanumeric' as const)
        const flapDeck = resolveSplitFlapDeck(
          column.cassetteFlapDecks?.[columnIndex] ?? column.flapDeck,
          flapSequence,
          column.cassetteSpan,
          column.id,
        )
        const id = `${row.id}:${column.id}:${columnIndex}`
        return {
          character,
          columnId: column.id,
          columnIndex,
          columnOffset: column.offset,
          flapDeck,
          flapSequence,
          homeIndex: Math.max(
            0,
            flapDeck.findIndex((position) => position.character.trim() === ''),
          ),
          id,
          index,
          rowId: row.id,
          rowIndex,
          span: column.cassetteSpan,
          targetIndex: targetPositionIndex(flapDeck, character, value.variant, id),
          trackIndex: column.trackOffset + columnIndex * column.cassetteSpan,
          variant: value.variant,
        }
      })
    }),
  )

  return {
    cells,
    cellIndexById: new Map(cells.map((cell) => [cell.id, cell.index])),
    columns,
    layoutKey: `${columns
      .map(
        (column) =>
          `${column.id}:${column.cells}:${column.cassetteSpan}:${column.flapSequence ?? 'alphanumeric'}:${column.cassetteSequences?.join(',') ?? ''}:${splitFlapDeckKey(column.flapDeck)}:${column.cassetteFlapDecks?.map(splitFlapDeckKey).join(';') ?? ''}`,
      )
      .join('|')}::${source.rows.map((row) => row.id).join('|')}`,
    rowCellCount,
    rows: source.rows,
    targetIndices: cells.map((cell) => cell.targetIndex),
  }
}
