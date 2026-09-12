import {
  Activity,
  act,
  Component,
  createContext,
  StrictMode,
  Suspense,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { createRoot, type Root as ReactRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Board, Cell, Header, Root, Row, createDeck } from 'flapkit'
import { cascade } from 'flapkit/motion/css/cascade'

const deck = createDeck(' AB')
const motion = cascade({ pitchMs: 0, finalSettleMs: 0, rowDelayMs: 0 })
const HeaderContext = createContext('outside')
let host: HTMLDivElement
let root: ReactRoot
const caughtError = vi.fn()

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  caughtError.mockClear()
  root = createRoot(host, { onCaughtError: caughtError })
})

afterEach(async () => {
  await act(() => root.unmount())
  host.remove()
})

function Display({ header }: { header: ReactNode }) {
  return (
    <Root motion={motion}>
      <HeaderContext value="inside">
        <Board>
          {header}
          <Row deck={deck}>
            <Cell>A</Cell>
          </Row>
        </Board>
      </HeaderContext>
    </Root>
  )
}

function ContextHeader() {
  return <span data-testid="context-header">{useContext(HeaderContext)}</span>
}

function StatefulHeader() {
  const [count, setCount] = useState(0)
  return (
    <button data-testid="stateful-header" onClick={() => setCount((value) => value + 1)}>
      {count}
    </button>
  )
}

class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    return this.state.error ? <span data-testid="caught">caught</span> : this.props.children
  }
}

function BrokenHeader(): never {
  throw new Error('header failed')
}

it('keeps header context, keyed state, and local boundaries in the declaration tree', async () => {
  const render = (key: string, broken = false) =>
    act(async () => {
      root.render(
        <StrictMode>
          <Display
            header={
              <Header key={key}>
                <Boundary>{broken ? <BrokenHeader /> : <ContextHeader />}</Boundary>
                <StatefulHeader />
              </Header>
            }
          />
        </StrictMode>,
      )
      await Promise.resolve()
    })

  await render('first')
  expect(host.querySelector('[data-testid="context-header"]')?.textContent).toBe('inside')
  expect(host.querySelectorAll('[data-testid="context-header"]')).toHaveLength(1)
  const button = host.querySelector<HTMLButtonElement>('[data-testid="stateful-header"]')!
  await act(() => button.click())
  expect(button.textContent).toBe('1')

  await render('first')
  expect(host.querySelector('[data-testid="stateful-header"]')?.textContent).toBe('1')
  await render('second')
  expect(host.querySelector('[data-testid="stateful-header"]')?.textContent).toBe('0')
  await render('second', true)
  expect(host.querySelector('[data-testid="caught"]')?.textContent).toBe('caught')
  expect(host.querySelectorAll('[data-testid="caught"]')).toHaveLength(1)
  expect(caughtError).toHaveBeenCalledTimes(1)
  expect(caughtError.mock.calls[0][0]).toEqual(new Error('header failed'))
})

function Pending(): never {
  throw pending
}

let resolvePending: () => void
let pending: Promise<void>

function resetPending() {
  pending = new Promise<void>((resolve) => {
    resolvePending = resolve
  })
}

it('supports whole-Root Suspense retry and Activity hide/re-entry without duplicates', async () => {
  resetPending()
  const tree = (ready: boolean, visible = true) => (
    <Activity mode={visible ? 'visible' : 'hidden'}>
      <Suspense fallback={<span data-testid="pending">pending</span>}>
        {ready ? <Display header={<Header>READY</Header>} /> : <Pending />}
      </Suspense>
    </Activity>
  )

  await act(async () => {
    root.render(<StrictMode>{tree(false)}</StrictMode>)
    await Promise.resolve()
  })
  expect(host.querySelector('[data-testid="pending"]')).not.toBeNull()
  expect(host.querySelector('[data-slot="split-flap-board"]')).toBeNull()
  await act(async () => {
    root.render(<StrictMode>{tree(true)}</StrictMode>)
    resolvePending()
    await pending
  })
  expect(host.querySelectorAll('[data-slot="split-flap-board"]')).toHaveLength(1)
  expect(host.querySelectorAll('[data-slot="split-flap-board"] *')).not.toHaveLength(0)
  expect(host.textContent?.match(/READY/g)).toHaveLength(1)

  await act(async () => {
    root.render(<StrictMode>{tree(true, false)}</StrictMode>)
    await Promise.resolve()
  })
  await act(async () => {
    root.render(<StrictMode>{tree(true)}</StrictMode>)
    await Promise.resolve()
  })
  expect(host.querySelectorAll('[data-slot="split-flap-board"]')).toHaveLength(1)
  expect(host.textContent?.match(/READY/g)).toHaveLength(1)
})
