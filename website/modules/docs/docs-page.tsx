'use client'

import * as Flapkit from '@thecuvii/flapkit'
import { mechanicalSound } from '@thecuvii/flapkit/sound'
import { useClipboard } from 'foxact/use-clipboard'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type SVGProps,
} from 'react'
import { TextMorph } from 'torph/react'
import { CassettePreview } from '../../../src/render/cassette-preview'
import {
  docsCode,
  looksCode,
  looksCssCode,
  looksLiveValue,
  looksRanges,
  looksTabs,
  quickStartCode,
  quickStartLiveValue,
  quickStartRanges,
  type HighlightedDocsCode,
  type LooksRangeId,
  type LooksTab,
  type QuickStartRangeId,
  type QuickStartSnippetOptions,
  type QuickStartToken,
} from './docs-code'
import { cn } from 'cn'
import { Exhibit, ExhibitTabList, InstrumentField, SiteFrame, StreamlineBlockArrowheadsLeft } from '../site'
import { LooksPlayground, type LooksPlaygroundStyles } from './looks-playground'

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

function PreviewScale({
  children,
  fill = 4,
  groups = 1,
  tracks,
}: {
  children: ReactNode
  fill?: number
  groups?: number
  tracks: number
}) {
  return (
    <div
      className="flapkit-airport relative overflow-visible"
      style={{
        width: `calc((${tracks} * var(--flapkit-cell-track) + ${Math.max(0, groups - 1)} * 0.8 * var(--flapkit-board-unit)) * ${fill})`,
        height: `calc(var(--flapkit-cell-height) * ${fill})`,
      }}
    >
      <div
        className="absolute top-0 left-1/2 w-max origin-top"
        style={{ transform: `translateX(-50%) scale(${fill})` }}
      >
        {children}
      </div>
    </div>
  )
}

function cells(text: string, count: number, deck?: Flapkit.Deck, className?: string) {
  return Array.from({ length: count }, (_, index) => (
    <Flapkit.Cell key={index} deck={deck} className={className}>
      {Array.from(text)[index] ?? ' '}
    </Flapkit.Cell>
  ))
}

const codeBlockClass =
  'relative my-u4 max-w-full max-[560px]:w-[calc(100%+20px)] [&_.shiki]:m-0 [&_.shiki]:w-max [&_.shiki]:min-w-full [&_.shiki]:bg-transparent! [&_.shiki]:p-0 [&_.shiki]:text-left'
const codeBlockBodyClass =
  'overflow-x-auto [overscroll-behavior-x:contain] [tab-size:2] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ink [&_code]:block [&_code]:p-0 [&_code]:font-mono [&_code]:text-xs [&_code]:leading-[1.7]'
const codeBlockLiveClass =
  '[&_code]:min-h-[calc(var(--qs-code-lines)*1.7em)] [&_[torph-root]]:inline [&_[torph-root]]:align-baseline [&_[torph-root]:has([torph-id=empty]:only-child)]:hidden'
const apiCellClass =
  'border-b border-dashed border-rule py-[9px] pr-3 pl-0 text-left align-top [overflow-wrap:break-word]'
const optionRowClass =
  'grid grid-cols-[minmax(160px,0.7fr)_minmax(0,1.3fr)] gap-5 border-b border-dashed border-rule py-3.5 max-[560px]:grid-cols-1 max-[560px]:gap-[9px] [&_code]:font-mono [&_code]:text-xs [&_code]:font-[650] [&_code]:text-ink [&_code]:[overflow-wrap:anywhere]'
const docSectionClass = cn(
  'scroll-mt-4 py-[var(--section-space)] first:pt-[calc(var(--u)/2)] last:pb-[calc(var(--u)*2)] max-[560px]:py-11 max-[560px]:last:pb-20',
  '[&>:not(h2):not(.exhibit):not(.principle-demo)]:mx-u4',
  '[&>p]:mb-u4 [&>p]:text-base [&>p]:font-[430] [&>p]:tracking-[-0.006em] [&>p]:leading-u4 [&>p]:text-muted [&>p]:text-pretty',
  '[&>p+p]:mt-u4',
  '[&_p_code]:px-0.5 [&_p_code]:font-mono [&_p_code]:text-[0.86em] [&_p_code]:text-ink',
  '[&_a]:text-link [&_a]:underline [&_a]:underline-offset-[3px] [&_a]:hover:text-ink',
)

