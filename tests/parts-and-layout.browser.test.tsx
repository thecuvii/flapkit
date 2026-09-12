import {
  Activity,
  act,
  createContext,
  memo,
  StrictMode,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import { Board, Cell, Face, Glyph, Group, Header, Retainer, Root, Row, createDeck } from 'flapkit'
import { cascade } from 'flapkit/motion/canvas/cascade'
import { cascade as cssCascade } from 'flapkit/motion/css/cascade'
import { useSplitFlapController } from '../src/motion/provider'
import type { SplitFlapMotionController } from '../src/motion/runtime'
import '../src/styles/flapkit.css'
import '../src/styles/industrial.css'

const deck = createDeck(' AB')
const Palette = createContext('rgb(182, 255, 54)')

it.each(['css', 'canvas'] as const)(
  'composes hook-using cells and native geometry in %s',
  async (renderer) => {
    const createMotion = renderer === 'css' ? cssCascade : cascade
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    let update: (value: boolean) => void = () => {}
    let mounts = 0
    let controller: SplitFlapMotionController | undefined
    function Probe() {
      const value = useSplitFlapController()
      useEffect(() => {
        controller = value
      }, [value])
      return null
    }
    function EvaCell() {
      const color = useContext(Palette)
      const [changed, setChanged] = useState(false)
      useEffect(() => {
        mounts++
        update = setChanged
      }, [])
      return (
        <Cell className={changed ? 'cell-large' : 'cell-small'}>
          <Retainer className="retainer-black" />
          <Glyph className="glyph-font" style={{ color }}>
            {changed ? 'B' : 'A'}
          </Glyph>
          <Face className="face-purple" />
        </Cell>
      )
    }
    const frame = () => new Promise(requestAnimationFrame)
    const settle = async () => {
      for (let i = 0; i < 4; i++) await frame()
    }
    try {
      await act(async () => {
        root.render(
          <StrictMode>
            <style>{`
          .native-board { padding: 11px 17px; row-gap: 9px; }
          .native-row { gap: 13px; }
          .native-group { gap: 7px; }
          .cell-small { width: 24px; height: 48px; }
          .cell-large { width: 31px; height: 52px; }
          .face-purple { background-color: rgb(120, 70, 187); background-image: none; }
          .glyph-font { font: bold 22px monospace; }
          .retainer-black { background-color: rgb(10, 10, 10); background-image: none; }
          .header-lime { color: rgb(182, 255, 54); }
        `}</style>
            <Palette value="rgb(182, 255, 54)">
              <Root
                motion={createMotion({
                  pitchMs: 20,
                  finalSettleMs: 20,
                  rowDelayMs: 0,
                  withinRowJitterMs: 0,
                })}
                sound={<Probe />}
              >
                <Board data-look="industrial" className="native-board">
                  <Header className="header-lime">API</Header>
                  <Row className="native-row">
                    <Group className="native-group" deck={deck} label="ONE">
                      <EvaCell />
                      <Cell>B</Cell>
                    </Group>
                    <Group deck={deck} label="TWO">
                      <Cell>A</Cell>
                    </Group>
                  </Row>
                </Board>
              </Root>
            </Palette>
          </StrictMode>,
        )
        await settle()
      })
      const board = host.querySelector<HTMLElement>('[data-slot="split-flap-board"]')!
      const cells = Array.from(host.querySelectorAll<HTMLElement>('[data-slot="cassette"]'))
      const groups = Array.from(host.querySelectorAll<HTMLElement>('[data-slot="group"]'))
      const initialMounts = mounts
      const initialController = controller
      expect(getComputedStyle(board).padding).toBe('11px 17px')
      expect(cells[0].getBoundingClientRect().width).toBe(24)
      expect(cells[0].getBoundingClientRect().height).toBe(48)
      expect(
        cells[1].getBoundingClientRect().left - cells[0].getBoundingClientRect().right,
      ).toBeCloseTo(7, 1)
      expect(
        groups[1].getBoundingClientRect().left - groups[0].getBoundingClientRect().right,
      ).toBeCloseTo(13, 1)
      const labels = host.querySelectorAll<HTMLElement>('.flapkit-board-column-label')
      expect(labels[1].getBoundingClientRect().left).toBeCloseTo(
        groups[1].getBoundingClientRect().left,
        1,
      )
      for (const face of cells[0].querySelectorAll('.face-purple'))
        expect(getComputedStyle(face).backgroundColor).toBe('rgb(120, 70, 187)')
      expect(cells[0].querySelectorAll('.face-purple')).toHaveLength(4)
      for (const retainer of cells[0].querySelectorAll('.retainer-black'))
        expect(getComputedStyle(retainer).backgroundColor).toBe('rgb(10, 10, 10)')
      expect(cells[0].querySelectorAll('.retainer-black')).toHaveLength(2)
      const glyphs = cells[0].querySelectorAll('.glyph-font')
      expect(glyphs).toHaveLength(4)
      expect(getComputedStyle(glyphs[0], renderer === 'canvas' ? '::before' : null).color).toBe(
        'rgb(182, 255, 54)',
      )
      const upper = cells[0].querySelector<HTMLElement>(
        renderer === 'canvas'
          ? '[data-slot="stationary-upper"]'
          : '.flapkit-arriving-upper [data-part="glyph"]',
      )!
      const lower = cells[0].querySelector<HTMLElement>(
        renderer === 'canvas'
          ? '[data-slot="stationary-lower"]'
          : '.flapkit-outgoing-lower [data-part="glyph"]',
      )!
      const glyphTop = (element: HTMLElement) =>
        element.getBoundingClientRect().top +
        (renderer === 'canvas'
          ? parseFloat(
              getComputedStyle(element.querySelector('[data-slot="glyph"]')!, '::before').top,
            )
          : 0)
      expect(glyphTop(upper)).toBeCloseTo(glyphTop(lower), 1)
      await act(async () => {
        update(true)
        await settle()
      })
      expect(mounts).toBe(initialMounts)
      expect(controller).toBe(initialController)
      expect(host.querySelector('[data-slot="cassette"]')).toBe(cells[0])
      expect(cells[0].getBoundingClientRect().width).toBe(31)
      expect(cells[0].getBoundingClientRect().height).toBe(52)
      expect(host.querySelector('[aria-live]')?.textContent).toBe('ONE BB TWO A')
      expect(glyphTop(upper)).toBeCloseTo(glyphTop(lower), 1)
      expect(host.querySelectorAll('canvas').length).toBe(renderer === 'canvas' ? 2 : 0)
    } finally {
      await act(() => root.unmount())
      host.remove()
    }
  },
)

it('tracks memoized wrapper order and Activity re-entry without losing hook state', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const Wrapped = memo(function Wrapped({ value }: { value: string }) {
    const [text] = useState(value)
    return <Cell>{text}</Cell>
  })
  const render = async (values: string[], visible = true) =>
    act(async () => {
      root.render(
        <Activity mode={visible ? 'visible' : 'hidden'}>
          <Root motion={cascade()}>
            <Board data-look="industrial">
              <Row>
                {values.map((value) => (
                  <Wrapped key={value} value={value} />
                ))}
              </Row>
            </Board>
          </Root>
        </Activity>,
      )
      await Promise.resolve()
    })
  try {
    await render(['A', 'B'])
    expect(host.querySelector('[aria-live]')?.textContent).toBe('AB')
    await render(['B', 'A'])
    expect(host.querySelector('[aria-live]')?.textContent).toBe('BA')
    await render(['B', 'A'], false)
    await render(['B', 'A'])
    expect(host.querySelector('[aria-live]')?.textContent).toBe('BA')
  } finally {
    await act(() => root.unmount())
    host.remove()
  }
})

