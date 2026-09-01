import { describe, expect, it } from 'vitest'

import {
  createSplitFlapDeck,
  resolveSplitFlapSource,
  splitFlapCharacters,
  splitFlapGraphemes,
  splitFlapNumericCharacters,
  splitFlapPunctuationCharacters,
  type SplitFlapColumn,
  type SplitFlapSource,
} from './split-flap.source'

function sourceFor(
  column: SplitFlapColumn,
  value: SplitFlapSource['rows'][number]['values'][string],
) {
  return {
    columns: [column],
    rows: [{ id: 'row', values: { value } }],
  }
}

describe('split-flap source resolution', () => {
  it.each([
    ['alphanumeric', splitFlapCharacters, 'A'],
    ['numeric', splitFlapNumericCharacters, '7'],
    ['punctuation', splitFlapPunctuationCharacters, ':'],
  ] as const)('uses the built-in %s sequence', (flapSequence, characters, value) => {
    const resolved = resolveSplitFlapSource(
      sourceFor({ id: 'value', label: 'Value', cells: 1, flapSequence }, value),
    )

    expect(resolved.cells[0].flapDeck.map((position) => position.character)).toEqual(characters)
    expect(resolved.cells[0].targetIndex).toBe(characters.indexOf(value))
  })

  it('normalizes custom decks and resolves custom tones', () => {
    const deck = createSplitFlapDeck(' ab', ['warmWhite', 'signalYellow'])
    const resolved = resolveSplitFlapSource(
      sourceFor(
        { id: 'value', label: 'Value', cells: 1, flapDeck: deck },
        { text: 'b', tone: 'signalYellow' },
      ),
    )

    expect(deck).toEqual([
      { character: ' ', tone: 'warmWhite' },
      { character: 'A', tone: 'warmWhite' },
      { character: 'B', tone: 'warmWhite' },
      { character: 'A', tone: 'signalYellow' },
      { character: 'B', tone: 'signalYellow' },
    ])
    expect(resolved.cells[0]).toMatchObject({
      character: 'b',
      tone: 'signalYellow',
      targetIndex: 4,
    })
  })

  it('uses the blank position for missing and unsupported target characters', () => {
    const deck = createSplitFlapDeck(' AB')
    const missing = resolveSplitFlapSource(
      sourceFor({ id: 'value', label: 'Value', cells: 1, flapDeck: deck }, ''),
    )
    const unsupported = resolveSplitFlapSource(
      sourceFor({ id: 'value', label: 'Value', cells: 1, flapDeck: deck }, '?'),
    )

    expect(missing.targetIndices).toEqual([0])
    expect(unsupported.targetIndices).toEqual([0])
  })

  it('supports custom Unicode grapheme decks and values', () => {
    const deck = createSplitFlapDeck([' ', '東', '京', 'が', '🛫'])
    const resolved = resolveSplitFlapSource(
      sourceFor({ id: 'value', label: 'Value', cells: 4, flapDeck: deck }, '東京が🛫'),
    )

    expect(splitFlapGraphemes('東京が🛫')).toEqual(['東', '京', 'が', '🛫'])
    expect(resolved.cells.map((cell) => cell.character)).toEqual(['東', '京', 'が', '🛫'])
    expect(resolved.targetIndices).toEqual([1, 2, 3, 4])
  })

  it('preserves Unicode graphemes whose uppercase form expands', () => {
    const deck = createSplitFlapDeck([' ', 'ß'])
    const resolved = resolveSplitFlapSource(
      sourceFor({ id: 'value', label: 'Value', cells: 1, flapDeck: deck }, 'ß'),
    )

    expect(deck).toEqual([
      { character: ' ', tone: 'warmWhite' },
      { character: 'ß', tone: 'warmWhite' },
    ])
    expect(resolved.targetIndices).toEqual([1])
  })

  it('throws when a custom deck cannot fall back to blank', () => {
    expect(() =>
      resolveSplitFlapSource(
        sourceFor(
          { id: 'value', label: 'Value', cells: 1, flapDeck: createSplitFlapDeck('AB') },
          'Z',
        ),
      ),
    ).toThrow('Split-flap deck for "row:value:0" has no blank fallback position')
  })

  it('selects decks and sequences per cell before column defaults', () => {
    const secondDeck = createSplitFlapDeck(' B')
    const resolved = resolveSplitFlapSource(
      sourceFor(
        {
          id: 'value',
          label: 'Value',
          cells: 2,
          flapSequence: 'numeric',
          cellSequences: ['punctuation'],
          cellFlapDecks: [undefined, secondDeck],
        },
        ':B',
      ),
    )

    expect(resolved.cells[0].flapSequence).toBe('punctuation')
    expect(resolved.cells[0].flapDeck.map(({ character }) => character)).toEqual(
      splitFlapPunctuationCharacters,
    )
    expect(resolved.cells[1].flapSequence).toBe('numeric')
    expect(resolved.cells[1].flapDeck).toEqual(secondDeck)
    expect(resolved.targetIndices).toEqual([1, 1])
  })

  it('resolves one- and two-panel cassette structures', () => {
    const single = resolveSplitFlapSource(
      sourceFor({ id: 'value', label: 'Value', cells: 2 }, 'AB'),
    )
    const double = resolveSplitFlapSource(
      sourceFor({ id: 'value', label: 'Value', cells: 2, panelsPerCassette: 2 }, 'AB'),
    )

    expect(single.columns[0].panelsPerCassette).toBe(1)
    expect(double.columns[0].panelsPerCassette).toBe(2)
    expect(double.layoutKey).not.toBe(single.layoutKey)
  })

  it('rejects incomplete two-panel cassettes', () => {
    expect(() =>
      resolveSplitFlapSource(
        sourceFor({ id: 'value', label: 'Value', cells: 3, panelsPerCassette: 2 }, 'ABC'),
      ),
    ).toThrow('cannot fill 2-panel cassettes')
  })

  it.each([
    [
      'column',
      {
        columns: [
          { id: 'duplicate', label: 'First', cells: 1 },
          { id: 'duplicate', label: 'Second', cells: 1 },
        ],
        rows: [{ id: 'row', values: { duplicate: 'A' } }],
      },
    ],
    [
      'row',
      {
        columns: [{ id: 'value', label: 'Value', cells: 1 }],
        rows: [
          { id: 'duplicate', values: { value: 'A' } },
          { id: 'duplicate', values: { value: 'B' } },
        ],
      },
    ],
  ] satisfies readonly [string, SplitFlapSource][])('rejects duplicate %s ids', (kind, source) => {
    expect(() => resolveSplitFlapSource(source)).toThrow(`duplicate ${kind} id "duplicate"`)
  })

  it('keeps structural identity stable when only values change', () => {
    const columns = [{ id: 'value', label: 'Value', cells: 2 }] as const
    const first = resolveSplitFlapSource({
      columns,
      rows: [{ id: 'row', values: { value: 'AB' } }],
    })
    const second = resolveSplitFlapSource({
      columns,
      rows: [{ id: 'row', values: { value: 'CD' } }],
    })

    expect(second.layoutKey).toBe(first.layoutKey)
    expect(second.cells.map(({ id, index }) => ({ id, index }))).toEqual(
      first.cells.map(({ id, index }) => ({ id, index })),
    )
    expect([...second.cellIndexById]).toEqual([...first.cellIndexById])
  })

  it('updates targets while preserving the resolved layout', () => {
    const columns = [{ id: 'value', label: 'Value', cells: 2 }] as const
    const first = resolveSplitFlapSource({
      columns,
      rows: [{ id: 'row', values: { value: 'A1' } }],
    })
    const second = resolveSplitFlapSource({
      columns,
      rows: [{ id: 'row', values: { value: 'Z9' } }],
    })

    expect(first.targetIndices).toEqual([
      splitFlapCharacters.indexOf('A'),
      splitFlapCharacters.indexOf('1'),
    ])
    expect(second.targetIndices).toEqual([
      splitFlapCharacters.indexOf('Z'),
      splitFlapCharacters.indexOf('9'),
    ])
    expect(second.layoutKey).toBe(first.layoutKey)
  })
})
