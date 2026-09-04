import * as Flapkit from '@thecuvii/flapkit'
import { useClipboard } from 'foxact/use-clipboard'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from 'react'
import { TextMorph } from 'torph/react'
import { CassettePreview } from '../../src/render/cassette-preview'
import { docsCode, type HighlightedDocsCode } from './docs-code'
import { Exhibit, SiteFrame, StreamlineBlockArrowheadsLeft } from './site-chrome'

const navigation = [
  {
    label: 'Start',
    items: [['Quick start', 'quick-start']],
  },
  {
    label: 'Guides',
    items: [
      ['How it works', 'how-it-works'],
      ['Composition', 'composition'],
      ['Decks', 'decks'],
      ['Looks', 'looks'],
      ['Motion', 'motion'],
      ['Sound', 'sound'],
    ],
  },
  {
    label: 'Reference',
    items: [['API', 'api']],
  },
] as const

const sectionMeta = [
  { id: 'quick-start', index: '01', title: 'Quick start' },
  { id: 'how-it-works', index: '02', title: 'How it works' },
  { id: 'composition', index: '03', title: 'Composition' },
  { id: 'decks', index: '04', title: 'Decks' },
  { id: 'looks', index: '05', title: 'Looks' },
  { id: 'motion', index: '06', title: 'Motion' },
  { id: 'sound', index: '07', title: 'Sound' },
  { id: 'api', index: '08', title: 'API' },
] as const

const sectionIds = sectionMeta.map((section) => section.id)
const lookNames = ['airport', 'industrial'] as const
type LookName = (typeof lookNames)[number]

const localDeck = Flapkit.createDeck(' 東京大阪成田羽田出発到着搭乗')
const wideDeck = Flapkit.createDeck(['  ', '14', '05', '55', '30'])
const principleDeck: Flapkit.Deck = Flapkit.createDeck(
  ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-./:深圳香港東京紐約延誤取消',
).map((position) => ({
  ...position,
  variant: 'AEIOU延誤'.includes(position.character)
    ? 'yellow'
    : 'RST取消'.includes(position.character)
      ? 'orange'
      : 'white',
}))

const departureFlightDeck = Flapkit.createDeck(['  ', 'CX', 'NH', 'UA', 'KA'])
const departureDestDeck = Flapkit.createDeck(' 深圳香港東京紐約')
// createDeck only puts blanks on white; colored STATUS rows still need pads.
const departureStatusDeck: Flapkit.Deck = [
  ...Flapkit.createDeck(' ABCDEFGHIJKLMNOPQRSTUVWXYZ延誤取消', ['white', 'yellow', 'orange']),
  { character: ' ', variant: 'yellow' },
  { character: ' ', variant: 'orange' },
]

const departureRows = [
  {
    id: 'CX',
    flight: 'CX',
    time: '08:40',
    dest: '深圳',
    status: 'ON TIME',
    statusVariant: 'white' as const,
    gate: 'A12',
  },
  {
    id: 'NH',
    flight: 'NH',
    time: '14:05',
    dest: '東京',
    status: 'BOARDING',
    statusVariant: 'white' as const,
    gate: 'B07',
    highlighted: true,
  },
  {
    id: 'UA',
    flight: 'UA',
    time: '16:30',
    dest: '紐約',
    status: '延誤',
    statusVariant: 'yellow' as const,
    gate: 'C21',
  },
  {
    id: 'KA',
    flight: 'KA',
    time: '19:55',
    dest: '香港',
    status: '取消',
    statusVariant: 'orange' as const,
    gate: 'D04',
  },
] as const

function cells(text: string, count: number, deck?: Flapkit.Deck) {
  return Array.from({ length: count }, (_, index) => (
    <Flapkit.Cell key={index} deck={deck}>
      {Array.from(text)[index] ?? ' '}
    </Flapkit.Cell>
  ))
}

function Logo() {
  return (
    <a className="logo" href="#quick-start" aria-label="Flapkit documentation home">
      <span aria-hidden="true">F</span>
      <strong>Flapkit</strong>
    </a>
  )
}

function GithubMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" {...props}>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
      />
    </svg>
  )
}

