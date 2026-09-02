import * as stylex from '@stylexjs/stylex'
import {
  createSplitFlapDeck,
  SplitFlapBoard,
  SplitFlapGrid,
  type SplitFlapSource,
} from '@thecuvii/flapkit'
import { SplitFlapCascade } from '@thecuvii/flapkit/cascade'
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'
import { industrialWallLook } from '@thecuvii/flapkit/looks/industrial'
import { SplitFlapRiffle } from '@thecuvii/flapkit/riffle'
import { useState, type ReactNode } from 'react'

const columns: SplitFlapSource['columns'] = [
  { id: 'status', label: 'STATUS', cells: 8 },
  { id: 'gate', label: 'GATE', cells: 4 },
]

const unicodeColumns: SplitFlapSource['columns'] = [
  {
    id: 'local',
    label: 'LOCAL',
    cells: 2,
    flapDeck: createSplitFlapDeck(' 東京大阪成田羽田出発到着搭乗'),
  },
]

const wideCassetteColumns: SplitFlapSource['columns'] = [
  {
    id: 'number',
    label: 'NUMBER',
    cells: 1,
    cassetteSpan: 2,
    flapDeck: createSplitFlapDeck(['  ', '14', '05', '55', '15', '30', '20']),
  },
]

const presets = [
  { status: 'ON TIME', gate: 'A12' },
  { status: 'BOARDING', gate: 'B07' },
  { status: 'ARRIVED', gate: 'C21' },
  { status: 'DELAYED', gate: 'D04' },
] as const

const unicodePresets = ['東京', '大阪', '成田', '羽田'] as const
const widePresets = ['55', '30', '14', '05'] as const

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
    rows: [{ id: 'local', values: { local: unicodePresets[presetIndex]! } }],
  }
  const wideCassetteSource: SplitFlapSource = {
    columns: wideCassetteColumns,
    rows: [{ id: 'number', values: { number: widePresets[presetIndex]! } }],
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
        <p>Compare motion engines, Unicode decks, and double-width cassettes with live updates.</p>
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
          label="Unicode · Custom deck"
          title="One grapheme per cell"
          description="Each CJK grapheme occupies one independently driven character cell with its own upper and lower leaves."
        >
          <div className="unicode-demo">
            <div {...stylex.props(airportBoardLook)}>
              <SplitFlapRiffle source={unicodeSource}>
                <SplitFlapGrid
                  aria-label="Two independent Unicode character cells"
                  columnGap={2.4}
                />
              </SplitFlapRiffle>
            </div>
            <div className="demo-labels" aria-hidden="true">
              <span>Cell 1</span>
              <span>Cell 2</span>
            </div>
            <strong>Two independent cells</strong>
          </div>
        </Experiment>

        <Experiment
          label="Cassette · Double width"
          title="One leaf stack, two graphemes"
          description="Each double-width cassette has one deck and one motion state while every leaf position carries two graphemes."
        >
          <div className="wide-demo">
            <div {...stylex.props(airportBoardLook)}>
              <SplitFlapRiffle source={wideCassetteSource}>
                <SplitFlapGrid aria-label="One double-width numeric cassette" />
              </SplitFlapRiffle>
            </div>
            <strong>One cassette · two graphemes</strong>
          </div>
        </Experiment>
      </div>
    </main>
  )
}
