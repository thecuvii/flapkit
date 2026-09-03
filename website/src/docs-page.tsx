import * as Flapkit from '@thecuvii/flapkit'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CassettePreview } from '../../src/render/cassette-preview'
import type { HighlightedDocsCode } from './docs-code'
import { Exhibit, SiteFrame, SpecStrip } from './site-chrome'

const navigation = [
  {
    label: 'Start',
    items: [
      ['Introduction', 'introduction'],
      ['Quick start', 'quick-start'],
    ],
  },
  {
    label: 'Guides',
    items: [
      ['How it works', 'how-it-works'],
      ['Composition', 'composition'],
      ['Decks', 'decks'],
      ['Motion', 'motion'],
      ['Looks', 'looks'],
      ['Sound', 'sound'],
    ],
  },
  {
    label: 'Reference',
    items: [['API', 'api']],
  },
] as const

const labLinks = [
  ['Examples', '/experiments'],
  ['Bench', '/performance'],
] as const

const sectionMeta = [
  { id: 'introduction', index: '01', title: 'Introduction' },
  { id: 'quick-start', index: '02', title: 'Quick start' },
  { id: 'how-it-works', index: '03', title: 'How it works' },
  { id: 'composition', index: '04', title: 'Composition' },
  { id: 'decks', index: '05', title: 'Decks' },
  { id: 'motion', index: '06', title: 'Motion' },
  { id: 'looks', index: '07', title: 'Looks' },
  { id: 'sound', index: '08', title: 'Sound' },
  { id: 'api', index: '09', title: 'API' },
] as const

const sectionIds = sectionMeta.map((section) => section.id)

const localDeck = Flapkit.createDeck(' 東京大阪成田羽田出発到着搭乗')
const wideDeck = Flapkit.createDeck(['  ', '14', '05', '55', '30'])
const principleDeck: Flapkit.Deck = Flapkit.createDeck(
  ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-./:東京大阪成田羽出発到着搭乗口',
).map((position) => ({
  ...position,
  variant: 'AEIOU東京大阪'.includes(position.character)
    ? 'yellow'
    : 'RST出発到着'.includes(position.character)
      ? 'orange'
      : 'white',
}))

function cells(text: string, count: number, deck?: Flapkit.Deck) {
  return Array.from({ length: count }, (_, index) => (
    <Flapkit.Cell key={index} deck={deck}>
      {Array.from(text)[index] ?? ' '}
    </Flapkit.Cell>
  ))
}

function Logo() {
  return (
    <a className="logo" href="#introduction" aria-label="Flapkit documentation home">
      <span aria-hidden="true">F</span>
      <strong>Flapkit</strong>
    </a>
  )
}

function CodeBlock({ html }: { html: string }) {
  return (
    <div
      className="code-block"
      role="region"
      aria-label="Code example"
      // Shiki escapes source code before producing this trusted HTML.
      dangerouslySetInnerHTML={{ __html: html }}
      tabIndex={0}
    />
  )
}

function useActiveSection() {
  const [activeId, setActiveId] = useState<(typeof sectionIds)[number]>('introduction')

  useEffect(() => {
    const nodes = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null)
    if (nodes.length === 0) return

    const ratios = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target.id, entry.intersectionRatio)
        const next = [...ratios.entries()].sort((left, right) => right[1] - left[1])[0]
        if (next && next[1] > 0) setActiveId(next[0] as (typeof sectionIds)[number])
      },
      { rootMargin: '-18% 0px -58% 0px', threshold: [0, 0.16, 0.4, 0.7] },
    )
    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return sectionMeta.find((section) => section.id === activeId) ?? sectionMeta[0]
}

function ChoiceSwitch<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="choice-switch">
      <span>{label}</span>
      <div role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function StatusBoard({
  look = 'airport',
  motion = 'riffle',
}: {
  look?: 'airport' | 'industrial'
  motion?: 'cascade' | 'riffle'
}) {
  return (
    <Flapkit.Root key={motion} motion={motion === 'cascade' ? Flapkit.cascade() : Flapkit.riffle()}>
      <Flapkit.Board
        aria-label="Package status"
        className={`flapkit-${look} preview-board`}
      >
        <Flapkit.Row label="STATUS">{cells('FLAPKIT', 8)}</Flapkit.Row>
        <Flapkit.Row label="STATUS">{cells('READY', 8)}</Flapkit.Row>
      </Flapkit.Board>
    </Flapkit.Root>
  )
}

