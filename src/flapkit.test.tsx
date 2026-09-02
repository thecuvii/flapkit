import { describe, expect, it } from 'vitest'
import { createSplitFlapDeck, resolveSplitFlapSource } from './split-flap.source'
import { Board, Cell, compileFlapkitBoard, Field, Header, Row, WideCell } from './flapkit.structure'

const wideDeck = createSplitFlapDeck(['  ', '14', '55'])

describe('Flapkit structural compiler', () => {
  it('compiles rows of single and wide cells into the existing source model', () => {
    const result = compileFlapkitBoard(
      <Board aria-label="Numbers">
        <Header>Numbers</Header>
        <Row>
          <Field label="PAIR">
            <WideCell flapDeck={wideDeck}>55</WideCell>
          </Field>
          <Field label="SINGLE">
            <Cell tone="signalYellow">5</Cell>
          </Field>
        </Row>
        <Row highlighted>
          <Field label="PAIR">
            <WideCell flapDeck={wideDeck}>14</WideCell>
          </Field>
          <Field label="SINGLE">
            <Cell tone="signalYellow">4</Cell>
          </Field>
        </Row>
      </Board>,
    )

    expect(result.header).toBe('Numbers')
    expect(result.source.columns).toMatchObject([
      { id: 'field-0', label: 'PAIR', cells: 1, cassetteSpan: 2 },
      { id: 'field-1', label: 'SINGLE', cells: 1, cassetteSpan: 1 },
    ])
    expect(result.source.rows).toEqual([
      {
        highlighted: undefined,
        id: 'row-0',
        values: { 'field-0': '55', 'field-1': { text: '5', tone: 'signalYellow' } },
      },
      {
        highlighted: true,
        id: 'row-1',
        values: { 'field-0': '14', 'field-1': { text: '4', tone: 'signalYellow' } },
      },
    ])
  })

  it('preserves the existing renderer and motion inputs for single-width cassettes', () => {
    const result = compileFlapkitBoard(
      <Board columnGap={0.12} fieldGap={1.2} rowGap={0.6} showColumnLabels={false}>
        <Row>
          <Cell>A</Cell>
          <Cell>B</Cell>
          <Cell>4</Cell>
        </Row>
      </Board>,
    )
    const legacySource = {
      columns: [{ id: 'field-0', label: '', cells: 3, cassetteSpan: 1 as const }],
      rows: [{ id: 'row-0', values: { 'field-0': 'AB4' } }],
    }

    expect(result.boardProps).toEqual({
      columnGap: 0.12,
      fieldGap: 1.2,
      rowGap: 0.6,
      showColumnLabels: false,
    })
    expect(result.source).toEqual(legacySource)
    expect(resolveSplitFlapSource(result.source)).toEqual(resolveSplitFlapSource(legacySource))
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
          <Row>
            <WideCell flapDeck={wideDeck}>55</WideCell>
          </Row>
        </Board>,
      ),
    ).toThrow('same Field, Cell, and WideCell structure')
  })
})
