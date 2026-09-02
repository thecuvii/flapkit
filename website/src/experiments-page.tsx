import * as stylex from '@stylexjs/stylex'
import { createSplitFlapDeck, SplitFlapBoard, type SplitFlapSource } from '@thecuvii/flapkit'
import { SplitFlapCascade } from '@thecuvii/flapkit/cascade'
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'
import { industrialWallLook } from '@thecuvii/flapkit/looks/industrial'
import { SplitFlapRiffle } from '@thecuvii/flapkit/riffle'
import { useState, type ReactNode } from 'react'

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

const unicodeColumns: SplitFlapSource['columns'] = [
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

function Experiment({
  children,
  description,
  label,
  title,
}: {
  children: ReactNode
  description: string
  label: string
  title: string
}) {
  return (
    <section className="experiment">
      <div className="experiment-copy">
        <span>{label}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="experiment-stage" role="region" aria-label={`${label} preview`} tabIndex={0}>
        <div className="experiment-board">{children}</div>
      </div>
    </section>
  )
}

export function ExperimentsPage() {
  const [presetIndex, setPresetIndex] = useState(0)
  const preset = presets[presetIndex]!
  const alternatePreset = presets[(presetIndex + 2) % presets.length]!
  const source: SplitFlapSource = {
    columns,
    rows: [
      { id: 'one', values: preset },
      { id: 'two', values: alternatePreset },
    ],
  }
  const unicodeSource: SplitFlapSource = {
    columns: unicodeColumns,
    rows: [
      { id: 'primary', values: { local: preset.local } },
      { id: 'alternate', values: { local: alternatePreset.local } },
    ],
  }

  return (
    <main className="experiments-page">
      <header className="experiments-header">
        <a href="/">← Documentation</a>
        <button
          type="button"
          onClick={() => setPresetIndex((index) => (index + 1) % presets.length)}
        >
          Update all boards
        </button>
      </header>

      <div className="experiments-intro">
        <span>Flapkit lab</span>
        <h1>Motion experiments</h1>
        <p>Compare both motion engines and verify custom Unicode decks with live updates.</p>
      </div>

      <div className="experiments-stack">
        <Experiment
          label="Riffle · Airport"
          title="Randomized rapid flipping"
          description="Canvas-assisted motion spreads starts across the board and stays lightweight on dense layouts."
        >
          <div {...stylex.props(airportBoardLook)}>
            <SplitFlapRiffle source={source}>
              <SplitFlapBoard>Departures</SplitFlapBoard>
            </SplitFlapRiffle>
          </div>
        </Experiment>

        <Experiment
          label="Cascade · Industrial"
          title="Row-staggered 3D leaves"
          description="CSS 3D cassettes move in a controlled row cascade with per-cell cadence variation."
        >
          <div {...stylex.props(industrialWallLook)}>
            <SplitFlapCascade source={source}>
              <SplitFlapBoard>Departures</SplitFlapBoard>
            </SplitFlapCascade>
          </div>
        </Experiment>

        <Experiment
          label="Unicode · Paired panels"
          title="Two-panel grapheme cassettes"
          description="Custom decks keep CJK graphemes intact and render each value across paired physical panels."
        >
          <div {...stylex.props(airportBoardLook)}>
            <SplitFlapRiffle source={unicodeSource}>
              <SplitFlapBoard>Local service</SplitFlapBoard>
            </SplitFlapRiffle>
          </div>
        </Experiment>
      </div>
    </main>
  )
}
