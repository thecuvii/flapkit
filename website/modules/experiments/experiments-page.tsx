'use client'

import * as Flapkit from '@thecuvii/flapkit'
import { useState, type ReactNode } from 'react'
import { cn } from 'cn'
import { Exhibit, SiteFrame } from '../site'

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

const headerType = 'font-sans text-[13px]/[1.2] font-[650]'
const eyebrowType = 'text-[11px] font-[680] tracking-[0.1em] text-muted uppercase'
const demoFrame = 'grid w-[340px] justify-items-center gap-[18px] py-[22px] pb-2'
const demoLabels = 'grid gap-0.5 text-center text-[10px] font-[680] tracking-[0.06em] text-muted uppercase'
const demoLabel = 'rounded bg-panel px-1 py-2'
const demoKicker = 'text-xs font-[680] text-ink'

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
  look,
  motion,
  deck,
  title,
}: {
  children: ReactNode
  description: string
  label: string
  look: string
  motion: string
  deck: string
  title: string
}) {
  return (
    <section className="col-span-full grid min-w-0 grid-cols-subgrid border-b border-dashed border-rule">
      <div className="col-start-2 max-w-none pt-12">
        <span className={eyebrowType}>{label}</span>
        <h2 className="mt-[13px] mb-4 font-display text-[27px]">{title}</h2>
        <p className="m-0 text-sm leading-[1.65] text-muted">{description}</p>
      </div>
      <Exhibit className="col-span-full mt-6" look={look} motion={motion} deck={deck}>
        <div className="mx-auto w-max">{children}</div>
      </Exhibit>
    </section>
  )
}

export function ExperimentsPage() {
  const [presetIndex, setPresetIndex] = useState(0)
  const preset = presets[presetIndex]!
  const alternatePreset = presets[(presetIndex + 2) % presets.length]!

  return (
    <SiteFrame>
      <main
        className={cn(
          'experiments-page relative grid min-h-dvh [counter-reset:exhibit]',
          'grid-cols-[var(--lead)_var(--well-center)_minmax(0,1fr)] pt-u4 pb-[calc(var(--u)+var(--u4))]',
          'max-[860px]:grid-cols-[var(--gutter)_minmax(0,1fr)_var(--gutter)]',
          'max-[560px]:grid-cols-[var(--gutter)_minmax(0,1fr)_var(--gutter)] max-[560px]:pt-[22px] max-[560px]:pb-[88px]',
        )}
        style={{
          ['--lead' as string]:
            'max(var(--u), round(nearest, calc((100vw - 9 * var(--u)) / 2), var(--u)))',
          ['--col-left' as string]: 'var(--lead)',
        }}
      >
        <header className="col-start-2 flex items-center justify-between gap-6 max-[560px]:flex-col max-[560px]:items-stretch">
          <a className={cn(headerType, 'hover:text-muted')} href="/">
            ← Docs
          </a>
          <button
            type="button"
            className={cn(
              headerType,
              'cursor-pointer rounded-[6px] border-0 bg-ink px-[15px] py-[11px] text-on-ink',
              'hover:bg-ink-hover',
              'focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ink',
              'max-[560px]:min-h-11',
            )}
            onClick={() => setPresetIndex((index) => (index + 1) % presets.length)}
          >
            Update all boards
          </button>
        </header>

        <div className="col-start-2 py-[72px] pb-16 max-[560px]:pt-20 max-[560px]:pb-16">
          <span className={eyebrowType}>01 / Lab</span>
          <h1 className="mt-[18px] font-display text-[clamp(36px,5vw,52px)] font-[650] leading-[1.02] tracking-[-0.02em] text-balance">
            Examples
          </h1>
          <p className="mt-6 mb-0 max-w-[580px] text-base leading-[1.65] text-muted">
            Compare motion engines, Unicode decks, and double-width cassettes with live updates.
          </p>
        </div>

        <div className="col-span-full grid grid-cols-subgrid">
        <Experiment
          label="Riffle · Airport"
          look="airport"
          motion="riffle"
          deck="A–Z"
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
          look="industrial"
          motion="cascade"
          deck="A–Z"
          title="Row-staggered 3D leaves"
          description="The same canvas leaf as riffle, with starts staggered across rows and per-cell cadence variation."
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
          look="airport"
          motion="riffle"
          deck="custom"
          title="One grapheme per cell"
          description="Each CJK grapheme occupies one independently driven character cell with its own upper and lower leaves."
        >
          <div className={demoFrame}>
            <Flapkit.Root motion={Flapkit.riffle()}>
              <Flapkit.Grid
                aria-label="Two independent Unicode character cells"
                className={cn('flapkit-airport', 'my-[72px] origin-center scale-500')}
                columnGap={2.4}
              >
                <Flapkit.Row label="LOCAL">
                  {cells(unicodePresets[presetIndex]!, 2, unicodeDeck)}
                </Flapkit.Row>
              </Flapkit.Grid>
            </Flapkit.Root>
            <div className={cn(demoLabels, 'w-[280px] grid-cols-2')} aria-hidden="true">
              <span className={demoLabel}>Cell 1</span>
              <span className={demoLabel}>Cell 2</span>
            </div>
            <strong className={demoKicker}>Two independent cells</strong>
          </div>
        </Experiment>

        <Experiment
          label="Cassette · Double width"
          look="airport"
          motion="riffle"
          deck="numeric"
          title="One leaf stack, two graphemes"
          description="Each double-width cassette has one deck and one motion state while every leaf position carries two graphemes."
        >
          <div className={demoFrame}>
            <Flapkit.Root motion={Flapkit.riffle()}>
              <Flapkit.Grid
                aria-label="One double-width and one single-width numeric cassette"
                className={cn('flapkit-airport', 'my-[72px] origin-center scale-[4.8]')}
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
            <div className={cn(demoLabels, 'w-[330px] grid-cols-[2fr_1fr]')} aria-hidden="true">
              <span className={demoLabel}>Double-width</span>
              <span className={demoLabel}>Single-width</span>
            </div>
            <strong className={demoKicker}>One runtime per cassette</strong>
          </div>
        </Experiment>
        </div>
      </main>
    </SiteFrame>
  )
}
