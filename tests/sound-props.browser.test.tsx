/// <reference types="vite/client" />

import { act, createRef, StrictMode, type ReactElement } from 'react'
import { createRoot, type Root as ReactRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Cell, createDeck, Grid, Root, Row } from 'flapkit'
import { riffle } from 'flapkit/motion/canvas/riffle'
import { SplitFlapSound } from '../src/sound/adapter'
import { defaultSplitFlapSoundTuning, SplitFlapSoundEngine } from '../src/sound/engine'

const bank = { clicks: ['/click.wav'], settles: ['/settle.wav'] }
const deck = createDeck(' ')
const motion = riffle()
let host: HTMLDivElement
let root: ReactRoot

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

async function render(sound: ReactElement) {
  await act(async () =>
    root.render(
      <StrictMode>
        <Root motion={motion} sound={sound}>
          <Grid>
            <Row deck={deck}>
              <Cell> </Cell>
            </Row>
          </Grid>
        </Root>
      </StrictMode>,
    ),
  )
}

it('resets omitted tuning props to defaults without replacing the sound engine', async () => {
  vi.spyOn(SplitFlapSoundEngine.prototype, 'preload').mockImplementation(() => {})
  const tuning = vi.spyOn(SplitFlapSoundEngine.prototype, 'setTuning')
  const destroy = vi.spyOn(SplitFlapSoundEngine.prototype, 'destroy')
  const prepareRef = createRef<(() => Promise<boolean>) | null>()
  const values = {
    volume: 0,
    clickLevel: 0.2,
    settleLevel: 0.3,
    stereoWidth: 0.4,
    pitchVariation: 0.02,
  }

  await render(<SplitFlapSound bank={bank} prepareRef={prepareRef} {...values} />)
  const engine = tuning.mock.instances.at(-1)
  const destroyCount = destroy.mock.calls.length
  expect(engine).toBeInstanceOf(SplitFlapSoundEngine)
  expect(tuning).toHaveBeenLastCalledWith(values)
  expect(prepareRef.current).toBeTypeOf('function')

  tuning.mockClear()
  await render(<SplitFlapSound bank={bank} prepareRef={prepareRef} />)

  expect(tuning).toHaveBeenCalledExactlyOnceWith(defaultSplitFlapSoundTuning)
  expect(tuning.mock.instances[0]).toBe(engine)
  expect(destroy).toHaveBeenCalledTimes(destroyCount)
  expect(prepareRef.current).toBeTypeOf('function')
})