function CodeBlock({ html, source }: { html: string; source: string }) {
  const { copied, copy } = useClipboard({ timeout: 1600 })
  const copySource = useCallback(() => {
    void copy(source)
  }, [copy, source])

  return (
    <div className="code-block" role="region" aria-label="Code example">
      <button
        type="button"
        className="code-block-copy"
        aria-live="polite"
        onClick={copySource}
      >
        <TextMorph as="span" numbers={false}>
          {copied ? 'Copied' : 'Copy'}
        </TextMorph>
      </button>
      <div
        className="code-block-body"
        tabIndex={0}
        // Shiki escapes source code before producing this trusted HTML.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

type SectionId = (typeof sectionIds)[number]

let activeSectionId: SectionId = 'quick-start'
const activeSectionListeners = new Set<() => void>()

function subscribeActiveSection(onStoreChange: () => void) {
  activeSectionListeners.add(onStoreChange)
  return () => {
    activeSectionListeners.delete(onStoreChange)
  }
}

function getActiveSectionId() {
  return activeSectionId
}

function setActiveSectionId(id: SectionId) {
  if (activeSectionId === id) return
  activeSectionId = id
  for (const listener of activeSectionListeners) listener()
}

function DocsNav() {
  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null)
    if (sections.length === 0) return

    const ratios = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target.id, entry.intersectionRatio)
        const next = [...ratios.entries()].sort((left, right) => right[1] - left[1])[0]
        if (!next || next[1] <= 0) return
        setActiveSectionId(next[0] as SectionId)
      },
      { rootMargin: '-18% 0px -58% 0px', threshold: [0, 0.16, 0.4, 0.7] },
    )
    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <nav aria-label="Documentation">
      {navigation.map((group) => (
        <div key={group.label} className="nav-group">
          <p>{group.label}</p>
          {group.items.map(([label, id]) => (
            <DocsNavLink key={id} href={id} label={label} />
          ))}
        </div>
      ))}
    </nav>
  )
}

function DocsNavLink({ href, label }: { href: SectionId; label: string }) {
  const isActive = useSyncExternalStore(
    subscribeActiveSection,
    () => getActiveSectionId() === href,
    () => href === 'quick-start',
  )

  return (
    <a
      href={`#${href}`}
      className={isActive ? 'is-active' : undefined}
      aria-current={isActive ? 'location' : undefined}
    >
      {label}
    </a>
  )
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
            <StreamlineBlockArrowheadsLeft className="choice-switch-mark" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}

function DepartureBoard({ look, motion }: { look: LookName; motion: 'cascade' | 'riffle' }) {
  return (
    <div className={`quick-start-board-slot flapkit-${look}`}>
      <div className="quick-start-board-scale">
        <Flapkit.Root
          key={motion}
          motion={motion === 'cascade' ? Flapkit.cascade() : Flapkit.riffle()}
        >
          <Flapkit.Board aria-label="Airport departures" className={`flapkit-${look} preview-board`}>
            <Flapkit.Header>Departures</Flapkit.Header>
            {departureRows.map((row) => (
              <Flapkit.Row key={row.id} highlighted={row.highlighted} id={row.id}>
                <Flapkit.Group deck={departureFlightDeck} id="flight" label="FLIGHT">
                  <Flapkit.WideCell>{row.flight}</Flapkit.WideCell>
                </Flapkit.Group>
                <Flapkit.Group id="time" label="TIME">
                  {cells(row.time, 5)}
                </Flapkit.Group>
                <Flapkit.Group deck={departureDestDeck} id="dest" label="DEST">
                  {cells(row.dest, 2, departureDestDeck)}
                </Flapkit.Group>
                <Flapkit.Group
                  deck={departureStatusDeck}
                  id="status"
                  label="STATUS"
                  variant={row.statusVariant}
                >
                  {cells(row.status, 8, departureStatusDeck)}
                </Flapkit.Group>
                <Flapkit.Group id="gate" label="GATE">
                  {cells(row.gate, 3)}
                </Flapkit.Group>
              </Flapkit.Row>
            ))}
          </Flapkit.Board>
        </Flapkit.Root>
      </div>
    </div>
  )
}

function QuickStartPreview() {
  const [look, setLook] = useState<LookName>('airport')
  const [motion, setMotion] = useState<'cascade' | 'riffle'>('riffle')

  return (
    <Exhibit
      look={look}
      motion={motion}
      lookOptions={lookNames}
      motionOptions={['riffle', 'cascade'] as const}
      onLookChange={setLook}
      onMotionChange={setMotion}
    >
      <DepartureBoard look={look} motion={motion} />
    </Exhibit>
  )
}

