import * as Flapkit from '@thecuvii/flapkit'
import { useState, type ReactNode } from 'react'

const unicodeDeck = Flapkit.createDeck(' 東京大阪成田羽田出発到着搭乗')
const wideDeck = Flapkit.createDeck(['  ', '14', '05', '55', '15', '30', '20'])
const numericDeck = Flapkit.createDeck(' 145302')

const presets = [
  { status: 'ON TIME', gate: 'A12' },
  { status: 'BOARDING', gate: 'B07' },
  { status: 'ARRIVED', gate: 'C21' },
  { status: 'DELAYED', gate: 'D04' },
] as const

const unicodePresets = ['東京', '大阪', '成田', '羽田'] as const
const widePresets = ['55', '30', '14', '05'] as const

function cells(text: string, count: number, deck?: Flapkit.Deck) {
  return Array.from({ length: count }, (_, index) => (
    <Flapkit.Cell key={index} deck={deck}>
      {Array.from(text)[index] ?? ' '}
    </Flapkit.Cell>
  ))
}

function DepartureRow({ gate, status }: { gate: string; status: string }) {
  return (
    <>
      <Flapkit.Group label="STATUS">{cells(status, 8)}</Flapkit.Group>
      <Flapkit.Group label="GATE">{cells(gate, 4)}</Flapkit.Group>
    </>
  )
}

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
          <Flapkit.Root motion={Flapkit.riffle()}>
            <Flapkit.Board className="flapkit-airport">
              <Flapkit.Header>Departures</Flapkit.Header>
              <Flapkit.Row id="one">{DepartureRow(preset)}</Flapkit.Row>
              <Flapkit.Row id="two">{DepartureRow(alternatePreset)}</Flapkit.Row>
            </Flapkit.Board>
          </Flapkit.Root>
        </Experiment>

        <Experiment
          label="Cascade · Industrial"
          title="Row-staggered 3D leaves"
          description="CSS 3D cassettes move in a controlled row cascade with per-cell cadence variation."
        >
          <Flapkit.Root motion={Flapkit.cascade()}>
            <Flapkit.Board className="flapkit-industrial">
              <Flapkit.Header>Departures</Flapkit.Header>
              <Flapkit.Row id="one">{DepartureRow(preset)}</Flapkit.Row>
              <Flapkit.Row id="two">{DepartureRow(alternatePreset)}</Flapkit.Row>
            </Flapkit.Board>
          </Flapkit.Root>
        </Experiment>

        <Experiment
          label="Unicode · Custom deck"
          title="One grapheme per cell"
          description="Each CJK grapheme occupies one independently driven character cell with its own upper and lower leaves."
        >
          <div className="unicode-demo">
            <Flapkit.Root motion={Flapkit.riffle()}>
              <Flapkit.Grid
                aria-label="Two independent Unicode character cells"
                className="flapkit-airport"
                columnGap={2.4}
              >
                <Flapkit.Row label="LOCAL">
                  {cells(unicodePresets[presetIndex]!, 2, unicodeDeck)}
                </Flapkit.Row>
              </Flapkit.Grid>
            </Flapkit.Root>
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
            <Flapkit.Root motion={Flapkit.riffle()}>
              <Flapkit.Grid
                aria-label="One double-width and one single-width numeric cassette"
                className="flapkit-airport"
              >
                <Flapkit.Row>
                  <Flapkit.Group label="DOUBLE" deck={wideDeck}>
                    <Flapkit.WideCell>{widePresets[presetIndex]!}</Flapkit.WideCell>
                  </Flapkit.Group>
                  <Flapkit.Group label="SINGLE" deck={numericDeck}>
                    <Flapkit.Cell>{widePresets[presetIndex]![0]!}</Flapkit.Cell>
                  </Flapkit.Group>
                </Flapkit.Row>
              </Flapkit.Grid>
            </Flapkit.Root>
            <div className="cassette-demo-labels" aria-hidden="true">
              <span>Double-width</span>
              <span>Single-width</span>
            </div>
            <strong>One runtime per cassette</strong>
          </div>
        </Experiment>
      </div>
    </main>
  )
}
