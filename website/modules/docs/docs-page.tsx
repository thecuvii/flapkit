'use client'

import * as Flapkit from '@thecuvii/flapkit'
import { mechanicalSound } from '@thecuvii/flapkit/sound'
import { cn } from 'cn'
import { useClipboard } from 'foxact/use-clipboard'
import {
  Activity,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
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
import { LooksPlayground, type LooksPlaygroundStyles } from './looks-playground'

const sectionMeta = [
  { id: 'quick-start', title: 'Quick start' },
  { id: 'how-it-works', title: 'How it works' },
  { id: 'composition', title: 'Composition' },
  { id: 'decks', title: 'Decks' },
  { id: 'looks', title: 'Looks' },
  { id: 'motion', title: 'Motion' },
  { id: 'sound', title: 'Sound' },
  { id: 'api', title: 'API' },
] as const

const sectionIds = sectionMeta.map((section) => section.id)
type SectionId = (typeof sectionIds)[number]

function isSectionId(value: string): value is SectionId {
  return sectionIds.includes(value as SectionId)
}

const DocsActiveIdContext = createContext<SectionId>('quick-start')

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

const departureFlightDeck = Flapkit.createDeck([
  '  ',
  'JL',
  'NH',
  'CX',
  'JX',
  'MF',
  'ZH',
  'UA',
  'KA',
])
const departureDestDeck = Flapkit.createDeck(' 深圳香港東京紐約')
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

const docsSoundBank = {
  clicks: ['/audio/click.wav'],
  settles: ['/audio/settle.wav'],
} as const

const soundPhrases = [
  ['FLAPKIT', 'READY'],
  ['BOARDING', 'ON TIME'],
] as const

const anatomyParts = [
  { id: 'root', name: 'Root', note: 'Motion and optional sound' },
  { id: 'board', name: 'Board', note: 'Framed display with grain, labels, and optional header' },
  { id: 'grid', name: 'Grid', note: 'Frameless display with the same cassette grid' },
  { id: 'header', name: 'Header', note: 'Optional board title. Board only' },
  { id: 'row', name: 'Row', note: 'One horizontal record' },
  { id: 'group', name: 'Group', note: 'Optional adjacent region with shared settings' },
  { id: 'cell', name: 'Cell / WideCell', note: 'One independently driven cassette. A group cannot mix widths' },
] as const

type AnatomyPartId = (typeof anatomyParts)[number]['id']
type ApiRow = readonly [string, string, string, string]

const tabClass =
  'docs-tab w-full max-lg:w-auto shrink-0 cursor-pointer touch-manipulation bg-transparent px-0 py-[6px] text-right whitespace-nowrap'
const optionClass = 'docs-option min-h-11 cursor-pointer touch-manipulation bg-transparent px-0 text-left'
const codeBodyClass = 'docs-code-body overflow-x-auto overscroll-x-contain [tab-size:2] [&_code]:block [&_code]:p-0'

function cells(text: string, count: number, deck?: Flapkit.Deck, className?: string) {
  return Array.from({ length: count }, (_, index) => (
    <Flapkit.Cell key={index} deck={deck} className={className}>
      {Array.from(text)[index] ?? ' '}
    </Flapkit.Cell>
  ))
}

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

function CodeCopyButton({ source }: { source: string }) {
  const { copied, copy } = useClipboard({ timeout: 1600 })
  const copySource = useCallback(() => {
    void copy(source)
  }, [copy, source])

  return (
    <button
      type="button"
      className="docs-copy absolute top-3.5 right-4 min-h-11 cursor-pointer bg-transparent"
      aria-live="polite"
      onClick={copySource}
    >
      <TextMorph as="span">{copied ? 'Copied' : 'Copy'}</TextMorph>
    </button>
  )
}

function CodeBlock({ html, source }: { html: string; source: string }) {
  return (
    <div className="docs-code relative max-w-full" role="region" aria-label="Code example">
      <CodeCopyButton source={source} />
      <div
        className={codeBodyClass}
        tabIndex={0}
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
            <span key={line[0]?.offset ?? `blank-${lineIndex}`} hidden={hideHeaderLine || undefined}>
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
                if (token.offset > animated.start || token.offset + token.content.length <= animated.start) {
                  return null
                }

                const before = token.content.slice(0, animated.start - token.offset)
                const after = token.content.slice(animated.end - token.offset)
                const valueToken = line.find(({ offset }) => offset >= animated.start && offset < animated.end)
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
    <div className="docs-code relative max-w-full" role="region" aria-label="Code example">
      <CodeCopyButton source={source} />
      <div
        className={cn(
          codeBodyClass,
          '[&_code]:min-h-[calc(var(--qs-code-lines)*1.7em)] [&_[torph-root]]:inline [&_[torph-root]]:align-baseline [&_[torph-root]:has([torph-id=empty]:only-child)]:hidden',
        )}
        style={{ '--qs-code-lines': lines.length } as CSSProperties}
        tabIndex={0}
      >
        <QuickStartSnippet lines={lines} options={options} />
      </div>
    </div>
  )
}

function OptionSwitch<T extends string>({
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
    <div className="flex flex-wrap items-baseline gap-x-4" role="group" aria-label={label}>
      <p className="m-0">{label}</p>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          className={optionClass}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
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
      <Flapkit.Group deck={departureStatusDeck} id="status" label="STATUS" variant={row.statusVariant}>
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
              const animated = looksRanges.find((range) => tokenOverlapsRange(token, range.start, range.end))
              if (!animated) {
                return (
                  <span key={token.offset} style={{ color: token.color }}>
                    {token.content}
                  </span>
                )
              }
              if (token.offset > animated.start || token.offset + token.content.length <= animated.start) {
                return null
              }

              const before = token.content.slice(0, animated.start - token.offset)
              const after = token.content.slice(animated.end - token.offset)
              const valueToken = line.find(({ offset }) => offset >= animated.start && offset < animated.end)
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
    <div className="docs-code relative max-w-full" role="region" aria-label="Code example">
      <CodeCopyButton source={looksCode(tab)} />
      <div
        className={cn(
          codeBodyClass,
          '[&_code]:min-h-[calc(var(--qs-code-lines)*1.7em)] [&_[torph-root]]:inline [&_[torph-root]]:align-baseline [&_[torph-root]:has([torph-id=empty]:only-child)]:hidden',
        )}
        style={{ '--qs-code-lines': lines.length } as CSSProperties}
        tabIndex={0}
      >
        <LooksSnippet lines={lines} tab={tab} />
      </div>
    </div>
  )
}

function ApiTable({
  caption,
  rows,
}: {
  caption: string
  rows: readonly ApiRow[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-balance">{caption}</h3>
      <div className="-mx-6 overflow-x-auto overscroll-x-contain">
        <div className="inline-block min-w-full px-6 py-2 align-middle">
          <table className="w-full border-collapse">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                <th scope="col" className="whitespace-nowrap border-b py-2 pr-3 text-left">
                  Name
                </th>
                <th scope="col" className="whitespace-nowrap border-b py-2 pr-3 text-left">
                  Type
                </th>
                <th scope="col" className="whitespace-nowrap border-b py-2 pr-3 text-left">
                  Default
                </th>
                <th scope="col" className="whitespace-nowrap border-b py-2 text-left">
                  Meaning
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, type, fallback, meaning]) => (
                <tr key={name}>
                  <th scope="row" className="border-b py-2 pr-3 text-left">
                    <code>{name}</code>
                  </th>
                  <td className="border-b py-2 pr-3">
                    <code>{type}</code>
                  </td>
                  <td className="border-b py-2 pr-3 tabular-nums">{fallback}</td>
                  <td className="border-b py-2">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ActivitySection({ id, children }: { id: SectionId; children: ReactNode }) {
  const activeId = useContext(DocsActiveIdContext)
  const inView = Math.abs(sectionIds.indexOf(id) - sectionIds.indexOf(activeId)) <= 1
  const sectionRef = useRef<HTMLElement>(null)
  const heightRef = useRef(0)

  useLayoutEffect(() => {
    const node = sectionRef.current
    if (inView && node) heightRef.current = node.offsetHeight
  })

  return (
    <section
      ref={sectionRef}
      id={id}
      className="w-full max-lg:scroll-mt-14"
      style={inView ? undefined : { minHeight: heightRef.current > 0 ? heightRef.current : '100dvh' }}
    >
      <Activity mode={inView ? 'visible' : 'hidden'}>{children}</Activity>
    </section>
  )
}

function DocsSection({
  title,
  preview,
  fillPreview = false,
  children,
}: {
  title: string
  preview: ReactNode
  fillPreview?: boolean
  children: ReactNode
}) {
  return (
    <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
      <div
        className={cn(
          'grid px-6 py-8 lg:sticky lg:top-0 lg:min-h-dvh',
          fillPreview ? 'items-center [&>*]:w-full' : 'place-items-center',
        )}
      >
        {preview}
      </div>
      <div className="grid min-w-0 items-center px-6 py-8 lg:sticky lg:top-0 lg:min-h-dvh">
        <div className="flex min-w-0 max-w-[36rem] flex-col gap-3.5">
          <h2 className="text-balance">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  )
}

function DocsShell({ children }: { children: ReactNode }) {
  const ignoreObserver = useRef(false)
  const [activeId, setActiveId] = useState<SectionId>('quick-start')
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const scrollToSection = useCallback((id: SectionId, behavior: ScrollBehavior) => {
    const node = document.getElementById(id)
    if (!(node instanceof HTMLElement)) return

    ignoreObserver.current = true
    node.scrollIntoView({ behavior, block: 'start' })

    const unlock = () => {
      ignoreObserver.current = false
    }
    window.addEventListener('scrollend', unlock, { once: true })
    window.setTimeout(unlock, behavior === 'instant' ? 50 : 900)
  }, [])

  const onNavClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: SectionId) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const adjacent = Math.abs(sectionIds.indexOf(id) - sectionIds.indexOf(activeId)) <= 1
      setActiveId(id)
      history.pushState(null, '', `#${id}`)
      scrollToSection(id, reduce || !adjacent ? 'instant' : 'smooth')
    },
    [activeId, scrollToSection],
  )

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (!isSectionId(hash)) return
      setActiveId(hash)
      ignoreObserver.current = true
      document.getElementById(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' })
      window.setTimeout(() => {
        ignoreObserver.current = false
      }, 50)
    }

    syncFromHash()
    window.addEventListener('popstate', syncFromHash)

    const nodes = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)

    const observer = new IntersectionObserver(
      (entries) => {
        if (ignoreObserver.current) return
        const next = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
        if (!next || !isSectionId(next.target.id)) return
        const id = next.target.id
        if (activeIdRef.current === id) return
        setActiveId(id)
        if (window.location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`)
      },
      { rootMargin: '-30% 0px -45% 0px', threshold: 0 },
    )

    for (const node of nodes) observer.observe(node)
    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', syncFromHash)
    }
  }, [])

  return (
    <DocsActiveIdContext.Provider value={activeId}>
      <div className="docs-page isolate min-h-dvh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] antialiased">
        <div className="mx-auto flex w-full max-w-[88rem] min-w-0 px-6">
          <div className="flex min-w-0 flex-1 max-lg:flex-col">
            <nav
              className="sticky top-0 z-10 flex h-dvh w-max shrink-0 flex-col justify-center gap-0 bg-[var(--body-bg)] pr-8 max-lg:h-auto max-lg:w-full max-lg:flex-row max-lg:items-center max-lg:justify-start max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:pr-0 max-lg:py-3"
              aria-label="Documentation"
            >
              {sectionMeta.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={tabClass}
                  data-active={activeId === section.id || undefined}
                  aria-current={activeId === section.id ? 'location' : undefined}
                  onClick={(event) => onNavClick(event, section.id)}
                >
                  {section.title}
                </a>
              ))}
            </nav>
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </div>
    </DocsActiveIdContext.Provider>
  )
}

const onOffOptions = ['on', 'off'] as const

function QuickStartSection({ lines }: { lines: readonly QuickStartToken[][] }) {
  const [look, setLook] = useState<LookName>('airport')
  const [motion, setMotion] = useState<'cascade' | 'riffle'>('riffle')
  const [board, setBoard] = useState(true)
  const [header, setHeader] = useState(true)
  const showHeader = board && header
  const options = { look, motion, board, header: showHeader }

  return (
    <DocsSection
      title="Quick start"
      fillPreview
      preview={<DepartureBoard look={look} motion={motion} frame={board} header={showHeader} />}
    >
      <p className="m-0 text-pretty">
        Install Flapkit. React 19 is a peer dependency. Import the structural stylesheet and one look; Flapkit
        does not inject styles at runtime.
      </p>
      <p className="m-0 text-pretty">
        The preview is a fuller departure board. The snippet is the smallest first board, and follows the
        options.
      </p>
      <OptionSwitch label="Look" options={lookNames} value={look} onChange={setLook} />
      <OptionSwitch
        label="Motion"
        options={['riffle', 'cascade'] as const}
        value={motion}
        onChange={setMotion}
      />
      <OptionSwitch
        label="Board"
        options={onOffOptions}
        value={board ? 'on' : 'off'}
        onChange={(value) => {
          const next = value === 'on'
          setBoard(next)
          if (!next) setHeader(false)
        }}
      />
      <OptionSwitch
        label="Header"
        options={onOffOptions}
        value={showHeader ? 'on' : 'off'}
        onChange={(value) => {
          if (value === 'on') {
            setBoard(true)
            setHeader(true)
            return
          }
          setHeader(false)
        }}
      />
      <TorphCodeBlock lines={lines} options={options} source={quickStartCode(options)} />
    </DocsSection>
  )
}

function HowItWorksSection() {
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
    const distance = wraps ? lastPitchIndex - startPosition + targetIndex : Math.max(0, targetIndex - startPosition)

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
    <DocsSection
      title="How it works"
      preview={
        <div className="grid h-[290px] w-[176px] justify-items-center content-start">
          <CassettePreview
            className={cn(`flapkit-${look}`, 'principle-cassette')}
            deck={principleDeck}
            fromIndex={fromIndex}
            mode={motionMode}
            progress={pitchProgress}
          />
        </div>
      }
    >
      <p className="m-0 text-pretty">
        Scrub one cassette through its full deck. Each step is one pitch — the leaf that is turning, while the
        rest stay packed.
      </p>
      <OptionSwitch label="Look" options={lookNames} value={look} onChange={setLook} />
      <OptionSwitch
        label="Motion"
        options={['cascade', 'riffle'] as const}
        value={motionMode}
        onChange={(option) => {
          stopPlayback()
          setMotionMode(option)
        }}
      />
      <div className="grid grid-cols-11 gap-px" aria-label="Complete Latin and CJK character deck">
        {principleDeck.map(({ character, variant }, index) => (
          <button
            key={`${character}-${index}`}
            type="button"
            className={cn(
              'docs-option grid aspect-square cursor-pointer place-items-center bg-transparent whitespace-nowrap',
              'data-active:bg-black data-active:text-white',
              'data-[variant=yellow]:not-data-active:text-[#b45309]',
              'data-[variant=orange]:not-data-active:text-[#c2410c]',
            )}
            data-active={index === visibleIndex || undefined}
            data-variant={variant}
            onClick={() => {
              playToIndex(index)
            }}
          >
            {character.trim() || '·'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-2">
        <label htmlFor="principle-deck-position">
          Deck position
        </label>
        <output className="tabular-nums" data-variant={visiblePosition.variant}>
          {visiblePosition.character.trim() || 'Blank'} {visibleIndex + 1}/{principleDeck.length}
        </output>
        <input
          id="principle-deck-position"
          className="col-span-full"
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
        <button
          type="button"
          className="docs-action col-span-full min-h-11 w-fit cursor-pointer bg-transparent"
          onClick={togglePlayback}
        >
          {isPlaying ? 'Pause' : progress >= 1 ? 'Replay' : 'Play'}
        </button>
      </div>
    </DocsSection>
  )
}

function CompositionSection({ html }: { html: string }) {
  const [hover, setHover] = useState<AnatomyPartId | null>(null)

  return (
    <DocsSection
      title="Composition"
      fillPreview
      preview={<DepartureBoard look="airport" motion="riffle" frame header />}
    >
      <p className="m-0 text-pretty">
        Root compiles a declarative board and hands animation to a motion adapter. Use a flat Row when the
        whole row shares one label, deck, sequence, and variant. Add Group only when adjacent regions need
        different settings. Give Row and Group stable ids when items can reorder so cassette identity survives.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0" role="list" aria-label="Flapkit component tree">
        {anatomyParts.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-4"
            data-active={hover === item.id ? '' : undefined}
            onPointerEnter={() => setHover(item.id)}
            onPointerLeave={() => setHover((current) => (current === item.id ? null : current))}
          >
            <code data-active={hover === item.id ? '' : undefined}>{item.name}</code>
            <span>{item.note}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-pretty">
        <code>deck</code>, <code>sequence</code>, <code>variant</code>, and <code>label</code> cascade from Row
        to Group to Cell. Set them on the nearest owner.
      </p>
      <CodeBlock html={html} source={docsCode.composition.code} />
    </DocsSection>
  )
}

function DecksSection({ html }: { html: string }) {
  return (
    <DocsSection
      title="Decks"
      preview={
        <div className="flex flex-col items-center gap-10">
          <PreviewScale tracks={2}>
            <Flapkit.Root motion={Flapkit.riffle()}>
              <Flapkit.Grid aria-label="Local service" className="flapkit-airport w-max">
                <Flapkit.Row deck={localDeck} label="LOCAL">
                  {cells('東京', 2, localDeck)}
                </Flapkit.Row>
              </Flapkit.Grid>
            </Flapkit.Root>
          </PreviewScale>
          <PreviewScale tracks={4} groups={2}>
            <Flapkit.Root motion={Flapkit.riffle()}>
              <Flapkit.Grid aria-label="Flight number and gate" className="flapkit-airport w-max">
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
      }
    >
      <p className="m-0 text-pretty">
        A deck is the ordered stops a cassette can land on. Built-in sequences cover Latin letters, numbers, and
        common punctuation. Use <code>createDeck</code> for Chinese, Japanese, emoji, or any other grapheme. Text
        is segmented with <code>Intl.Segmenter</code>, so combining marks and emoji sequences are not split
        across cells. <code>WideCell</code> is one cassette whose leaves carry two graphemes. Rows in the same
        Board or Grid must share one Group / Cell / WideCell structure.
      </p>
      <div className="flex flex-col gap-3">
        <p className="m-0">
          <code>alphanumeric</code> Letters, numbers, and <code>-./:</code>. The default sequence.
        </p>
        <p className="m-0">
          <code>numeric</code> Space and digits for clocks, gates, and counts.
        </p>
        <p className="m-0">
          <code>punctuation</code> Space, colon, period, slash, and hyphen.
        </p>
        <p className="m-0">
          <code>variant</code> <code>white</code>, <code>yellow</code>, or <code>orange</code>. Pass variants as
          the second argument to <code>createDeck</code>.
        </p>
      </div>
      <CodeBlock html={html} source={docsCode.decks.code} />
    </DocsSection>
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
    <DocsSection
      title="Looks"
      preview={
        <div className="grid size-64">
          <LooksPlayground styles={styles} tab={tab} />
        </div>
      }
    >
      <p className="m-0 text-pretty">
        Looks are separate CSS subpaths. Put the look class on the Board or Grid styling host. Font family,
        weight, and style inherit from Board, Row, and Group; set size on Cell. Ordinary classes and Tailwind
        utilities work without a Flapkit-specific API. Use <code>data-slot</code> and{' '}
        <code>data-part="face"</code> only for surfaces that cannot inherit, such as leaf faces.
      </p>
      <OptionSwitch
        label="Look"
        options={looksTabs.map((item) => item.id)}
        value={tab}
        onChange={setTab}
      />
      <LooksCodeBlock lines={lines} tab={tab} />
      <div className={tab === 'custom' ? undefined : 'invisible'} inert={tab !== 'custom' || undefined}>
        <CodeBlock html={cssHtml} source={looksCssCode} />
      </div>
    </DocsSection>
  )
}

function MotionSection({ html }: { html: string }) {
  const [motion, setMotion] = useState<'cascade' | 'riffle'>('riffle')

  return (
    <DocsSection
      title="Motion"
      preview={
        <div className="motion-preview-scale">
          <StatusBoard motion={motion} />
        </div>
      }
    >
      <p className="m-0 text-pretty">
        Both adapters drive the same component tree and preserve the same looks. <code>riffle()</code> is for
        dense boards: canvas-assisted, randomized starts. <code>cascade()</code> paints the same leaf as riffle
        and staggers starts across rows.
      </p>
      <OptionSwitch
        label="Motion"
        options={['riffle', 'cascade'] as const}
        value={motion}
        onChange={setMotion}
      />
      <div className="flex flex-col gap-3">
        <p className="m-0">
          <code>riffle()</code> <code>riffleMs</code>, <code>startSpreadMs</code>, <code>cadenceVariationPct</code>,{' '}
          <code>finalReboundDeg</code>, <code>finalSettleMs</code>
        </p>
        <p className="m-0">
          <code>cascade()</code> <code>pitchMs</code>, <code>rowDelayMs</code>, <code>withinRowJitterMs</code>, plus
          the shared settle options
        </p>
      </div>
      <CodeBlock html={html} source={docsCode.motion.code} />
    </DocsSection>
  )
}

function SoundSection({ html }: { html: string }) {
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
    <DocsSection
      title="Sound"
      preview={
        <StatusBoard
          motion={motion}
          rows={soundPhrases[phrase]}
          sound={mechanicalSound({ bank: docsSoundBank, prepareRef: prepareSound })}
        />
      }
    >
      <p className="m-0 text-pretty">
        Sound is optional and ships without audio assets. Supply click and settle URLs you own, then pass{' '}
        <code>{'mechanicalSound({ bank })'}</code> to Root. Flip the preview to hear the same bank. The React
        adapter unlocks audio on the first pointer or keyboard gesture. <code>SoundEngine</code> is exported from
        the same subpath for non-React wiring.
      </p>
      <OptionSwitch
        label="Motion"
        options={['riffle', 'cascade'] as const}
        value={motion}
        onChange={setMotion}
      />
      <button
        type="button"
        className="docs-action min-h-11 w-fit cursor-pointer bg-transparent"
        onClick={playFlaps}
      >
        {played ? 'Replay flap sounds' : 'Play flap sounds'}
      </button>
      <CodeBlock html={html} source={docsCode.sound.code} />
    </DocsSection>
  )
}

function ApiSection() {
  return (
    <DocsSection title="API" preview={<StatusBoard />}>
      <p className="m-0 text-pretty">
        Updates animate only cassettes whose resolved deck position changed. Motion engines and looks tree-shake
        independently, and there is no runtime style injection. Measure dense boards on the{' '}
        <a className="underline underline-offset-2 hover:no-underline" href="/performance">
          bench
        </a>
        .
      </p>
      <div className="flex flex-col gap-1">
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
      <ApiTable caption="Header" rows={[['children', 'ReactNode', '—', 'Board title. Board only']]} />
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
    </DocsSection>
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
    <DocsShell>
      <ActivitySection id="quick-start">
        <QuickStartSection lines={quickStartLines} />
      </ActivitySection>
      <ActivitySection id="how-it-works">
        <HowItWorksSection />
      </ActivitySection>
      <ActivitySection id="composition">
        <CompositionSection html={highlightedCode.composition} />
      </ActivitySection>
      <ActivitySection id="decks">
        <DecksSection html={highlightedCode.decks} />
      </ActivitySection>
      <ActivitySection id="looks">
        <LooksSection cssHtml={highlightedCode.looksCss} lines={looksLines} styles={looksStyles} />
      </ActivitySection>
      <ActivitySection id="motion">
        <MotionSection html={highlightedCode.motion} />
      </ActivitySection>
      <ActivitySection id="sound">
        <SoundSection html={highlightedCode.sound} />
      </ActivitySection>
      <ActivitySection id="api">
        <ApiSection />
      </ActivitySection>
    </DocsShell>
  )
}