const anatomyParts = [
  {
    id: 'root',
    name: 'Root',
    note: 'Motion and optional sound',
    selector: '[data-anatomy="root"]',
  },
  {
    id: 'board',
    name: 'Board',
    note: 'Framed display with grain, labels, and optional header',
    selector: '[data-slot="split-flap-board"]',
    cover: '.flapkit-board-header, .flapkit-grid',
  },
  {
    id: 'grid',
    name: 'Grid',
    note: 'Frameless display with the same cassette grid',
    selector: '.flapkit-grid',
  },
  {
    id: 'header',
    name: 'Header',
    note: 'Optional board title. Board only',
    selector: '.flapkit-board-header',
  },
  {
    id: 'row',
    name: 'Row',
    note: (
      <>
        One horizontal record. <code>highlighted</code> lifts a row
      </>
    ),
    selector: '[data-split-flap-row]',
  },
  {
    id: 'group',
    name: 'Group',
    note: 'Optional adjacent region with shared settings',
    selector: '[data-split-flap-group]',
  },
  {
    id: 'cell',
    name: 'Cell / WideCell',
    note: 'One independently driven cassette. A group cannot mix widths',
    selector: '[data-slot="cassette"]',
    firstOnly: true,
  },
] as const

type AnatomyPartId = (typeof anatomyParts)[number]['id']

type GuideBox = {
  height: number
  left: number
  top: number
  width: number
}

function measureAnatomyTargets(
  root: HTMLElement,
  selector: string,
  firstOnly = false,
): GuideBox[] {
  const rootBox = root.getBoundingClientRect()
  const nodes = firstOnly
    ? root.querySelector<HTMLElement>(selector)
    : root.querySelectorAll<HTMLElement>(selector)
  const elements = nodes instanceof Element ? [nodes] : nodes ? [...nodes] : []

  return elements.map((element) => {
    const box = element.getBoundingClientRect()
    return {
      top: box.top - rootBox.top + root.scrollTop,
      left: box.left - rootBox.left + root.scrollLeft,
      width: box.width,
      height: box.height,
    }
  })
}

function anatomyVeilMask(boxes: readonly GuideBox[]) {
  return {
    WebkitMaskImage: ['linear-gradient(#000 0 0)', ...boxes.map(() => 'linear-gradient(#000 0 0)')].join(
      ', ',
    ),
    maskImage: ['linear-gradient(#000 0 0)', ...boxes.map(() => 'linear-gradient(#000 0 0)')].join(', '),
    WebkitMaskSize: ['100% 100%', ...boxes.map((box) => `${box.width}px ${box.height}px`)].join(', '),
    maskSize: ['100% 100%', ...boxes.map((box) => `${box.width}px ${box.height}px`)].join(', '),
    WebkitMaskPosition: ['0 0', ...boxes.map((box) => `${box.left}px ${box.top}px`)].join(', '),
    maskPosition: ['0 0', ...boxes.map((box) => `${box.left}px ${box.top}px`)].join(', '),
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  } as const
}

function AnatomyGuides({
  boxes,
  covers,
}: {
  boxes: readonly GuideBox[]
  covers?: readonly GuideBox[]
}) {
  const xs = [...new Set(boxes.flatMap((box) => [box.left, box.left + box.width]))]
  const ys = [...new Set(boxes.flatMap((box) => [box.top, box.top + box.height]))]

  return (
    <div className="anatomy-guides" aria-hidden="true">
      <span className="anatomy-guide-veil" style={anatomyVeilMask(boxes)} />
      {(covers ?? []).map((box, index) => (
        <span
          key={`cover:${index}`}
          className="anatomy-guide-cover"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
          }}
        />
      ))}
      {ys.map((top) => (
        <span key={`h:${top}`} className="anatomy-guide-h" style={{ top }} />
      ))}
      {xs.map((left) => (
        <span key={`v:${left}`} className="anatomy-guide-v" style={{ left }} />
      ))}
      {boxes.map((box, index) => (
        <span
          key={`box:${index}`}
          className="anatomy-guide-box"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
          }}
        />
      ))}
    </div>
  )
}

