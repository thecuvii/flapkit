import { describe, expect, it } from 'vitest'
import { createDeck } from './deck'
import { resolveSplitFlapSource } from './layout'
import { Board, Cell, Grid, Group, Header, Row, WideCell } from './components'
import { compileFlapkitBoard } from './compiler'

const wideDeck = createDeck(['  ', '14', '55'])
const variantDeck = createDeck(' 45', ['white', 'yellow', 'orange'])

describe('Flapkit structural compiler', () => {
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

    expect(result.header).toBe('Numbers')
    expect(result.source.columns).toMatchObject([
      { id: 'group-0', label: 'PAIR', cells: 1, cassetteSpan: 2 },
      { id: 'group-1', label: 'SINGLE', cells: 1, cassetteSpan: 1 },
    ])
    expect(result.source.rows).toEqual([
      {
        highlighted: undefined,
        id: 'first',
        values: { 'group-0': '55', 'group-1': { text: '5', variant: 'yellow' } },
      },
      {
        highlighted: true,
        id: 'second',
        values: { 'group-0': '14', 'group-1': { text: '4', variant: 'yellow' } },
      },
    ])
  })

  it('treats a flat row as one group and accepts numeric cell content', () => {
    const result = compileFlapkitBoard(
      <Board columnGap={0.12} groupGap={1.2} rowGap={0.6} showColumnLabels={false}>
        <Row label="CODE" sequence="alphanumeric">
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
          flapSequence: 'alphanumeric' as const,
        },
      ],
      rows: [{ id: 'row-0', values: { 'group-0': 'AB4' } }],
    }

    expect(result.boardProps).toEqual({
      columnGap: 0.12,
      groupGap: 1.2,
      rowGap: 0.6,
      showColumnLabels: false,
    })
    expect(result.source).toEqual(source)
    expect(resolveSplitFlapSource(result.source)).toEqual(resolveSplitFlapSource(source))
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

  it('applies a variant and deck directly from a flat row', () => {
    const result = compileFlapkitBoard(
      <Board>
        <Row deck={variantDeck} label="COUNT" variant="orange">
          <Cell>{4}</Cell>
        </Row>
      </Board>,
    )

    expect(result.source.rows[0]?.values).toEqual({
      'group-0': { text: '4', variant: 'orange' },
    })
    expect(() => resolveSplitFlapSource(result.source)).not.toThrow()
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
    ).toThrow('cannot set label, variant, deck, or sequence when it contains Groups')
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
})