function Logo() {
  return (
    <a
      className="mb-9 inline-flex items-center gap-[9px] text-[13px] tracking-[0.02em] text-ink max-[860px]:mb-0"
      href="#quick-start"
      aria-label="Flapkit documentation home"
    >
      <span
        aria-hidden="true"
        className="grid size-[22px] place-items-center bg-ink font-mono text-xs font-bold text-on-ink"
      >
        F
      </span>
      <strong className="max-[860px]:hidden">Flapkit</strong>
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

function CodeCopyButton({ source }: { source: string }) {
  const { copied, copy } = useClipboard({ timeout: 1600 })
  const copySource = useCallback(() => {
    void copy(source)
  }, [copy, source])

  return (
    <button
      type="button"
      className="absolute top-0 right-0 z-1 min-h-8 cursor-pointer touch-manipulation border-0 bg-transparent py-1.5 pr-0 pl-2.5 font-mono text-[11px] font-[620] tracking-[0.04em] text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ink"
      aria-live="polite"
      onClick={copySource}
    >
      <TextMorph as="span">
        {copied ? 'Copied' : 'Copy'}
      </TextMorph>
    </button>
  )
}

function CodeBlock({ html, source }: { html: string; source: string }) {
  return (
    <div className={codeBlockClass} role="region" aria-label="Code example">
      <CodeCopyButton source={source} />
      <div
        className={codeBlockBodyClass}
        tabIndex={0}
        // Shiki escapes source code before producing this trusted HTML.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function tokenOverlapsRange(token: QuickStartToken, start: number, end: number) {
  return token.offset < end && token.offset + token.content.length > start
}

function AnimatedCodeWord({
  color,
  id,
  options,
}: {
  color?: string
  id: QuickStartRangeId
  options: QuickStartSnippetOptions
}) {
  return (
    <span style={{ color }}>
      <TextMorph as="span" duration={400} scale={false} style={{ verticalAlign: 'baseline' }}>
        {quickStartLiveValue(id, options)}
      </TextMorph>
    </span>
  )
}

function QuickStartSnippet({
  lines,
  options,
}: {
  lines: readonly QuickStartToken[][]
  options: QuickStartSnippetOptions
}) {
  const headerRange = quickStartRanges.find((range) => range.id === 'header')

  return (
    <pre className="shiki">
      <code>
        {lines.map((line, lineIndex) => {
          const isHeaderLine = Boolean(
            headerRange && line.some((token) => tokenOverlapsRange(token, headerRange.start, headerRange.end)),
          )
          const hideHeaderLine = isHeaderLine && !(options.board && options.header)

          return (
            <span
              key={line[0]?.offset ?? `blank-${lineIndex}`}
              hidden={hideHeaderLine || undefined}
            >
              {line.map((token) => {
                const animated = quickStartRanges.find((range) =>
                  tokenOverlapsRange(token, range.start, range.end),
                )
                if (!animated) {
                  return (
                    <span key={token.offset} style={{ color: token.color }}>
                      {token.content}
                    </span>
                  )
                }
                if (
                  token.offset > animated.start ||
                  token.offset + token.content.length <= animated.start
                ) {
                  return null
                }

                const before = token.content.slice(0, animated.start - token.offset)
                const after = token.content.slice(animated.end - token.offset)
                const valueToken = line.find(
                  ({ offset }) => offset >= animated.start && offset < animated.end,
                )
                return (
                  <span key={token.offset} style={{ color: token.color }}>
                    {before}
                    <AnimatedCodeWord
                      color={valueToken?.color ?? token.color}
                      id={animated.id}
                      options={options}
                    />
                    {after}
                  </span>
                )
              })}
              {'\n'}
            </span>
          )
        })}
      </code>
    </pre>
  )
}

function TorphCodeBlock({
  lines,
  options,
  source,
}: {
  lines: readonly QuickStartToken[][]
  options: QuickStartSnippetOptions
  source: string
}) {
  return (
    <div className={codeBlockClass} role="region" aria-label="Code example">
      <CodeCopyButton source={source} />
      <div
        className={cn(codeBlockBodyClass, codeBlockLiveClass)}
        style={{ '--qs-code-lines': lines.length } as CSSProperties}
        tabIndex={0}
      >
        <QuickStartSnippet lines={lines} options={options} />
      </div>
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
    <nav
      aria-label="Documentation"
      className="grid min-w-0 gap-[22px] max-[860px]:flex max-[860px]:gap-4 max-[860px]:overflow-x-auto max-[860px]:pr-7 max-[860px]:[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] max-[860px]:[-webkit-mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] max-[860px]:[overscroll-behavior-x:contain] max-[860px]:[scrollbar-width:none] max-[860px]:[&::-webkit-scrollbar]:hidden"
    >
      {navigation.map((group) => (
        <div key={group.label} className="grid min-w-0 gap-0.5 max-[860px]:contents">
          <p className="mb-1 text-[10px] font-[650] tracking-[0.08em] text-[color-mix(in_oklch,var(--faint)_62%,var(--paper))] uppercase max-[860px]:hidden">
            {group.label}
          </p>
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
      className={cn(
        'grid w-fit max-w-full grid-cols-[8px_minmax(0,1fr)] items-center gap-2 py-1 text-xs font-medium tracking-[0.02em] text-faint [overflow-wrap:anywhere] hover:text-ink',
        'max-[860px]:inline-flex max-[860px]:shrink-0 max-[860px]:py-[5px]',
        isActive && 'text-ink',
      )}
      aria-current={isActive ? 'location' : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          'justify-self-center max-[860px]:hidden',
          isActive ? 'size-1.5 rounded-none bg-safety' : 'size-1 rounded-full bg-[oklch(0.5_0_0)]',
        )}
      />
      {label}
    </a>
  )
}

function ChoiceSwitch<T extends string>({
  hangLabel,
  label,
  options,
  value,
  onChange,
}: {
  hangLabel?: boolean
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className={cn('grid', hangLabel && 'relative')}>
      <span
        className={cn(
          'mb-1.5 block text-end font-mono text-[10px] font-[620] leading-none tracking-[0.06em] text-ink uppercase opacity-40 max-[860px]:text-start',
          hangLabel && 'absolute right-0 bottom-full max-[860px]:static',
        )}
      >
        {label}
      </span>
      <div
        className="grid grid-cols-1 justify-items-end max-[860px]:justify-items-start"
        role="group"
        aria-label={label}
      >
        {options.map((option) => {
          const pressed = value === option
          return (
            <button
              key={option}
              type="button"
              aria-pressed={pressed}
              className={cn(
                'relative inline-flex min-h-0 min-w-0 cursor-pointer items-center justify-end overflow-visible border-0 bg-transparent py-1 font-mono text-[10px] font-semibold tracking-[0.06em] uppercase',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                pressed ? 'text-ink' : 'text-muted',
              )}
              onClick={() => onChange(option)}
            >
              {option}
              <StreamlineBlockArrowheadsLeft
                className={cn(
                  'absolute top-1/2 left-[calc(100%+4px)] block size-[7px] shrink-0 -translate-y-1/2 text-flare',
                  pressed ? 'visible' : 'invisible',
                )}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DepartureBoard({
  look,
  motion,
  frame,
  header,
}: {
  look: LookName
  motion: 'cascade' | 'riffle'
  frame: boolean
  header: boolean
}) {
  const Frame = frame ? Flapkit.Board : Flapkit.Grid
  const rows = departureRows.map((row) => (
    <Flapkit.Row key={row.id} highlighted={'highlighted' in row && row.highlighted} id={row.id}>
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
  ))

  return (
    <div
      className={`quick-start-board-slot flapkit-${look}`}
      data-frame={frame ? 'on' : 'off'}
      data-header={header ? 'on' : 'off'}
    >
      <div className="quick-start-board-scale">
        <Flapkit.Root
          key={motion}
          motion={motion === 'cascade' ? Flapkit.cascade() : Flapkit.riffle()}
          sound={mechanicalSound({ bank: docsSoundBank })}
        >
          <Frame aria-label="Airport departures" className={cn(`flapkit-${look}`, 'w-max')}>
            {header ? <Flapkit.Header>Departures</Flapkit.Header> : null}
            {rows}
          </Frame>
        </Flapkit.Root>
      </div>
    </div>
  )
}

const onOffOptions = ['on', 'off'] as const

function QuickStartPreview({ lines }: { lines: readonly QuickStartToken[][] }) {
  const [look, setLook] = useState<LookName>('airport')
  const [motion, setMotion] = useState<'cascade' | 'riffle'>('riffle')
  const [board, setBoard] = useState(true)
  const [header, setHeader] = useState(true)
  const showHeader = board && header
  const options = { look, motion, board, header: showHeader }
  const source = quickStartCode(options)

  return (
    <>
      <Exhibit
        look={look}
        motion={motion}
        lookOptions={lookNames}
        motionOptions={['riffle', 'cascade'] as const}
        onLookChange={setLook}
        onMotionChange={setMotion}
        stage="quick-start"
        extras={[
          <InstrumentField
            key="board"
            label="BOARD"
            value={board ? 'on' : 'off'}
            options={onOffOptions}
            onChange={(value) => {
              const next = value === 'on'
              setBoard(next)
              if (!next) setHeader(false)
            }}
          />,
          <InstrumentField
            key="header"
            label="HEADER"
            value={showHeader ? 'on' : 'off'}
            options={onOffOptions}
            onChange={(value) => {
              if (value === 'on') {
                setBoard(true)
                setHeader(true)
                return
              }
              setHeader(false)
            }}
          />,
        ]}
      >
        <DepartureBoard look={look} motion={motion} frame={board} header={showHeader} />
      </Exhibit>
      <TorphCodeBlock lines={lines} options={options} source={source} />
    </>
  )
}

const anatomyParts = [
  { id: 'root', name: 'Root', note: 'Motion and optional sound' },
  {
    id: 'board',
    name: 'Board',
    note: 'Framed display with grain, labels, and optional header',
  },
  {
    id: 'grid',
    name: 'Grid',
    note: 'Frameless display with the same cassette grid',
  },
  {
    id: 'header',
    name: 'Header',
    note: 'Optional board title. Board only',
  },
  {
    id: 'row',
    name: 'Row',
    note: 'One horizontal record',
  },
  {
    id: 'group',
    name: 'Group',
    note: 'Optional adjacent region with shared settings',
  },
  {
    id: 'cell',
    name: 'Cell / WideCell',
    note: 'One independently driven cassette. A group cannot mix widths',
  },
] as const

type AnatomyPartId = (typeof anatomyParts)[number]['id']

function CompositionAnatomy() {
  const [hover, setHover] = useState<AnatomyPartId | null>(null)

  return (
    <>
      <Exhibit look="airport" motion="riffle" deck="custom" stage="quick-start">
        <div
          className={cn('composition-preview', 'relative grid w-full')}
          data-explode={hover === 'row' || hover === 'group' || hover === 'cell' ? hover : undefined}
        >
          <DepartureBoard look="airport" motion="riffle" frame header />
        </div>
      </Exhibit>
      <ul className="mt-7 grid list-none gap-0 p-0" aria-label="Flapkit component tree">
        {anatomyParts.map((item) => (
          <li
            key={item.id}
            className="group grid grid-cols-[148px_minmax(0,1fr)] items-baseline gap-5 border-b border-dashed border-rule py-2.5 max-[560px]:grid-cols-1 max-[560px]:gap-1.5"
            data-active={hover === item.id ? '' : undefined}
            onPointerEnter={() => setHover(item.id)}
            onPointerLeave={() => setHover((current) => (current === item.id ? null : current))}
          >
            <code className="font-mono text-xs font-[650] group-hover:text-flare group-data-active:text-flare">
              {item.name}
            </code>
            <span className="text-[13px] leading-normal text-muted">{item.note}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

const docsSoundBank = {
  clicks: ['/audio/click.wav'],
  settles: ['/audio/settle.wav'],
} as const

const soundPhrases = [
  ['FLAPKIT', 'READY'],
  ['BOARDING', 'ON TIME'],
] as const

function StatusBoard({
  look = 'airport',
  motion = 'riffle',
  custom = false,
  rows,
  sound,
}: {
  look?: LookName
  motion?: 'cascade' | 'riffle'
  custom?: boolean
  rows?: readonly [string, string]
  sound?: ReactElement
}) {
  const glyphClass = custom ? 'text-xl font-bold' : undefined
  const [top, bottom] = rows ?? ['FLAPKIT', 'READY']

  return (
    <Flapkit.Root
      key={motion}
      motion={motion === 'cascade' ? Flapkit.cascade() : Flapkit.riffle()}
      sound={sound}
    >
      <Flapkit.Board
        aria-label="Package status"
        className={cn(`flapkit-${look}`, 'w-max', custom && 'operations-board')}
      >
        <Flapkit.Row className={custom ? 'font-mono' : undefined} label="STATUS">
          {cells(top, 8, undefined, glyphClass)}
        </Flapkit.Row>
        <Flapkit.Row className={custom ? 'font-mono' : undefined} label="STATUS">
          {cells(bottom, 8, undefined, glyphClass)}
        </Flapkit.Row>
      </Flapkit.Board>
    </Flapkit.Root>
  )
}

function SoundPreview() {
  const [motion, setMotion] = useState<'cascade' | 'riffle'>('riffle')
  const [phrase, setPhrase] = useState(0)
  const [played, setPlayed] = useState(false)
  const prepareSound = useRef<(() => Promise<boolean>) | null>(null)

  const playFlaps = () => {
    setPlayed(true)
    void prepareSound.current?.().then((ready) => {
      if (!ready) return
      setPhrase((current) => (current === 0 ? 1 : 0))
    })
  }

  return (
    <Exhibit
      motion={motion}
      motionOptions={['riffle', 'cascade'] as const}
      onMotionChange={setMotion}
      extras={[<InstrumentField key="sound" label="SOUND" value="mechanical" />]}
      stage="board"
    >
      <div className="grid w-full place-items-center gap-6">
        <StatusBoard
          motion={motion}
          rows={soundPhrases[phrase]}
          sound={mechanicalSound({ bank: docsSoundBank, prepareRef: prepareSound })}
        />
        <button
          type="button"
          className="relative z-1 min-h-11 cursor-pointer touch-manipulation border border-rule-strong bg-transparent px-3 font-mono text-[10px] font-semibold tracking-[0.06em] text-ink uppercase hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          onClick={playFlaps}
        >
          {played ? 'Replay flap sounds' : 'Play flap sounds'}
        </button>
      </div>
    </Exhibit>
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
    <div className={cn('principle-demo', 'mt-u4 grid grid-cols-subgrid max-[860px]:block')}>
      <aside
        className={cn(
          'col-start-1 mt-[calc(var(--u)/2)] mr-u4 grid w-auto max-w-[calc(var(--lead)-var(--u4))] justify-self-end self-start gap-u4',
          'max-[860px]:mt-0 max-[860px]:mr-0 max-[860px]:mb-u4 max-[860px]:max-w-none max-[860px]:grid-cols-[repeat(2,max-content)] max-[860px]:justify-self-start max-[860px]:gap-6',
        )}
      >
        <ChoiceSwitch
          hangLabel
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
      <div className="col-start-2 min-w-0">
        <div
          className={cn(
            'grid min-h-[460px] grid-cols-[minmax(230px,0.9fr)_minmax(280px,1.1fr)] items-start gap-[clamp(32px,6vw,58px)] pt-[calc(var(--u)/2)] pb-u',
            'max-[720px]:min-h-0 max-[720px]:grid-cols-1 max-[720px]:gap-10 max-[720px]:py-[42px]',
          )}
        >
          <div className="grid justify-items-center">
            <div className="grid h-[290px] w-[176px] justify-items-center content-start">
              <CassettePreview
                className={cn(`flapkit-${look}`, 'principle-cassette')}
                deck={principleDeck}
                fromIndex={fromIndex}
                mode={motionMode}
                progress={pitchProgress}
              />
            </div>
          </div>

          <div className="max-w-[360px] max-[720px]:justify-self-center max-[720px]:text-center">
            <div
              className="grid grid-cols-11 gap-[3px]"
              aria-label="Complete Latin and CJK character deck"
            >
              {principleDeck.map(({ character, variant }, index) => (
                <span
                  key={`${character}-${index}`}
                  className={cn(
                    'grid aspect-square cursor-pointer place-items-center font-mono text-xs font-[650] leading-none whitespace-nowrap text-muted',
                    'data-active:bg-ink data-active:text-on-ink',
                    'data-[variant=yellow]:not-data-active:text-deck-yellow',
                    'data-[variant=orange]:not-data-active:text-deck-orange',
                    'data-active:data-[variant=yellow]:bg-deck-yellow-fill',
                    'data-active:data-[variant=orange]:bg-deck-orange-fill',
                  )}
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

        <div className="grid grid-cols-[1fr_auto] items-end gap-x-[18px] gap-y-[calc(var(--spacing-u4)/2)] px-6 py-u4 max-[560px]:px-[18px]">
          <label
            htmlFor="principle-deck-position"
            className="flex h-4 items-end text-[10px] font-[650] leading-none tracking-[0.08em] text-muted uppercase"
          >
            Deck position
          </label>
          <output
            className="flex h-4 items-end font-mono text-[10px] font-[650] leading-none tracking-[0.08em] text-safety uppercase tabular-nums data-[variant=yellow]:text-deck-yellow-ink data-[variant=orange]:text-deck-orange-ink"
            data-variant={visiblePosition.variant}
          >
            {visiblePosition.character.trim() || 'Blank'} {visibleIndex + 1}/{principleDeck.length}
          </output>
          <div
            className={cn(
              'principle-controls',
              'col-span-full grid grid-cols-[minmax(0,1fr)_24px] items-center gap-3',
            )}
          >
            <div className="relative grid h-6 items-center">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 -left-[3px] font-mono text-[10px] leading-none text-faint"
              >
                +
              </span>
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
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-[-3px] bottom-0 font-mono text-[10px] leading-none text-faint"
              >
                ×
              </span>
            </div>
            <button
              type="button"
              className="grid size-6 cursor-pointer place-items-center border border-rule-strong bg-transparent p-0 text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink [&_svg]:size-2.5 [&_svg]:fill-current"
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
      motion={motion}
      motionOptions={['riffle', 'cascade'] as const}
      onMotionChange={setMotion}
      stage="board"
    >
      <div className="grid w-full place-items-center">
        <div className="motion-preview-scale">
          <StatusBoard motion={motion} />
        </div>
      </div>
    </Exhibit>
  )
}

function LooksAnimatedWord({
  color,
  id,
  tab,
}: {
  color?: string
  id: LooksRangeId
  tab: LooksTab
}) {
  return (
    <span style={{ color }}>
      <TextMorph as="span" duration={400} scale={false} style={{ verticalAlign: 'baseline' }}>
        {looksLiveValue(id, tab)}
      </TextMorph>
    </span>
  )
}

function LooksSnippet({
  lines,
  tab,
}: {
  lines: readonly QuickStartToken[][]
  tab: LooksTab
}) {
  return (
    <pre className="shiki">
      <code>
        {lines.map((line, lineIndex) => (
          <span key={line[0]?.offset ?? `blank-${lineIndex}`}>
            {line.map((token) => {
              const animated = looksRanges.find((range) =>
                tokenOverlapsRange(token, range.start, range.end),
              )
              if (!animated) {
                return (
                  <span key={token.offset} style={{ color: token.color }}>
                    {token.content}
                  </span>
                )
              }
              if (
                token.offset > animated.start ||
                token.offset + token.content.length <= animated.start
              ) {
                return null
              }

              const before = token.content.slice(0, animated.start - token.offset)
              const after = token.content.slice(animated.end - token.offset)
              const valueToken = line.find(
                ({ offset }) => offset >= animated.start && offset < animated.end,
              )
              return (
                <span key={token.offset} style={{ color: token.color }}>
                  {before}
                  <LooksAnimatedWord
                    color={valueToken?.color ?? token.color}
                    id={animated.id}
                    tab={tab}
                  />
                  {after}
                </span>
              )
            })}
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  )
}

function LooksCodeBlock({
  lines,
  tab,
}: {
  lines: readonly QuickStartToken[][]
  tab: LooksTab
}) {
  return (
    <div className={codeBlockClass} role="region" aria-label="Code example">
      <CodeCopyButton source={looksCode(tab)} />
      <div
        className={cn(codeBlockBodyClass, codeBlockLiveClass)}
        style={{ '--qs-code-lines': lines.length } as CSSProperties}
        tabIndex={0}
      >
        <LooksSnippet lines={lines} tab={tab} />
      </div>
    </div>
  )
}

function LooksPreview({
  onTabChange,
  styles,
  tab,
}: {
  onTabChange: (tab: LooksTab) => void
  styles: LooksPlaygroundStyles
  tab: LooksTab
}) {
  const panelId = 'looks-preview'

  return (
    <Exhibit
      stage="board"
      tabs={
        <ExhibitTabList
          label="Look"
          options={looksTabs}
          panelId={panelId}
          value={tab}
          onChange={onTabChange}
        />
      }
    >
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${tab}`}
        className={cn(
          'flapkit-industrial',
          'grid h-[calc(var(--flapkit-frame-top)+var(--flapkit-frame-bottom)+(2*var(--flapkit-cell-height))+(0.4*var(--flapkit-board-unit)))] w-full',
        )}
      >
        <LooksPlayground styles={styles} tab={tab} />
      </div>
    </Exhibit>
  )
}

function LooksSection({
  cssHtml,
  lines,
  styles,
}: {
  cssHtml: string
  lines: readonly QuickStartToken[][]
  styles: LooksPlaygroundStyles
}) {
  const [tab, setTab] = useState<LooksTab>('custom')

  return (
    <>
      <LooksPreview styles={styles} tab={tab} onTabChange={setTab} />
      <LooksCodeBlock lines={lines} tab={tab} />
      <div
        className={tab === 'custom' ? undefined : 'invisible'}
        inert={tab !== 'custom' || undefined}
      >
        <CodeBlock html={cssHtml} source={looksCssCode} />
      </div>
    </>
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
    <div className="mt-8">
      <h3 className="mb-[calc(var(--u4)/2)] text-[13px] font-[620] tracking-[-0.01em] leading-u4">
        {caption}
      </h3>
      <div className="min-w-0 overflow-x-auto [overscroll-behavior-x:contain]">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className={cn(apiCellClass, 'w-[34%] text-[10px] font-[650] tracking-[0.06em] text-faint uppercase')}
              >
                Name
              </th>
              <th
                scope="col"
                className={cn(apiCellClass, 'w-[16%] text-[10px] font-[650] tracking-[0.06em] text-faint uppercase')}
              >
                Type
              </th>
              <th
                scope="col"
                className={cn(apiCellClass, 'w-[15%] text-[10px] font-[650] tracking-[0.06em] text-faint uppercase')}
              >
                Default
              </th>
              <th
                scope="col"
                className={cn(apiCellClass, 'text-[10px] font-[650] tracking-[0.06em] text-faint uppercase')}
              >
                Meaning
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, type, fallback, meaning]) => (
              <tr key={name}>
                <th scope="row" className={cn(apiCellClass, 'font-medium')}>
                  <code className="font-mono text-xs font-[650]">{name}</code>
                </th>
                <td className={cn(apiCellClass, 'leading-[1.45] text-muted')}>
                  <code className="font-mono text-xs font-[650]">{type}</code>
                </td>
                <td className={cn(apiCellClass, 'leading-[1.45] text-muted tabular-nums')}>
                  {fallback}
                </td>
                <td className={cn(apiCellClass, 'leading-[1.45] text-muted')}>{meaning}</td>
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
      className="m-0 min-h-6 min-w-[11ch] leading-3 whitespace-pre tabular-nums"
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
      className={cn(docSectionClass, className)}
      data-index={index}
      data-title={title}
    >
      <h2 className="relative mb-u4 flex items-baseline gap-3.5 font-display text-[20px] font-[620] tracking-[-0.02em] leading-u4 text-balance">
        <span
          className="absolute right-full bottom-0 mr-u4 grid aspect-square translate-y-3 place-items-center border-2 border-safety bg-safety p-1.5 font-mono text-[28px] font-bold leading-none tracking-[-0.06em] text-flare tabular-nums max-[560px]:static max-[560px]:mr-0"
          aria-hidden="true"
        >
          {index}
        </span>
        <svg
          className="size-2.5 shrink-0 self-center text-safety"
          aria-hidden="true"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M9 15H0l7-7l-7-7h9l7 7z" />
        </svg>
        {title}
        <span
          aria-hidden="true"
          className="h-2 min-w-12 flex-1 self-center bg-[image:var(--leader)] bg-[length:4px_4px] bg-repeat"
        />
      </h2>
      {children}
    </section>
  )
}

export function DocsPage({
  highlighted: highlightedCode,
  looksLines,
  looksStyles,
  quickStartLines,
}: {
  highlighted: HighlightedDocsCode
  looksLines: QuickStartToken[][]
  looksStyles: LooksPlaygroundStyles
  quickStartLines: QuickStartToken[][]
}) {
  return (
    <SiteFrame>
      <div className="grid grid-cols-[var(--sidebar-width)_minmax(0,1fr)] max-[860px]:block">
          <aside className="min-w-0 border-r border-dashed border-rule font-mono max-[860px]:sticky max-[860px]:top-0 max-[860px]:z-2 max-[860px]:border-r-0 max-[860px]:border-b">
            <div className="sticky top-0 flex min-h-dvh flex-col items-start px-u4 pt-u4 pb-6 max-[860px]:static max-[860px]:min-h-0 max-[860px]:grid max-[860px]:grid-cols-[auto_minmax(0,1fr)] max-[860px]:items-center max-[860px]:gap-[18px] max-[860px]:bg-[color-mix(in_oklch,var(--paper)_92%,transparent)] max-[860px]:px-4 max-[860px]:py-2.5">
              <Logo />
              <DocsNav />
              <div className="mt-auto flex w-full items-end gap-u4 font-mono text-meta font-[620] tracking-[0.08em] text-faint uppercase max-[860px]:hidden">
                <div className="grid gap-[calc(var(--spacing-u4)/2)]">
                  <i
                    aria-hidden="true"
                    className="ml-1 inline-block h-3 w-[calc(var(--u)/3)] -skew-x-[20deg] bg-[repeating-linear-gradient(-60deg,var(--ink)_0_2px,transparent_2px_7px)] opacity-60"
                  />
                  <SidebarCoords />
                </div>
                <div className="ml-auto grid justify-items-end gap-[calc(var(--spacing-u4)/2)] text-end">
                  <a
                    className="m-0 inline-flex items-center gap-[0.45em] text-safety no-underline hover:text-ink [&_svg]:size-[0.85em] [&_svg]:shrink-0 [&_svg]:text-faint"
                    href="https://github.com/thecuvii/flapkit"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub"
                  >
                    <span aria-hidden="true">0.0.0</span>
                    <GithubMark />
                  </a>
                  <a
                    className="text-inherit no-underline hover:text-ink"
                    href="https://x.com/thecuvii"
                    target="_blank"
                    rel="noreferrer"
                  >
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
            The preview is a fuller departure board. The snippet is the smallest first board, and
            follows the options.
          </p>
          <QuickStartPreview lines={quickStartLines} />
        </DocSection>

        <DocSection id="how-it-works" index="02" title="How it works">
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
          <Exhibit look="airport" motion="riffle" deck="custom" stage="board">
            <div className="grid w-full justify-items-center gap-10">
              <PreviewScale tracks={2}>
                <Flapkit.Root motion={Flapkit.riffle()}>
                  <Flapkit.Grid
                    aria-label="Local service"
                    className="flapkit-airport w-max"
                  >
                    <Flapkit.Row deck={localDeck} label="LOCAL">
                      {cells('東京', 2, localDeck)}
                    </Flapkit.Row>
                  </Flapkit.Grid>
                </Flapkit.Root>
              </PreviewScale>
              <PreviewScale tracks={4} groups={2}>
                <Flapkit.Root motion={Flapkit.riffle()}>
                  <Flapkit.Grid
                    aria-label="Flight number and gate"
                    className="flapkit-airport w-max"
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
              </PreviewScale>
            </div>
          </Exhibit>
          <div className="mt-2">
            <div className={optionRowClass}>
              <code>alphanumeric</code>
              <span className="text-[13px] leading-[1.55] text-muted">
                Letters, numbers, and <code>-./:</code>. The default sequence.
              </span>
            </div>
            <div className={optionRowClass}>
              <code>numeric</code>
              <span className="text-[13px] leading-[1.55] text-muted">
                Space and digits for clocks, gates, and counts.
              </span>
            </div>
            <div className={optionRowClass}>
              <code>punctuation</code>
              <span className="text-[13px] leading-[1.55] text-muted">
                Space, colon, period, slash, and hyphen.
              </span>
            </div>
            <div className={optionRowClass}>
              <code>variant</code>
              <span className="text-[13px] leading-[1.55] text-muted">
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
          <LooksSection cssHtml={highlightedCode.looksCss} lines={looksLines} styles={looksStyles} />
        </DocSection>

        <DocSection id="motion" index="06" title="Motion">
          <p>
            Both adapters drive the same component tree and preserve the same looks.{' '}
            <code>riffle()</code> is for dense boards: canvas-assisted, randomized starts.{' '}
            <code>cascade()</code> paints the same leaf as riffle and staggers starts across rows.
          </p>
          <MotionPreview />
          <div className="mt-2">
            <div className={optionRowClass}>
              <code>riffle()</code>
              <span className="text-[13px] leading-[1.55] text-muted">
                <code>riffleMs</code>, <code>startSpreadMs</code>, <code>cadenceVariationPct</code>,{' '}
                <code>finalReboundDeg</code>, <code>finalSettleMs</code>
              </span>
            </div>
            <div className={optionRowClass}>
              <code>cascade()</code>
              <span className="text-[13px] leading-[1.55] text-muted">
                <code>pitchMs</code>, <code>rowDelayMs</code>, <code>withinRowJitterMs</code>, plus
                the shared settle options
              </span>
            </div>
          </div>
          <CodeBlock html={highlightedCode.motion} source={docsCode.motion.code} />
        </DocSection>

        <DocSection id="sound" index="07" title="Sound">
          <p>
            Sound is optional and ships without audio assets. Supply click and settle URLs you own,
            then pass <code>{'mechanicalSound({ bank })'}</code> to Root. Flip the preview to hear
            the same bank. The React adapter unlocks audio on the first pointer or keyboard gesture.{' '}
            <code>SoundEngine</code> is exported from the same subpath for non-React wiring.
          </p>
          <SoundPreview />
          <CodeBlock html={highlightedCode.sound} source={docsCode.sound.code} />
        </DocSection>

        <DocSection id="api" index="08" title="API">
          <p>
            Updates animate only cassettes whose resolved deck position changed. Motion engines and
            looks tree-shake independently, and there is no runtime style injection. Measure dense
            boards on the <a href="/performance">bench</a>.
          </p>
          <div className="mt-6 mb-9 grid [&_code]:border-b [&_code]:border-dashed [&_code]:border-rule [&_code]:py-[11px] [&_code]:font-mono [&_code]:text-xs [&_code]:font-[650] [&_code]:text-ink [&_code]:[overflow-wrap:anywhere]">
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
