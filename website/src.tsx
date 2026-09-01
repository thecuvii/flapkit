import * as stylex from '@stylexjs/stylex'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { createSplitFlapDeck, SplitFlapBoard, type SplitFlapSource } from '@thecuvii/flapkit'
import { SplitFlapCss3dCascade } from '@thecuvii/flapkit/css-3d-cascade'
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'
import { industrialWallLook } from '@thecuvii/flapkit/looks/industrial'
import { SplitFlapRiffleSettle } from '@thecuvii/flapkit/riffle-settle'

const columns: SplitFlapSource['columns'] = [
  { id: 'status', label: 'STATUS', cells: 8 },
  {
    id: 'local',
    label: 'LOCAL',
    cells: 4,
    flapDeck: createSplitFlapDeck(' 東京大阪成田羽田出発到着搭乗'),
    panelsPerCassette: 2,
  },
]

const presets = [
  { status: 'ON TIME', local: '東京出発' },
  { status: 'BOARDING', local: '大阪搭乗' },
  { status: 'ARRIVED', local: '成田到着' },
  { status: 'DELAYED', local: '羽田出発' },
] as const

function App() {
  const [presetIndex, setPresetIndex] = useState(0)
  const nextPreset = () => setPresetIndex((index) => (index + 1) % presets.length)
  const alternatePreset = presets[(presetIndex + 2) % presets.length]
  const preset = presets[presetIndex]
  const source: SplitFlapSource = {
    columns,
    rows: [
      { id: 'one', values: preset },
      { id: 'two', values: alternatePreset },
    ],
  }
  return (
    <main {...stylex.props(styles.page)}>
      <section {...stylex.props(styles.demo, airportBoardLook)}>
        <h2 {...stylex.props(styles.heading)}>Riffle + Settle · Airport</h2>
        <SplitFlapRiffleSettle source={source}>
          <SplitFlapBoard>
            <span>Departures</span>
          </SplitFlapBoard>
        </SplitFlapRiffleSettle>
      </section>
      <section {...stylex.props(styles.demo, industrialWallLook)}>
        <h2 {...stylex.props(styles.heading)}>CSS 3D Cascade · Industrial</h2>
        <SplitFlapCss3dCascade source={source}>
          <SplitFlapBoard>
            <span>Departures</span>
          </SplitFlapBoard>
        </SplitFlapCss3dCascade>
      </section>
      <button {...stylex.props(styles.button)} type="button" onClick={nextPreset}>
        Update both boards
      </button>
    </main>
  )
}

const styles = stylex.create({
  page: {
    background: '#10110f',
    display: 'grid',
    gap: 48,
    justifyItems: 'start',
    minHeight: '100vh',
    padding: 48,
  },
  demo: {
    display: 'grid',
    gap: 12,
  },
  heading: {
    margin: 0,
    color: '#b8b9b2',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    fontWeight: 550,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  button: {
    padding: '10px 14px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#494b44',
    borderRadius: 4,
    backgroundColor: '#242620',
    color: '#efefe9',
    cursor: 'pointer',
    font: '600 13px system-ui, sans-serif',
  },
})
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