function CompositionAnatomy() {
  const stageRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<AnatomyPartId | null>(null)
  const [boxes, setBoxes] = useState<GuideBox[]>([])
  const [covers, setCovers] = useState<GuideBox[]>([])

  useLayoutEffect(() => {
    const root = stageRef.current
    const part = anatomyParts.find((item) => item.id === hover)
    if (!root || !part) {
      setBoxes([])
      setCovers([])
      return
    }

    const update = () => {
      setBoxes(measureAnatomyTargets(root, part.selector, 'firstOnly' in part && part.firstOnly))
      setCovers('cover' in part ? measureAnatomyTargets(root, part.cover) : [])
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(root)
    for (const element of root.querySelectorAll(part.selector)) {
      observer.observe(element)
    }
    if ('cover' in part) {
      for (const element of root.querySelectorAll(part.cover)) {
        observer.observe(element)
      }
    }
    const stage = root.closest('.exhibit-stage')
    stage?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      stage?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [hover])

  return (
    <>
      <Exhibit look="airport" motion="riffle" deck="A–Z">
        <div className="composition-preview" ref={stageRef}>
          <div data-anatomy="root">
            <Flapkit.Root motion={Flapkit.riffle()}>
              <Flapkit.Board className="flapkit-airport preview-board">
                <Flapkit.Header>Departures</Flapkit.Header>
                <Flapkit.Row highlighted id="LH401">
                  <Flapkit.Group label="STATUS">{cells('BOARDING', 8)}</Flapkit.Group>
                  <Flapkit.Group label="GATE">{cells('A12', 3)}</Flapkit.Group>
                </Flapkit.Row>
              </Flapkit.Board>
            </Flapkit.Root>
          </div>
          {boxes.length > 0 ? <AnatomyGuides boxes={boxes} covers={covers} /> : null}
        </div>
      </Exhibit>
      <ul className="anatomy" aria-label="Flapkit component tree">
        {anatomyParts.map((item) => (
          <li
            key={item.id}
            data-active={hover === item.id ? '' : undefined}
            onPointerEnter={() => setHover(item.id)}
            onPointerLeave={() => setHover((current) => (current === item.id ? null : current))}
          >
            <code>{item.name}</code>
            <span>{item.note}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function StatusBoard({
  look = 'airport',
  motion = 'riffle',
}: {
  look?: LookName
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
  const lastPitchIndex = principleDeck.length - 1
  const firstCharacterProgress = 1 / lastPitchIndex
  const [progress, setProgress] = useState(firstCharacterProgress)
  const [isPlaying, setIsPlaying] = useState(false)
  const [look, setLook] = useState<LookName>('airport')
  const [motionMode, setMotionMode] = useState<'cascade' | 'riffle'>('cascade')
  const playbackFrame = useRef<number | null>(null)
  const progressRef = useRef(progress)
  progressRef.current = progress
  const deckPosition = progress * lastPitchIndex
  const fromIndex = Math.min(principleDeck.length - 2, Math.floor(deckPosition))
  const pitchProgress = deckPosition - fromIndex
  const visibleIndex = Math.min(lastPitchIndex, fromIndex + Number(pitchProgress >= 0.5))
  const visiblePosition = principleDeck[visibleIndex]!

  const cancelPlaybackFrame = () => {
    if (playbackFrame.current !== null) cancelAnimationFrame(playbackFrame.current)
    playbackFrame.current = null
  }

  const stopPlayback = () => {
    cancelPlaybackFrame()
    setIsPlaying(false)
  }

  const playToIndex = (targetIndex: number, fromStart = false) => {
    const targetProgress = targetIndex / lastPitchIndex
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stopPlayback()
      setProgress(targetProgress)
      return
    }

    cancelPlaybackFrame()

    const startPosition = fromStart ? 0 : progressRef.current * lastPitchIndex
    const wraps = targetIndex + 0.02 < startPosition
    const distance = wraps
      ? lastPitchIndex - startPosition + targetIndex
      : Math.max(0, targetIndex - startPosition)

    if (distance < 0.02) {
      setProgress(targetProgress)
      setIsPlaying(false)
      return
    }

    const startedAt = performance.now()
    const duration = distance * (motionMode === 'cascade' ? 95 : 58)
    setIsPlaying(true)

    const advance = (now: number) => {
      const traveled = Math.min(distance, ((now - startedAt) / duration) * distance)
      let nextPosition = startPosition + traveled
      if (wraps && nextPosition >= lastPitchIndex) nextPosition -= lastPitchIndex
      const nextProgress = nextPosition / lastPitchIndex
      progressRef.current = nextProgress
      setProgress(nextProgress)
      if (traveled < distance) {
        playbackFrame.current = requestAnimationFrame(advance)
      } else {
        progressRef.current = targetProgress
        setProgress(targetProgress)
        playbackFrame.current = null
        setIsPlaying(false)
      }
    }
    playbackFrame.current = requestAnimationFrame(advance)
  }

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback()
      return
    }

    playToIndex(lastPitchIndex, progressRef.current >= 1)
  }

  useEffect(
    () => () => {
      if (playbackFrame.current !== null) cancelAnimationFrame(playbackFrame.current)
    },
    [],
  )

  return (
    <div className="principle-demo">
      <aside className="principle-spec">
        <ChoiceSwitch
          label="Look"
          options={lookNames}
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
      </aside>
      <div className="principle-main">
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
        </div>

        <div className="principle-copy">
          <div className="principle-deck" aria-label="Complete Latin and CJK character deck">
            {principleDeck.map(({ character, variant }, index) => (
              <span
                key={`${character}-${index}`}
                data-active={index === visibleIndex || undefined}
                data-variant={variant}
                onClick={() => {
                  playToIndex(index)
                }}
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
          {visiblePosition.character.trim() || 'Blank'} {visibleIndex + 1}/{principleDeck.length}
        </output>
        <div className="principle-controls">
          <div className="principle-controls-bar">
            <input
              id="principle-deck-position"
              type="range"
              min="0"
              max="1000"
              value={Math.round(progress * 1000)}
              style={{ '--fill': `${progress * 100}%` } as CSSProperties}
              onChange={(event) => {
                stopPlayback()
                setProgress(Number(event.currentTarget.value) / 1000)
              }}
              onKeyDown={stopPlayback}
              onPointerDown={stopPlayback}
            />
          </div>
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
      motionOptions={['riffle', 'cascade'] as const}
      onMotionChange={setMotion}
    >
      <StatusBoard motion={motion} />
    </Exhibit>
  )
}

function LooksPreview() {
  const [look, setLook] = useState<LookName>('airport')

  return (
    <Exhibit
      look={look}
      motion="cascade"
      deck="A–Z"
      lookOptions={lookNames}
      onLookChange={setLook}
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

const sidebarCoordText = '22.5431° N\n114.0579° E'
const sidebarPlaceText = 'SHENZHEN,\nCHINA'
const sidebarScrambleGlyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const scrambleStaggerMs = 52
const scrambleWindowMs = 160

function randomScrambleGlyph() {
  return sidebarScrambleGlyphs[Math.floor(Math.random() * sidebarScrambleGlyphs.length)]!
}

function lineColumnCount(fromLines: string[], toLines: string[]) {
  const lineCount = Math.max(fromLines.length, toLines.length)
  let columns = 0
  for (let index = 0; index < lineCount; index += 1) {
    columns = Math.max(columns, (fromLines[index] ?? '').length, (toLines[index] ?? '').length)
  }
  return columns
}

/** One line: lock left of the cursor, flicker a short window, keep the source to the right. */
function scrambleLine(from: string, to: string, elapsed: number) {
  const columns = Math.max(from.length, to.length)
  let next = ''
  for (let col = 0; col < columns; col += 1) {
    const fromGlyph = from[col]
    const toGlyph = to[col]
    const age = elapsed - col * scrambleStaggerMs
    if (age >= scrambleWindowMs) {
      if (toGlyph !== undefined) next += toGlyph
      continue
    }
    if (age >= 0 && (toGlyph !== undefined || fromGlyph !== undefined)) {
      next += randomScrambleGlyph()
      continue
    }
    if (fromGlyph !== undefined) next += fromGlyph
  }
  return next
}

function padLines(lines: string[], columns: number) {
  return lines.map((line) => line.padEnd(columns, ' '))
}

function scrambleToward(fromLines: string[], toLines: string[], elapsed: number) {
  const columns = lineColumnCount(fromLines, toLines)
  const from = padLines(fromLines, columns)
  const to = padLines(toLines, columns)
  const lineCount = Math.max(from.length, to.length)
  let next = ''
  for (let index = 0; index < lineCount; index += 1) {
    if (index > 0) next += '\n'
    next += scrambleLine(from[index] ?? '', to[index] ?? '', elapsed)
  }
  return next
}

function SidebarCoords() {
  const [text, setText] = useState(sidebarCoordText)
  const textRef = useRef(sidebarCoordText)
  const frameRef = useRef<number | null>(null)
  textRef.current = text

  const cancelScramble = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }

  const scrambleTo = (target: string) => {
    cancelScramble()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      textRef.current = target
      setText(target)
      return
    }

    const from = textRef.current
    if (from === target) {
      setText(target)
      return
    }

    const fromLines = from.split('\n')
    const toLines = target.split('\n')
    const startedAt = performance.now()
    const duration = Math.max(0, lineColumnCount(fromLines, toLines) - 1) * scrambleStaggerMs + scrambleWindowMs
    const step = (now: number) => {
      const elapsed = now - startedAt
      if (elapsed >= duration) {
        textRef.current = target
        setText(target)
        frameRef.current = null
        return
      }
      setText(scrambleToward(fromLines, toLines, elapsed))
      frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
  }

  useEffect(() => cancelScramble, [])

  return (
    <p
      className="sidebar-coords"
      aria-label="Made in Shenzhen"
      onPointerEnter={() => scrambleTo(sidebarPlaceText)}
      onPointerLeave={() => scrambleTo(sidebarCoordText)}
    >
      {text}
    </p>
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
        <svg
          className="section-mark"
          aria-hidden="true"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M9 15H0l7-7l-7-7h9l7 7z" />
        </svg>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function DocsPage({ highlightedCode }: { highlightedCode: HighlightedDocsCode }) {
  return (
    <SiteFrame>
      <div className="docs-body">
          <aside className="sidebar">
            <div className="sidebar-inner">
              <Logo />
              <DocsNav />
              <div className="sidebar-stamp">
                <div className="sidebar-stamp-loc">
                  <i className="hatch" aria-hidden="true" />
                  <SidebarCoords />
                </div>
                <div className="sidebar-stamp-meta">
                  <a
                    className="sidebar-version"
                    href="https://github.com/thecuvii/flapkit"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub"
                  >
                    <span aria-hidden="true">0.0.0</span>
                    <GithubMark />
                  </a>
                  <a href="https://x.com/thecuvii" target="_blank" rel="noreferrer">
                    by cuvii
                  </a>
                </div>
              </div>
            </div>
          </aside>

          <main className="docs-well">
        <DocSection id="quick-start" index="01" title="Quick start">
          <p>
            Install Flapkit. React 19 is a peer dependency. Import the structural stylesheet and one
            look; Flapkit does not inject styles at runtime.
          </p>
          <p>
            The preview is a fuller departure board. The snippet below is the smallest first board.
          </p>
          <QuickStartPreview />
          <CodeBlock html={highlightedCode.quickStart} source={docsCode.quickStart.code} />
        </DocSection>

        <DocSection id="how-it-works" index="02" title="How it works" className="principle-section">
          <p>
            Scrub one cassette through its full deck. Each step is one pitch — the leaf that is
            turning, while the rest stay packed.
          </p>
          <FlapPrinciple />
        </DocSection>

        <DocSection id="composition" index="03" title="Composition">
          <p>
            Root compiles a declarative board and hands animation to a motion adapter. Use a flat
            Row when the whole row shares one label, deck, sequence, and variant. Add Group only when
            adjacent regions need different settings. Give Row and Group stable ids when items can
            reorder so cassette identity survives.
          </p>
          <CompositionAnatomy />
          <p>
            <code>deck</code>, <code>sequence</code>, <code>variant</code>, and <code>label</code>{' '}
            cascade from Row to Group to Cell. Set them on the nearest owner.
          </p>
          <CodeBlock html={highlightedCode.composition} source={docsCode.composition.code} />
        </DocSection>

        <DocSection id="decks" index="04" title="Decks">
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
          <CodeBlock html={highlightedCode.decks} source={docsCode.decks.code} />
        </DocSection>

        <DocSection id="looks" index="05" title="Looks">
          <p>
            Looks are separate CSS subpaths. Put the look class on the Board or Grid styling host.
            Font family, weight, and style inherit from Board, Row, and Group; set size on Cell.
            Ordinary classes and Tailwind utilities work without a Flapkit-specific API. Use{' '}
            <code>data-slot</code> and <code>data-part="face"</code> only for surfaces that
            cannot inherit, such as leaf faces.
          </p>
          <LooksPreview />
          <CodeBlock html={highlightedCode.looks} source={docsCode.looks.code} />
          <CodeBlock html={highlightedCode.looksCss} source={docsCode.looksCss.code} />
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
          <CodeBlock html={highlightedCode.motion} source={docsCode.motion.code} />
        </DocSection>

        <DocSection id="sound" index="07" title="Sound">
          <p>
            Sound is optional and ships without audio assets. Supply click and settle URLs you own,
            then pass <code>{'mechanicalSound({ bank })'}</code> to Root. The React adapter unlocks
            audio on the first pointer or keyboard gesture. <code>SoundEngine</code> is exported
            from the same subpath for non-React wiring.
          </p>
          <CodeBlock html={highlightedCode.sound} source={docsCode.sound.code} />
        </DocSection>

        <DocSection id="api" index="08" title="API">
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