function FlapPrinciple() {
  const firstCharacterProgress = 1 / (principleDeck.length - 1)
  const [progress, setProgress] = useState(firstCharacterProgress)
  const [isPlaying, setIsPlaying] = useState(false)
  const [look, setLook] = useState<'airport' | 'industrial'>('airport')
  const [motionMode, setMotionMode] = useState<'cascade' | 'riffle'>('cascade')
  const playbackFrame = useRef<number | null>(null)
  const deckPosition = progress * (principleDeck.length - 1)
  const fromIndex = Math.min(principleDeck.length - 2, Math.floor(deckPosition))
  const pitchProgress = deckPosition - fromIndex
  const visibleIndex = Math.min(principleDeck.length - 1, fromIndex + Number(pitchProgress >= 0.5))
  const visiblePosition = principleDeck[visibleIndex]!

  const stopPlayback = () => {
    if (playbackFrame.current !== null) cancelAnimationFrame(playbackFrame.current)
    playbackFrame.current = null
    setIsPlaying(false)
  }

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback()
      return
    }

    const startProgress = progress >= 1 ? 0 : progress
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1)
      return
    }

    const startedAt = performance.now()
    const pitchDuration = motionMode === 'cascade' ? 95 : 58
    const duration = (1 - startProgress) * (principleDeck.length - 1) * pitchDuration
    setProgress(startProgress)
    setIsPlaying(true)

    const advance = (now: number) => {
      const nextProgress = Math.min(
        1,
        startProgress + ((now - startedAt) / duration) * (1 - startProgress),
      )
      setProgress(nextProgress)
      if (nextProgress < 1) {
        playbackFrame.current = requestAnimationFrame(advance)
      } else {
        playbackFrame.current = null
        setIsPlaying(false)
      }
    }
    playbackFrame.current = requestAnimationFrame(advance)
  }

  useEffect(
    () => () => {
      if (playbackFrame.current !== null) cancelAnimationFrame(playbackFrame.current)
    },
    [],
  )

  return (
    <div className="principle-demo">
      <div className="principle-stage">
        <div className="principle-cassette-stage">
          <div className="principle-cassette-scale">
            <CassettePreview
              className={`flapkit-${look} principle-cassette`}
              deck={principleDeck}
              fromIndex={fromIndex}
              mode={motionMode}
              progress={pitchProgress}
            />
          </div>
          <span>
            {look} · {motionMode}
          </span>
        </div>

        <div className="principle-copy">
          <span>Inside one cassette</span>
          <strong>One indexed deck, one moving leaf, every character.</strong>
          <p>
            Each stop in the deck carries a complete glyph. The active leaf rotates around the
            center axle while the remaining leaves stay packed behind it.
          </p>
          <dl className="term-list">
            <div>
              <dt>Cassette</dt>
              <dd>One independently driven unit. In JSX that is a Cell or WideCell.</dd>
            </div>
            <div>
              <dt>Deck</dt>
              <dd>The ordered stops that cassette can land on.</dd>
            </div>
            <div>
              <dt>Look</dt>
              <dd>CSS treatment. Independent of motion.</dd>
            </div>
          </dl>
          <div className="choice-row">
            <ChoiceSwitch
              label="Look"
              options={['airport', 'industrial'] as const}
              value={look}
              onChange={setLook}
            />
            <ChoiceSwitch
              label="Motion"
              options={['cascade', 'riffle'] as const}
              value={motionMode}
              onChange={(option) => {
                stopPlayback()
                setMotionMode(option)
              }}
            />
          </div>
          <SpecStrip look={look} motion={motionMode} deck={`${principleDeck.length}`} />
          <div className="principle-deck" aria-label="Complete Latin and CJK character deck">
            {principleDeck.map(({ character, variant }, index) => (
              <span
                key={`${character}-${index}`}
                data-active={index === visibleIndex || undefined}
                data-variant={variant}
              >
                {character.trim() || '·'}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="principle-scrubber">
        <label htmlFor="principle-deck-position">Deck position</label>
        <output data-variant={visiblePosition.variant}>
          {visiblePosition.character.trim() || 'Blank'} · {visibleIndex + 1}/{principleDeck.length}
        </output>
        <div className="principle-controls">
          <input
            id="principle-deck-position"
            type="range"
            min="0"
            max="1000"
            value={Math.round(progress * 1000)}
            onChange={(event) => {
              stopPlayback()
              setProgress(Number(event.currentTarget.value) / 1000)
            }}
            onKeyDown={stopPlayback}
            onPointerDown={stopPlayback}
          />
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause deck playback' : 'Play deck to the final position'}
            title={isPlaying ? 'Pause' : progress >= 1 ? 'Replay' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4.5 3.5h2v9h-2zm5 0h2v9h-2z" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m5 3 8 5-8 5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function MotionPreview() {
  const [motion, setMotion] = useState<'cascade' | 'riffle'>('riffle')

  return (
    <Exhibit
      look="airport"
      motion={motion}
      deck="A–Z"
      footer={
        <ChoiceSwitch
          label="Motion"
          options={['riffle', 'cascade'] as const}
          value={motion}
          onChange={setMotion}
        />
      }
    >
      <StatusBoard motion={motion} />
    </Exhibit>
  )
}

function LooksPreview() {
  const [look, setLook] = useState<'airport' | 'industrial'>('airport')

  return (
    <Exhibit
      look={look}
      motion="cascade"
      deck="A–Z"
      footer={
        <ChoiceSwitch
          label="Look"
          options={['airport', 'industrial'] as const}
          value={look}
          onChange={setLook}
        />
      }
    >
      <StatusBoard look={look} motion="cascade" />
    </Exhibit>
  )
}

type ApiRow = readonly [string, string, string, string]

function ApiTable({
  caption,
  rows,
}: {
  caption: string
  rows: readonly ApiRow[]
}) {
  return (
    <div className="api-block">
      <h3>{caption}</h3>
      <div className="api-table-wrap">
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Default</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, type, fallback, meaning]) => (
              <tr key={name}>
                <th scope="row">
                  <code>{name}</code>
                </th>
                <td>
                  <code>{type}</code>
                </td>
                <td>{fallback}</td>
                <td>{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DocSection({
  id,
  index,
  title,
  children,
  className,
}: {
  id: string
  index: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={['doc-section', className].filter(Boolean).join(' ')}
      data-index={index}
      data-title={title}
    >
      <h2>
        <span className="section-index" aria-hidden="true">
          {index}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function DocsPage({ highlightedCode }: { highlightedCode: HighlightedDocsCode }) {
  const active = useActiveSection()

  return (
    <SiteFrame>
      <div className="docs-body">
          <aside className="sidebar">
            <div className="sidebar-inner">
              <Logo />
              <nav aria-label="Documentation">
                {navigation.map((group) => (
                  <div key={group.label} className="nav-group">
                    <p>{group.label}</p>
                    {group.items.map(([label, id]) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        className={active.id === id ? 'is-active' : undefined}
                        aria-current={active.id === id ? 'location' : undefined}
                      >
                        {label}
                      </a>
                    ))}
                  </div>
                ))}
                <div className="nav-group">
                  <p>Lab</p>
                  {labLinks.map(([label, href]) => (
                    <a key={href} href={href}>
                      {label}
                    </a>
                  ))}
                  <a className="github-link" href="https://github.com/thecuvii/flapkit">
                    GitHub <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </nav>
              <p className="sidebar-version">0.0.0</p>
            </div>
          </aside>

          <main className="docs-well">
              <section
                id="introduction"
                className="doc-section introduction"
                data-index="01"
                data-title="Introduction"
              >
                <h1>
                  <span>Mechanical displays.</span>
                  <br />
                  For <em>React.</em>
                </h1>
                <code className="install-line">pnpm add @thecuvii/flapkit</code>
                <Exhibit className="hero-exhibit" look="airport" motion="riffle" deck="A–Z">
                  <Flapkit.Root motion={Flapkit.riffle()}>
                    <Flapkit.Board
                      aria-label="Flapkit ready status"
                      className="flapkit-airport preview-board"
                    >
                      <Flapkit.Header>Flapkit</Flapkit.Header>
                      <Flapkit.Row label="STATUS">{cells('FLAPKIT', 8)}</Flapkit.Row>
                      <Flapkit.Row label="STATUS">{cells('READY', 8)}</Flapkit.Row>
                    </Flapkit.Board>
                  </Flapkit.Root>
                </Exhibit>
              </section>

        <DocSection id="quick-start" index="02" title="Quick start">
          <p>
            Install Flapkit. React 19 is a peer dependency. Import the structural stylesheet and one
            look; Flapkit does not inject styles at runtime.
          </p>
          <Exhibit look="airport" motion="riffle" deck="A–Z">
            <Flapkit.Root motion={Flapkit.riffle()}>
              <Flapkit.Board aria-label="Package status" className="flapkit-airport preview-board">
                <Flapkit.Row label="STATUS">{cells('FLAPKIT', 7)}</Flapkit.Row>
              </Flapkit.Board>
            </Flapkit.Root>
          </Exhibit>
          <CodeBlock html={highlightedCode.quickStart} />
        </DocSection>

        <DocSection id="how-it-works" index="03" title="How it works" className="principle-section">
          <p>
            Scrub through the complete character deck and inspect one physical pitch at a time. The
            guides below use three words for that object.
          </p>
          <FlapPrinciple />
        </DocSection>

        <DocSection id="composition" index="04" title="Composition">
          <p>
            Root compiles a declarative board and hands animation to a motion adapter. Use a flat
            Row when the whole row shares one label, deck, sequence, and variant. Add Group only when
            adjacent regions need different settings. Give Row and Group stable ids when items can
            reorder so cassette identity survives.
          </p>
          <Exhibit look="airport" motion="riffle" deck="A–Z">
            <Flapkit.Root motion={Flapkit.riffle()}>
              <Flapkit.Board className="flapkit-airport preview-board">
                <Flapkit.Header>Departures</Flapkit.Header>
                <Flapkit.Row highlighted id="LH401">
                  <Flapkit.Group label="STATUS">{cells('BOARDING', 8)}</Flapkit.Group>
                  <Flapkit.Group label="GATE">{cells('A12', 3)}</Flapkit.Group>
                </Flapkit.Row>
              </Flapkit.Board>
            </Flapkit.Root>
          </Exhibit>
          <ul className="anatomy" aria-label="Flapkit component tree">
            <li>
              <code>Root</code>
              <span>Motion and optional sound</span>
            </li>
            <li className="anatomy-depth-1">
              <code>Board</code>
              <span>Framed display with grain, labels, and optional header</span>
            </li>
            <li className="anatomy-depth-1">
              <code>Grid</code>
              <span>Frameless display with the same cassette grid</span>
            </li>
            <li className="anatomy-depth-2">
              <code>Header</code>
              <span>Optional board title. Board only</span>
            </li>
            <li className="anatomy-depth-2">
              <code>Row</code>
              <span>One horizontal record. <code>highlighted</code> lifts a row</span>
            </li>
            <li className="anatomy-depth-3">
              <code>Group</code>
              <span>Optional adjacent region with shared settings</span>
            </li>
            <li className="anatomy-depth-3">
              <code>Cell / WideCell</code>
              <span>One independently driven cassette. A group cannot mix widths</span>
            </li>
          </ul>
          <p>
            <code>deck</code>, <code>sequence</code>, <code>variant</code>, and <code>label</code>{' '}
            cascade from Row to Group to Cell. Set them on the nearest owner.
          </p>
          <CodeBlock html={highlightedCode.composition} />
        </DocSection>

        <DocSection id="decks" index="05" title="Decks">
          <p>
            A deck is the ordered stops a cassette can land on. Built-in sequences cover Latin
            letters, numbers, and common punctuation. Use <code>createDeck</code> for Chinese,
            Japanese, emoji, or any other grapheme. Text is segmented with{' '}
            <code>Intl.Segmenter</code>, so combining marks and emoji sequences are not split across
            cells. <code>WideCell</code> is one cassette whose leaves carry two graphemes. Rows in
            the same Board or Grid must share one Group / Cell / WideCell structure.
          </p>
          <Exhibit className="decks-exhibit" look="airport" motion="riffle" deck="custom">
            <div className="decks-stack">
              <Flapkit.Root motion={Flapkit.riffle()}>
                <Flapkit.Grid
                  aria-label="Local service"
                  className="flapkit-airport preview-board"
                >
                  <Flapkit.Row deck={localDeck} label="LOCAL">
                    {cells('東京', 2, localDeck)}
                  </Flapkit.Row>
                </Flapkit.Grid>
              </Flapkit.Root>
              <Flapkit.Root motion={Flapkit.riffle()}>
                <Flapkit.Grid
                  aria-label="Flight number and gate"
                  className="flapkit-airport preview-board"
                >
                  <Flapkit.Row>
                    <Flapkit.Group deck={wideDeck} label="FLIGHT">
                      <Flapkit.WideCell>14</Flapkit.WideCell>
                    </Flapkit.Group>
                    <Flapkit.Group sequence="numeric" label="GATE">
                      <Flapkit.Cell>1</Flapkit.Cell>
                      <Flapkit.Cell>2</Flapkit.Cell>
                    </Flapkit.Group>
                  </Flapkit.Row>
                </Flapkit.Grid>
              </Flapkit.Root>
            </div>
          </Exhibit>
          <div className="option-list">
            <div>
              <code>alphanumeric</code>
              <span>Letters, numbers, and <code>-./:</code>. The default sequence.</span>
            </div>
            <div>
              <code>numeric</code>
              <span>Space and digits for clocks, gates, and counts.</span>
            </div>
            <div>
              <code>punctuation</code>
              <span>Space, colon, period, slash, and hyphen.</span>
            </div>
            <div>
              <code>variant</code>
              <span>
                <code>white</code>, <code>yellow</code>, or <code>orange</code>. Pass variants as the
                second argument to <code>createDeck</code>.
              </span>
            </div>
          </div>
          <CodeBlock html={highlightedCode.decks} />
        </DocSection>

        <DocSection id="motion" index="06" title="Motion">
          <p>
            Both adapters drive the same component tree and preserve the same looks.{' '}
            <code>riffle()</code> is for dense boards: canvas-assisted, randomized starts.{' '}
            <code>cascade()</code> is CSS 3D leaf motion that staggers across rows. Cascade limits how
            many cassettes flip at once.
          </p>
          <MotionPreview />
          <div className="option-list">
            <div>
              <code>riffle()</code>
              <span>
                <code>riffleMs</code>, <code>startSpreadMs</code>, <code>cadenceVariationPct</code>,{' '}
                <code>finalReboundDeg</code>, <code>finalSettleMs</code>
              </span>
            </div>
            <div>
              <code>cascade()</code>
              <span>
                <code>pitchMs</code>, <code>rowDelayMs</code>, <code>withinRowJitterMs</code>,{' '}
                <code>maximumConcurrentCassettes</code>, plus the shared settle options
              </span>
            </div>
          </div>
          <CodeBlock html={highlightedCode.motion} />
        </DocSection>

        <DocSection id="looks" index="07" title="Looks">
          <p>
            Looks are separate CSS subpaths. Put the look class on the Board or Grid styling host.
            Font family, weight, and style inherit from Board, Row, and Group; set size on Cell.
            Ordinary classes and Tailwind utilities work without a Flapkit-specific API. Use{' '}
            <code>data-slot</code> and <code>data-part="face"</code> only for surfaces that
            cannot inherit, such as leaf faces.
          </p>
          <LooksPreview />
          <CodeBlock html={highlightedCode.looks} />
          <CodeBlock html={highlightedCode.looksCss} />
        </DocSection>

        <DocSection id="sound" index="08" title="Sound">
          <p>
            Sound is optional and ships without audio assets. Supply click and settle URLs you own,
            then pass <code>{'mechanicalSound({ bank })'}</code> to Root. The React adapter unlocks
            audio on the first pointer or keyboard gesture. <code>SoundEngine</code> is exported
            from the same subpath for non-React wiring.
          </p>
          <CodeBlock html={highlightedCode.sound} />
        </DocSection>

        <DocSection id="api" index="09" title="API">
          <p>
            Updates animate only cassettes whose resolved deck position changed. Motion engines and
            looks tree-shake independently, and there is no runtime style injection. Measure dense
            boards on the <a href="/performance">bench</a>.
          </p>
          <div className="api-list">
            <code>@thecuvii/flapkit</code>
            <code>@thecuvii/flapkit/sound</code>
            <code>@thecuvii/flapkit/flapkit.css</code>
            <code>@thecuvii/flapkit/airport.css</code>
            <code>@thecuvii/flapkit/industrial.css</code>
          </div>

          <ApiTable
            caption="Root"
            rows={[
              ['children', 'ReactNode', '—', 'Board or Grid'],
              ['motion', 'MotionAdapter', '—', 'riffle() or cascade()'],
              ['sound', 'ReactElement', '—', 'mechanicalSound({ bank })'],
            ]}
          />
          <ApiTable
            caption="Board"
            rows={[
              ['className', 'string', '—', 'Look class and ordinary CSS'],
              ['aria-label', 'string', 'Split-flap display board', 'Accessible name'],
              ['columnGap', 'number', '0.28', 'Gap inside a group, in board units'],
              ['groupGap', 'number', '0.8', 'Gap between groups'],
              ['rowGap', 'number', '0.4', 'Gap between rows'],
              ['grainOpacity', 'number', '0.32', 'Frame grain overlay'],
              ['showColumnLabels', 'boolean', 'true', 'Column labels under the header'],
            ]}
          />
          <ApiTable
            caption="Grid"
            rows={[
              ['className', 'string', '—', 'Look class and ordinary CSS'],
              ['aria-label', 'string', 'Split-flap display grid', 'Accessible name'],
              ['columnGap', 'number', '0.28', 'Gap inside a group, in board units'],
              ['groupGap', 'number', '0.8', 'Gap between groups'],
              ['rowGap', 'number', '0.4', 'Gap between rows'],
            ]}
          />
          <ApiTable
            caption="Header"
            rows={[['children', 'ReactNode', '—', 'Board title. Board only']]}
          />
          <ApiTable
            caption="Row"
            rows={[
              ['id', 'string', 'generated', 'Stable identity when rows reorder'],
              ['label', 'string', '—', 'Column label when the row is one region'],
              ['deck', 'Deck', '—', 'Stops for every cassette in the row'],
              ['sequence', 'Sequence', 'alphanumeric', 'Built-in deck if no custom deck'],
              ['variant', 'Variant', 'white', 'white, yellow, or orange'],
              ['highlighted', 'boolean', 'false', 'Lifted, brighter row'],
              ['className', 'string', '—', 'Inherits into glyphs'],
            ]}
          />
          <ApiTable
            caption="Group"
            rows={[
              ['id', 'string', 'generated', 'Stable identity when groups reorder'],
              ['label', 'string', '—', 'Column label for this region'],
              ['deck', 'Deck', 'inherited', 'Overrides the row deck'],
              ['sequence', 'Sequence', 'inherited', 'Overrides the row sequence'],
              ['variant', 'Variant', 'inherited', 'Overrides the row variant'],
              ['className', 'string', '—', 'Inherits into glyphs'],
            ]}
          />
          <ApiTable
            caption="Cell / WideCell"
            rows={[
              ['children', 'string | number', '—', 'Displayed graphemes. WideCell uses two'],
              ['deck', 'Deck', 'inherited', 'Overrides the group or row deck'],
              ['sequence', 'Sequence', 'inherited', 'Overrides the group or row sequence'],
              ['className', 'string', '—', 'Size and other cell-level styles'],
            ]}
          />
          <ApiTable
            caption="createDeck"
            rows={[
              ['characters', 'string | string[]', '—', 'Stops. Strings split by grapheme'],
              ['variants', 'Variant[]', "['white']", 'Repeats the stops per variant'],
            ]}
          />
          <ApiTable
            caption="riffle / cascade"
            rows={[
              ['riffleMs', 'number', '36', 'Riffle pitch duration'],
              ['startSpreadMs', 'number', '480', 'Riffle start window across the board'],
              ['pitchMs', 'number', '52', 'Cascade pitch duration'],
              ['rowDelayMs', 'number', '150', 'Cascade delay between rows'],
              ['withinRowJitterMs', 'number', '16', 'Cascade start jitter inside a row'],
              ['maximumConcurrentCassettes', 'number', '32', 'Cascade concurrency cap'],
              ['cadenceVariationPct', 'number', '4 / 6', 'Per-cassette timing noise'],
              ['finalSettleMs', 'number', '260', 'Settle after the last pitch'],
              ['finalReboundDeg', 'number', '2', 'Settle rebound angle'],
            ]}
          />
          <ApiTable
            caption="mechanicalSound"
            rows={[
              ['bank', 'SoundBank', '—', 'clicks and settles URL lists'],
              ['enabled', 'boolean', 'true', 'Connect or disconnect the engine'],
              ['volume', 'number', '0.58', 'Master level'],
            ]}
          />
        </DocSection>
          </main>
        </div>
    </SiteFrame>
  )
}
