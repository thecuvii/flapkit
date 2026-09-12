import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  Board,
  Cell,
  Face,
  Glyph,
  Grid,
  Group,
  Header,
  Retainer,
  Row,
  WideCell,
} from './components'
import { compileFlapkitBoard } from './compiler'
import { alphanumericDeck, createDeck, numericDeck, punctuationDeck, type Deck } from './deck'
import { resolveSplitFlapSource } from './layout'

const wideDeck = createDeck(['  ', '14', '55'])
const variantDeck = createDeck(' 45', ['white', 'yellow', 'orange'])

describe('Flapkit structural compiler', () => {
  it('keeps part styling out of motion identity and fills undeclared parts', () => {
    const plain = compileFlapkitBoard(
      <Board>
        <Row>
          <Cell>A</Cell>
        </Row>
      </Board>,
    )
    const composed = compileFlapkitBoard(
      <Board>
        <Row>
          <Cell className="w-6 h-12">
            <Retainer style={{ backgroundColor: 'black' }} />
            <Glyph className="text-lime-300">A</Glyph>
            <Face className="bg-purple-600" />
          </Cell>
        </Row>
      </Board>,
    )
    expect(composed.sourceSignature).toBe(plain.sourceSignature)
    expect(composed.presentationSignature).not.toBe(plain.presentationSignature)
    expect(composed.presentation.rows[0].groups[0].cells[0]).toMatchObject({
      className: 'w-6 h-12',
      face: { className: 'bg-purple-600' },
      glyph: { className: 'text-lime-300' },
      retainer: { style: { backgroundColor: 'black' } },
    })
    const blank = compileFlapkitBoard(
      <Board>
        <Row>
          <Cell>
            <Face />
          </Cell>
        </Row>
      </Board>,
    )
    expect(blank.source.rows[0].values['group-0']).toEqual({ text: ' ', cassettes: [' '] })
    expect(blank.presentation.rows[0].groups[0].cells[0].glyph).toBeUndefined()
  })

  it('validates duplicate parts and the declared glyph grapheme count', () => {
    expect(() =>
      compileFlapkitBoard(
        <Board>
          <Row>
            <Cell>
              <Face />
              <Face />
            </Cell>
          </Row>
        </Board>,
      ),
    ).toThrow('at most one face')
    expect(() =>
      compileFlapkitBoard(
        <Board>
          <Row>
            <Cell>
              <Glyph>AB</Glyph>
            </Cell>
          </Row>
        </Board>,
      ),
    ).toThrow('requires 1 grapheme')
    const wide = compileFlapkitBoard(
      <Board>
        <Row deck={wideDeck}>
          <WideCell>
            <Glyph>55</Glyph>
          </WideCell>
        </Row>
      </Board>,
    )
    expect(resolveSplitFlapSource(wide.source).cells[0].character).toBe('55')
  })

  it('compiles adjacent groups, variants, and wide cells into the source model', () => {
    const result = compileFlapkitBoard(
      <Board aria-label="Numbers">
        <Header>Numbers</Header>
        <Row id="first">
          <Group deck={wideDeck} label="PAIR">
            <WideCell>55</WideCell>
          </Group>
          <Group deck={variantDeck} label="SINGLE" variant="yellow">
            <Cell>5</Cell>
          </Group>
        </Row>
        <Row highlighted id="second">
          <Group deck={wideDeck} label="PAIR">
            <WideCell>14</WideCell>
          </Group>
          <Group deck={variantDeck} label="SINGLE" variant="yellow">
            <Cell>4</Cell>
          </Group>
        </Row>
      </Board>,
    )

    expect(result.header).toEqual(
      <div className={undefined} style={undefined}>
        Numbers
      </div>,
    )
    expect(result.source.columns).toMatchObject([
      { id: 'group-0', label: 'PAIR', cells: 1, cassetteSpan: 2 },
      { id: 'group-1', label: 'SINGLE', cells: 1, cassetteSpan: 1 },
    ])
    expect(result.source.rows).toEqual([
      {
        highlighted: undefined,
        id: 'first',
        values: {
          'group-0': { cassettes: ['55'], text: '55' },
          'group-1': { cassettes: ['5'], text: '5', variant: 'yellow' },
        },
      },
      {
        highlighted: true,
        id: 'second',
        values: {
          'group-0': { cassettes: ['14'], text: '14' },
          'group-1': { cassettes: ['4'], text: '4', variant: 'yellow' },
        },
      },
    ])
  })

  it('treats a flat row as one group and accepts numeric cell content', () => {
    const result = compileFlapkitBoard(
      <Board className="p-4 gap-y-2" showColumnLabels={false}>
        <Row label="CODE" deck={alphanumericDeck}>
          <Cell>A</Cell>
          <Cell>B</Cell>
          <Cell>{4}</Cell>
        </Row>
      </Board>,
    )
    const source = {
      columns: [
        {
          id: 'group-0',
          label: 'CODE',
          cells: 3,
          cassetteSpan: 1 as const,
          flapDeck: alphanumericDeck,
        },
      ],
      rows: [
        {
          id: 'row-0',
          values: { 'group-0': { cassettes: ['A', 'B', '4'], text: 'AB4' } },
        },
      ],
    }

    expect(result.boardProps).toEqual({
      className: 'p-4 gap-y-2',
      showColumnLabels: false,
    })
    expect(result.source).toEqual(source)
    expect(resolveSplitFlapSource(result.source)).toEqual(resolveSplitFlapSource(source))
  })

  it('preserves empty and Unicode cell boundaries through source resolution', () => {
    const combiningDeck = createDeck([' ', 'A', '\u0301', 'B'])
    const result = compileFlapkitBoard(
      <Board>
        <Row deck={combiningDeck}>
          <Cell>A</Cell>
          <Cell>{''}</Cell>
          <Cell>{'\u0301'}</Cell>
          <Cell>B</Cell>
        </Row>
      </Board>,
    )

    expect(resolveSplitFlapSource(result.source).cells.map((cell) => cell.character)).toEqual([
      'A',
      ' ',
      '\u0301',
      'B',
    ])
  })

  it('compiles a frameless grid through the same component model', () => {
    const result = compileFlapkitBoard(
      <Grid aria-label="Status">
        <Row>
          <Cell>A</Cell>
        </Row>
      </Grid>,
    )

    expect(result.frame).toBe(false)
    expect(result.boardProps).toEqual({ 'aria-label': 'Status' })
    expect(result.header).toBeUndefined()
  })

  it('explains that local async boundaries cannot expose partial declarations', () => {
    expect(() => compileFlapkitBoard(<Board>{null}</Board>)).toThrow(
      'place Suspense or Activity around the whole Flapkit.Root instead',
    )
  })

  it('applies a variant and deck directly from a flat row', () => {
    const result = compileFlapkitBoard(
      <Board>
        <Row deck={variantDeck} label="COUNT" variant="orange">
          <Cell>{4}</Cell>
        </Row>
      </Board>,
    )

    expect(result.source.rows[0]?.values).toEqual({
      'group-0': { cassettes: ['4'], text: '4', variant: 'orange' },
    })
    expect(() => resolveSplitFlapSource(result.source)).not.toThrow()
  })

  it.each(['row', 'group'])('inherits the %s deck and permits a cell override', (owner) => {
    const compile = (deck: Deck) => {
      const cells = (
        <>
          <Cell>7</Cell>
          <Cell deck={deck}>:</Cell>
        </>
      )
      return compileFlapkitBoard(
        <Board>
          {owner === 'row' ? (
            <Row deck={numericDeck}>{cells}</Row>
          ) : (
            <Row>
              <Group deck={numericDeck}>{cells}</Group>
            </Row>
          )}
        </Board>,
      )
    }
    const first = compile(punctuationDeck)
    const second = compile(alphanumericDeck)
    const firstLayout = resolveSplitFlapSource(first.source)
    const secondLayout = resolveSplitFlapSource(second.source)
    expect(firstLayout.targetIndices).toEqual([8, 1])
    expect(secondLayout.targetIndices).toEqual([8, 40])
    expect(second.sourceSignature).not.toBe(first.sourceSignature)
    expect(secondLayout.layoutKey).not.toBe(firstLayout.layoutKey)
  })

  it('keeps presentation class names out of source identity', () => {
    const compile = (className: string) =>
      compileFlapkitBoard(
        <Board>
          <Row className={`row-${className}`}>
            <Group className={`group-${className}`}>
              <Cell className={`cell-${className}`}>A</Cell>
            </Group>
          </Row>
        </Board>,
      )
    const first = compile('first')
    const second = compile('second')

    expect(second.source).toEqual(first.source)
    expect(second.sourceSignature).toBe(first.sourceSignature)
    expect(second.presentation).not.toEqual(first.presentation)
    expect(resolveSplitFlapSource(second.source).layoutKey).toBe(
      resolveSplitFlapSource(first.source).layoutKey,
    )
  })

  it('requires a custom deck for a wide cell', () => {
    expect(() =>
      compileFlapkitBoard(
        <Board>
          <Row>
            <WideCell>55</WideCell>
          </Row>
        </Board>,
      ),
    ).toThrow('requires a custom two-grapheme deck')
  })

  it('rejects group-level props on a row that contains explicit groups', () => {
    expect(() =>
      compileFlapkitBoard(
        <Board>
          <Row label="Ignored">
            <Group>
              <Cell>A</Cell>
            </Group>
          </Row>
        </Board>,
      ),
    ).toThrow('cannot set label, variant, or deck when it contains Groups')
  })

  it('rejects arbitrary elements inside a row', () => {
    expect(() =>
      compileFlapkitBoard(
        <Board>
          <Row>
            <Cell>A</Cell>
            <div>B</div>
          </Row>
        </Board>,
      ),
    ).toThrow('only accepts Flapkit.Cell or Flapkit.WideCell')
  })

  it('rejects rows with different physical structures', () => {
    expect(() =>
      compileFlapkitBoard(
        <Board>
          <Row>
            <Cell>A</Cell>
            <Cell>B</Cell>
          </Row>
          <Row deck={wideDeck}>
            <WideCell>55</WideCell>
          </Row>
        </Board>,
      ),
    ).toThrow('same Group, Cell, and WideCell structure')
  })

  it('rejects an unmarked stand-in that looks like a Cell', () => {
    function FakeCell({ children }: { children?: ReactNode }) {
      return createElement('span', null, children)
    }

    expect(() =>
      compileFlapkitBoard(
        <Board>
          <Row>{createElement(FakeCell, null, 'A')}</Row>
        </Board>,
      ),
    ).toThrow('only accepts Flapkit.Cell or Flapkit.WideCell')
  })

  it('keeps layout identity when only cell values change', () => {
    const compile = (character: string) =>
      compileFlapkitBoard(
        <Board>
          <Row id="flight">
            <Cell>{character}</Cell>
          </Row>
        </Board>,
      )
    const first = resolveSplitFlapSource(compile('A').source)
    const second = resolveSplitFlapSource(compile('B').source)

    expect(second.layoutKey).toBe(first.layoutKey)
    expect(second.cells.map((cell) => cell.id)).toEqual(first.cells.map((cell) => cell.id))
    expect(second.targetIndices).not.toEqual(first.targetIndices)
  })

  it('keeps cell ids when stable row ids change order', () => {
    const compile = (order: readonly string[]) =>
      compileFlapkitBoard(
        <Board>
          {order.map((id) => (
            <Row id={id} key={id}>
              <Cell>{id === 'first' ? 'A' : 'B'}</Cell>
            </Row>
          ))}
        </Board>,
      )
    const first = resolveSplitFlapSource(compile(['first', 'second']).source)
    const second = resolveSplitFlapSource(compile(['second', 'first']).source)

    expect(second.cells.map((cell) => cell.id).sort()).toEqual(
      first.cells.map((cell) => cell.id).sort(),
    )
    expect(second.cellIndexById.get('first:group-0:0')).toBeDefined()
    expect(second.cellIndexById.get('second:group-0:0')).toBeDefined()
  })
})