it('resets runtime identity when explicit row and group IDs reorder', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let controller: SplitFlapMotionController | undefined
  let wrapperMounts = 0

  function Probe() {
    const value = useSplitFlapController()
    useEffect(() => {
      controller = value
    }, [value])
    return null
  }

  function Wrapper({ children }: { children: ReactNode }) {
    const [identity] = useState(() => ++wrapperMounts)
    return <div data-wrapper-identity={identity}>{children}</div>
  }

  const render = async (reordered: boolean) => {
    const rows = reordered
      ? [
          { id: 'south', values: ['B', 'A'] },
          { id: 'north', values: ['A', 'B'] },
        ]
      : [
          { id: 'north', values: ['A', 'B'] },
          { id: 'south', values: ['B', 'A'] },
        ]
    const groups = reordered
      ? [
          { id: 'right', label: 'RIGHT', index: 1 },
          { id: 'left', label: 'LEFT', index: 0 },
        ]
      : [
          { id: 'left', label: 'LEFT', index: 0 },
          { id: 'right', label: 'RIGHT', index: 1 },
        ]
    await act(async () => {
      root.render(
        <Wrapper>
          <Root motion={cascade({ pitchMs: 1, finalSettleMs: 1 })} sound={<Probe />}>
            <Board data-look="industrial">
              {rows.map((row) => (
                <Row id={row.id} key={row.id}>
                  {groups.map((group) => (
                    <Group id={group.id} label={group.label} deck={deck} key={group.id}>
                      <Cell>{row.values[group.index]}</Cell>
                    </Group>
                  ))}
                </Row>
              ))}
            </Board>
          </Root>
        </Wrapper>,
      )
      await Promise.resolve()
      for (let index = 0; index < 4; index++) await new Promise(requestAnimationFrame)
    })
  }

  try {
    await render(false)
    const initialController = controller
    const initialCassette = host.querySelector('[data-slot="cassette"]')
    const wrapper = host.querySelector('[data-wrapper-identity]')

    await render(true)

    expect(controller).not.toBe(initialController)
    expect(host.querySelector('[data-slot="cassette"]')).not.toBe(initialCassette)
    expect(host.querySelector('[data-wrapper-identity]')).toBe(wrapper)
    expect(
      host.querySelector('[data-wrapper-identity]')?.getAttribute('data-wrapper-identity'),
    ).toBe('1')
    expect(host.querySelector('[aria-live]')?.textContent).toBe('RIGHT A LEFT B. RIGHT B LEFT A')
    await expect
      .poll(() =>
        Array.from(host.querySelectorAll('[data-slot="stationary-upper"] [data-slot="glyph"]'))
          .map((glyph) => glyph.getAttribute('data-glyph'))
          .join(''),
      )
      .toBe('ABBA')
  } finally {
    await act(async () => root.unmount())
    host.remove()
  }
})
