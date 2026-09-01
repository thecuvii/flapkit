export const splitFlapTones = ['warmWhite', 'signalYellow', 'ochreOrange'] as const

export type SplitFlapTone = (typeof splitFlapTones)[number]

export type SplitFlapSequence = 'alphanumeric' | 'numeric' | 'punctuation'
export type SplitFlapPanelsPerCassette = 1 | 2

export type SplitFlapPosition = {
  character: string
  tone: SplitFlapTone
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
  tones: readonly SplitFlapTone[] = ['warmWhite'],
): SplitFlapDeck {
  const normalizedCharacters = (
    typeof characters === 'string' ? splitFlapGraphemes(characters) : characters
  ).map(normalizeSplitFlapCharacter)

  return tones.flatMap((tone, toneIndex) =>
    normalizedCharacters
      .filter((character) => toneIndex === 0 || character !== ' ')
      .map((character) => ({ character, tone })),
  )
}

export type SplitFlapColumn = {
  cellFlapDecks?: readonly (SplitFlapDeck | undefined)[]
  cells: number
  cellSequences?: readonly SplitFlapSequence[]
  flapDeck?: SplitFlapDeck
  flapSequence?: SplitFlapSequence
  id: string
  label: string
  panelsPerCassette?: SplitFlapPanelsPerCassette
}

export type SplitFlapValue =
  | string
  | {
      text: string
      tone?: SplitFlapTone
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
  offset: number
  panelsPerCassette: SplitFlapPanelsPerCassette
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
  targetIndex: number
  tone: SplitFlapTone
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

function normalizeSplitFlapCharacter(character: string) {
  const grapheme = splitFlapGraphemes(character)[0] ?? ' '
  return /^[a-z]$/.test(grapheme) ? grapheme.toUpperCase() : grapheme
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

function resolveSplitFlapDeck(deck: SplitFlapDeck | undefined, sequence: SplitFlapSequence) {
  if (!deck?.length) return builtInDecks[sequence]

  const positions = deck.map((position) => ({
    character: normalizeSplitFlapCharacter(position.character),
    tone: position.tone,
  }))
  return positions
}

function targetPositionIndex(
  deck: SplitFlapDeck,
  character: string,
  tone: SplitFlapTone,
  cellId: string,
) {
  const normalizedCharacter = normalizeSplitFlapCharacter(character)
  const exactIndex = deck.findIndex(
    (position) => position.character === normalizedCharacter && position.tone === tone,
  )
  if (exactIndex >= 0) return exactIndex

  const blankIndex = deck.findIndex((position) => position.character === ' ')
  if (
    normalizedCharacter === ' ' ||
    !deck.some((position) => position.character === normalizedCharacter)
  ) {
    if (blankIndex >= 0) return blankIndex
    throw new Error(`Split-flap deck for "${cellId}" has no blank fallback position`)
  }

  throw new Error(
    `Split-flap deck for "${cellId}" has no ${tone} "${normalizedCharacter}" position`,
  )
}

function splitFlapDeckKey(deck: SplitFlapDeck | undefined) {
  return deck?.map((position) => `${position.character}:${position.tone}`).join(',') ?? ''
}

function splitFlapValue(value: SplitFlapValue | undefined) {
  return typeof value === 'string'
    ? { text: value, tone: 'warmWhite' as const }
    : { text: value?.text ?? '', tone: value?.tone ?? ('warmWhite' as const) }
}

export function resolveSplitFlapSource(source: SplitFlapSource): ResolvedSplitFlapSource {
  assertUniqueIds(source.columns, 'column')
  assertUniqueIds(source.rows, 'row')

  let offset = 0
  const columns = source.columns.map((column) => {
    const cells = Math.max(1, Math.round(column.cells))
    const panelsPerCassette = column.panelsPerCassette ?? 1
    if (cells % panelsPerCassette !== 0) {
      throw new Error(
        `Split-flap column "${column.id}" has ${cells} panels, which cannot fill ${panelsPerCassette}-panel cassettes`,
      )
    }
    const resolved = { ...column, cells, offset, panelsPerCassette }
    offset += cells
    return resolved
  })
  const rowCellCount = offset
  const cells = source.rows.flatMap((row, rowIndex) =>
    columns.flatMap((column) => {
      const value = splitFlapValue(row.values[column.id])
      const valueCharacters = splitFlapGraphemes(value.text)
      const characters = Array.from(
        { length: column.cells },
        (_, characterIndex) => valueCharacters[characterIndex] ?? ' ',
      )

      return characters.map((character, columnIndex) => {
        const index = rowIndex * rowCellCount + column.offset + columnIndex
        const flapSequence =
          column.cellSequences?.[columnIndex] ?? column.flapSequence ?? ('alphanumeric' as const)
        const flapDeck = resolveSplitFlapDeck(
          column.cellFlapDecks?.[columnIndex] ?? column.flapDeck,
          flapSequence,
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
            flapDeck.findIndex((position) => position.character === ' '),
          ),
          id,
          index,
          rowId: row.id,
          rowIndex,
          targetIndex: targetPositionIndex(flapDeck, character, value.tone, id),
          tone: value.tone,
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
          `${column.id}:${column.cells}:${column.panelsPerCassette}:${column.flapSequence ?? 'alphanumeric'}:${column.cellSequences?.join(',') ?? ''}:${splitFlapDeckKey(column.flapDeck)}:${column.cellFlapDecks?.map(splitFlapDeckKey).join(';') ?? ''}`,
      )
      .join('|')}::${source.rows.map((row) => row.id).join('|')}`,
    rowCellCount,
    rows: source.rows,
    targetIndices: cells.map((cell) => cell.targetIndex),
  }
}
