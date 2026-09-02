// Declarative source model compiled from Flapkit compound components.
export const splitFlapVariants = ['white', 'yellow', 'orange'] as const

export type SplitFlapVariant = (typeof splitFlapVariants)[number]

export type SplitFlapSequence = 'alphanumeric' | 'numeric' | 'punctuation'
export type SplitFlapCassetteSpan = 1 | 2

export type SplitFlapPosition = {
  character: string
  variant: SplitFlapVariant
}

export type SplitFlapDeck = readonly SplitFlapPosition[]

export const splitFlapCharacters = Array.from(' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-./:')
export const splitFlapNumericCharacters = Array.from(' 0123456789')
export const splitFlapPunctuationCharacters = Array.from(' :./-')

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** Splits text into displayable characters without breaking emoji or combining marks. */
export function splitFlapGraphemes(value: string) {
  return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment)
}

export function createSplitFlapDeck(
  characters: string | readonly string[],
  variants: readonly SplitFlapVariant[] = ['white'],
): SplitFlapDeck {
  const normalizedCharacters = (
    typeof characters === 'string' ? splitFlapGraphemes(characters) : characters
  ).map(normalizeSplitFlapText)

  return variants.flatMap((variant, variantIndex) =>
    normalizedCharacters
      .filter((character) => variantIndex === 0 || character.trim() !== '')
      .map((character) => ({ character, variant })),
  )
}

export type SplitFlapColumn = {
  cassetteFlapDecks?: readonly (SplitFlapDeck | undefined)[]
  /** Number of standard character-cell widths occupied by each cassette. */
  cassetteSpan?: SplitFlapCassetteSpan
  /** Number of independently driven cassettes in this column. */
  cells: number
  cassetteSequences?: readonly SplitFlapSequence[]
  flapDeck?: SplitFlapDeck
  flapSequence?: SplitFlapSequence
  id: string
  label: string
}

export type SplitFlapValue =
  | string
  | {
      text: string
      variant?: SplitFlapVariant
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
  flapDeck: SplitFlapDeck
  flapSequence: SplitFlapSequence
  homeIndex: number
  id: string
  index: number
  rowId: string
  rowIndex: number
  span: SplitFlapCassetteSpan
  targetIndex: number
  trackIndex: number
  variant: SplitFlapVariant
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

const builtInDecks: Readonly<Record<SplitFlapSequence, SplitFlapDeck>> = {
  alphanumeric: createSplitFlapDeck(splitFlapCharacters),
  numeric: createSplitFlapDeck(splitFlapNumericCharacters),
  punctuation: createSplitFlapDeck(splitFlapPunctuationCharacters),
}

function normalizeSplitFlapText(text: string) {
  const graphemes = splitFlapGraphemes(text)
  if (graphemes.length === 0) return ' '
  return graphemes
    .map((grapheme) => (/^[a-z]$/.test(grapheme) ? grapheme.toUpperCase() : grapheme))
    .join('')
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
  deck: SplitFlapDeck | undefined,
  sequence: SplitFlapSequence,
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
    character: normalizeSplitFlapText(position.character),
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

function targetPositionIndex(
  deck: SplitFlapDeck,
  character: string,
  variant: SplitFlapVariant,
  cellId: string,
) {
  const normalizedCharacter = normalizeSplitFlapText(character)
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

function splitFlapDeckKey(deck: SplitFlapDeck | undefined) {
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
