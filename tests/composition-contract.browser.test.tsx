import { act, createContext, useContext, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import { Board, Cell, Face, Glyph, Header, Retainer, Root, Row, cascade, createDeck } from '../src'
import '../src/styles/flapkit.css'
import '../src/styles/industrial.css'

const content = createContext('A')
const deck = createDeck(' AB')

it.each(['css', 'canvas'] as const)(
  'composes hook-using cells and native styles with the %s renderer',
  async (renderer) => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    let mounts = 0
    let unmounts = 0
    let toggle = () => {}

    function CustomCell() {
      const value = useContext(content)
      const [suffix, setSuffix] = useState(false)
      toggle = () => setSuffix((previous) => !previous)
      useEffect(() => {
        mounts++
        return () => {
          unmounts++
        }
      }, [])
      return (
        <Cell className="contract-cell">
          <Face className="contract-face" />
          <Glyph className="contract-glyph">{suffix ? 'B' : value}</Glyph>
          <Retainer className="contract-retainer" />
        </Cell>
      )
    }

    async function render(value: string, large = false) {
      await act(() =>
        root.render(
          <content.Provider value={value}>
            <style>{`
            .contract-board { padding: 13px 19px; background: #512c86; }
            .contract-header { color: rgb(182, 255, 54); }
            .contract-row { gap: 7px; }
            .contract-cell { width: ${large ? 34 : 26}px; height: ${large ? 70 : 58}px; }
            .contract-face { background: rgb(120, 70, 187); }
            .contract-glyph { color: rgb(182, 255, 54); }
            .contract-retainer { background: rgb(23, 16, 32); }
          `}</style>
            <Root motion={cascade({ renderer, pitchMs: 20, withinRowJitterMs: 0 })}>
              <Board className="flapkit-industrial contract-board">
                <Header className="contract-header">CUSTOM</Header>
                <Row deck={deck} className="contract-row">
                  <CustomCell />
                  <Cell className="contract-cell">A</Cell>
                </Row>
              </Board>
            </Root>
          </content.Provider>,
        ),
      )
      await act(async () => {
        for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame)
      })
    }

    try {
      await render('A')
      expect(mounts).toBe(1)
      const cells = host.querySelectorAll<HTMLElement>('[data-slot="cassette"]')
      expect(cells.length).toBe(2)
      expect(cells[0].getBoundingClientRect().width).toBeCloseTo(26, 0)
      expect(cells[0].getBoundingClientRect().height).toBeCloseTo(58, 0)
      expect(
        cells[1].getBoundingClientRect().left - cells[0].getBoundingClientRect().right,
      ).toBeCloseTo(7, 0)
      expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('AA')
      expect(getComputedStyle(host.querySelector('.contract-board')!).paddingLeft).toBe('19px')
      expect(getComputedStyle(host.querySelector('.contract-header')!).color).toBe(
        'rgb(182, 255, 54)',
      )
      expect(host.querySelectorAll('.contract-face').length).toBeGreaterThan(0)
      expect(host.querySelectorAll('.contract-glyph').length).toBeGreaterThan(0)
      expect(host.querySelectorAll('.contract-retainer').length).toBeGreaterThan(0)
      expect(getComputedStyle(host.querySelector('.contract-face')!).backgroundColor).toBe(
        'rgb(120, 70, 187)',
      )
      expect(getComputedStyle(host.querySelector('.contract-glyph')!).color).toBe(
        'rgb(182, 255, 54)',
      )

      await act(() => toggle())
      await expect
        .poll(() => host.querySelector('[aria-live="polite"]')?.textContent)
        .toContain('BA')
      await act(() => toggle())
      await expect
        .poll(() => host.querySelector('[aria-live="polite"]')?.textContent)
        .toContain('AA')
      await render('B', true)
      expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('BA')
      expect(mounts).toBe(1)
      expect(unmounts).toBe(0)
      await expect
        .poll(() => host.querySelector('[data-slot="cassette"]')!.getBoundingClientRect().width)
        .toBeCloseTo(34, 0)
      expect(
        host.querySelector('[data-slot="cassette"]')!.getBoundingClientRect().height,
      ).toBeCloseTo(70, 0)
    } finally {
      await act(() => root.unmount())
      host.remove()
    }
    expect(unmounts).toBe(1)
  },
)
