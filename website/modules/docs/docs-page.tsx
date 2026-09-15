'use client'

import * as Flapkit from 'flapkit'
import { cascade as canvasCascade } from 'flapkit/motion/canvas/cascade'
import { cascade as cssCascade } from 'flapkit/motion/css/cascade'
import { riffle } from 'flapkit/motion/canvas/riffle'
import { mechanicalSound } from 'flapkit/sound'
import {
  Activity,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type SVGProps,
} from 'react'
import { TextMorph } from 'torph/react'
import { compileFlapkitBoard } from '../../../src/compiler'
import { MotionProvider } from '../../../src/motion/provider'
import { BoardView, GridView } from '../../../src/render/board'
import { CassettePreview } from '../../../src/render/cassette-preview'
import {
  looksLiveValue,
  looksRanges,
  looksTabs,
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
import { SiteFrame, StreamlineBlockArrowheadsLeft } from '../site'
import { LooksPlayground } from './looks-playground'
import { useInView } from './use-in-view'

const navigation = [
  ['Quick start', 'quick-start'],
  ['How it works', 'how-it-works'],
  ['Composition', 'composition'],
  ['Decks', 'decks'],
  ['Looks', 'looks'],
  ['Motion', 'motion'],
  ['Sound', 'sound'],
] as const

const docsNavItemClass =
  'grid w-fit max-w-full grid-cols-[8px_minmax(0,1fr)] items-center gap-2 py-1 font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-faint [overflow-wrap:anywhere] hover:text-ink max-[860px]:inline-flex max-[860px]:shrink-0 max-[860px]:min-h-11 max-[860px]:py-[5px]'

const sectionMeta = [
  { id: 'quick-start', index: '01', title: 'Quick start' },
  { id: 'how-it-works', index: '02', title: 'How it works' },
  { id: 'composition', index: '03', title: 'Composition' },
  { id: 'decks', index: '04', title: 'Decks' },
  { id: 'looks', index: '05', title: 'Looks' },
  { id: 'motion', index: '06', title: 'Motion' },
  { id: 'sound', index: '07', title: 'Sound' },
] as const

const sectionIds = sectionMeta.map((section) => section.id)
type SectionId = (typeof sectionIds)[number]

function isSectionId(value: string): value is SectionId {
  return sectionIds.includes(value as SectionId)
}

type DocsNavContextValue = {
  activeId: SectionId
  onNavClick: (event: MouseEvent<HTMLAnchorElement>, id: SectionId) => void
}

const DocsNavContext = createContext<DocsNavContextValue>({
  activeId: 'quick-start',
  onNavClick: () => {},
})

const lookNames = ['airport', 'industrial'] as const
type LookName = (typeof lookNames)[number]

const customPhrases = [
  ['안', '녕', '👋', '🌏'],
  ['東', '京', '🚀', '✨'],
  ['你', '好', '☕', '💚'],
  ['서', '울', '🌸', '🎵'],
  ['大', '阪', '🍣', '🍵'],
  ['深', '圳', '🌴', '☀️'],
  ['한', '글', '🎨', '💜'],
  ['か', 'な', '🌙', '⭐'],
  ['香', '港', '⛴️', '🌊'],
  ['α', 'β', 'γ', 'δ'],
  ['←', '↑', '→', '↓'],
  ['🎉', '🎈', '🎁', '🎂'],
]
const customDeck = Flapkit.createDeck([
  ' ',
  '안',
  '🌸',
  '東',
  '☕',
  'γ',
  '好',
  '🎈',
  '울',
  '🍣',
  '↑',
  '京',
  '💚',
  '한',
  '🌏',
  '圳',
  '✨',
  'か',
  '🎁',
  '港',
  '👋',
  'β',
  '大',
  '🌙',
  '你',
  '🎵',
  '→',
  '글',
  '🍵',
  '香',
  '🚀',
  'δ',
  '서',
  '🌴',
  '🎂',
  'な',
  '💜',
  '阪',
  '↓',
  '🌊',
  '녕',
  '🎨',
  '深',
  '⭐',
  'α',
  '☀️',
  '🎉',
  '←',
  '⛴️',
])
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
const optionRowClass =
  'grid grid-cols-[minmax(160px,0.7fr)_minmax(0,1.3fr)] gap-5 border-b border-dashed border-rule py-3.5 max-[560px]:grid-cols-1 max-[560px]:gap-[9px] [&_code]:font-mono [&_code]:text-xs [&_code]:font-[650] [&_code]:text-ink [&_code]:[overflow-wrap:anywhere]'
const docsCopyClass = cn(
  'grid min-w-0 grid-cols-1 gap-u4 min-[861px]:grid-cols-2 min-[861px]:gap-x-u4',
  'min-[861px]:[&>*]:col-span-2',
  '[&>p]:m-0 [&>p]:text-base [&>p]:font-[430] [&>p]:tracking-[-0.006em] [&>p]:leading-u4 max-[860px]:[&>p]:leading-normal [&>p]:text-muted [&>p]:text-pretty',
  '[&_p_code]:px-0.5 [&_p_code]:font-mono [&_p_code]:text-[0.86em] [&_p_code]:text-ink',
  '[&_a]:text-link [&_a]:underline [&_a]:underline-offset-[3px] [&_a]:hover:text-ink',
)

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

function CodeBlock({ html }: { html: string }) {
  return (
    <div className={codeBlockClass} role="region" aria-label="Code example">
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
            headerRange &&
            line.some((token) => tokenOverlapsRange(token, headerRange.start, headerRange.end)),
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
}: {
  lines: readonly QuickStartToken[][]
  options: QuickStartSnippetOptions
}) {
  return (
    <div className={codeBlockClass} role="region" aria-label="Code example">
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

function DocsProvider({ children }: { children: ReactNode }) {
  const ignoreObserver = useRef(false)
  const [activeId, setActiveId] = useState<SectionId>('quick-start')
  const scrollFrame = useRef(0)
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const scrollToSection = useCallback((id: SectionId, behavior: ScrollBehavior) => {
    const node = document.getElementById(id)
    if (!(node instanceof HTMLElement)) return

    cancelAnimationFrame(scrollFrame.current)
    ignoreObserver.current = true
    node.scrollIntoView({ behavior, block: 'start' })

    // Activity reveals can change the heights above the destination. Re-align
    // after layout settles instead of releasing the observer on the first scrollend.
    let stableFrames = 0
    let previousTop = Number.NaN
    const started = performance.now()
    const settle = () => {
      const top = node.getBoundingClientRect().top
      stableFrames = Math.abs(top - previousTop) < 0.5 ? stableFrames + 1 : 0
      previousTop = top
      if (stableFrames >= 3 || performance.now() - started > 1500) {
        node.scrollIntoView({ behavior: 'instant', block: 'start' })
        scrollFrame.current = requestAnimationFrame(() => {
          ignoreObserver.current = false
        })
        return
      }
      scrollFrame.current = requestAnimationFrame(settle)
    }
    scrollFrame.current = requestAnimationFrame(settle)
  }, [])

  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), [])

  const onNavClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: SectionId) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return
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
      scrollToSection(hash, 'instant')
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
  }, [scrollToSection])

  return (
    <DocsNavContext.Provider value={{ activeId, onNavClick }}>{children}</DocsNavContext.Provider>
  )
}

function ActivitySection({ id, children }: { id: SectionId; children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef)
  const { activeId } = useContext(DocsNavContext)
  const visible = inView || activeId === id
  const heightRef = useRef(0)

  useLayoutEffect(() => {
    const node = sectionRef.current
    if (visible && node) heightRef.current = node.offsetHeight
  })

  return (
    <section
      ref={sectionRef}
      id={id}
      className="w-full min-h-dvh max-[860px]:scroll-mt-0 max-[860px]:pb-12"
      style={
        visible ? undefined : { minHeight: heightRef.current > 0 ? heightRef.current : '100dvh' }
      }
    >
      <Activity mode={visible ? 'visible' : 'hidden'}>{children}</Activity>
    </section>
  )
}

function DocsSection({
  index,
  title,
  preview,
  fillPreview = false,
  children,
}: {
  index: string
  title: string
  preview: ReactNode
  fillPreview?: boolean
  children: ReactNode
}) {
  return (
    <div className="grid min-h-dvh min-w-0 max-[860px]:min-h-0 max-[860px]:h-auto min-[861px]:h-dvh min-[861px]:grid-cols-[minmax(0,1fr)_minmax(0,clamp(26rem,calc(6*var(--u)),30rem))_var(--u)]">
      <div
        className={cn(
          'grid px-u4 py-8 max-[860px]:py-6 min-[861px]:min-h-0',
          fillPreview ? 'items-center [&>*]:w-full' : 'place-items-center',
        )}
      >
        {preview}
      </div>
      <div className="grid min-h-0 min-w-0 items-center overflow-y-auto overscroll-y-contain px-u4 py-8 max-[860px]:overflow-visible max-[860px]:pt-2">
        <div className={docsCopyClass}>
          <h2 className="relative m-0 flex items-baseline gap-3.5 text-balance">
            <span
              className="grid aspect-square shrink-0 place-items-center border-2 border-safety bg-safety p-1.5 font-display text-[28px] font-bold leading-none tracking-[0.04em] text-flare tabular-nums"
              aria-hidden="true"
            >
              {index}
            </span>
            <svg
              className="size-2.5 shrink-0 self-center text-safety max-[860px]:hidden"
              aria-hidden="true"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9 15H0l7-7l-7-7h9l7 7z"
              />
            </svg>
            <span className="min-w-0 font-display text-[28px] font-semibold uppercase tracking-[0.04em] leading-none">
              {title}
            </span>
            <span
              aria-hidden="true"
              className="h-2 min-w-12 flex-1 self-center bg-[image:var(--leader)] bg-[length:4px_4px] bg-repeat max-[860px]:hidden"
            />
          </h2>
          {children}
        </div>
      </div>
    </div>
  )
}

function DocsNav() {
  const navRef = useRef<HTMLElement>(null)
  const { activeId } = useContext(DocsNavContext)

  useEffect(() => {
    const nav = navRef.current
    const link = nav?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!nav || !link || !window.matchMedia('(max-width: 860px)').matches) return
    const navBox = nav.getBoundingClientRect()
    const linkBox = link.getBoundingClientRect()
    if (linkBox.left < navBox.left || linkBox.right > navBox.right - 28) {
      nav.scrollBy({ left: linkBox.left - navBox.left - 12, behavior: 'instant' })
    }
  }, [activeId])

  return (
    <nav
      ref={navRef}
      aria-label="Documentation"
      className="grid min-w-0 gap-0.5 max-[860px]:flex max-[860px]:gap-4 max-[860px]:overflow-x-auto max-[860px]:pr-7 max-[860px]:[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] max-[860px]:[-webkit-mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] max-[860px]:[overscroll-behavior-x:contain] max-[860px]:[scrollbar-width:none] max-[860px]:[&::-webkit-scrollbar]:hidden"
    >
      {navigation.map(([label, id]) => (
        <DocsNavLink key={id} href={id} label={label} />
      ))}
      <a
        href="https://github.com/thecuvii/flapkit#api"
        className={docsNavItemClass}
        target="_blank"
        rel="noreferrer"
      >
        <span
          aria-hidden="true"
          className="size-1 justify-self-center rounded-full bg-[oklch(0.5_0_0)] max-[860px]:hidden"
        />
        API reference
      </a>
    </nav>
  )
}

function DocsNavLink({ href, label }: { href: SectionId; label: string }) {
  const { activeId, onNavClick } = useContext(DocsNavContext)
  const isActive = activeId === href

  return (
    <a
      href={`#${href}`}
      className={cn(docsNavItemClass, isActive && 'text-ink')}
      aria-current={isActive ? 'location' : undefined}
      onClick={(event) => onNavClick(event, href)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'shrink-0 justify-self-center',
          isActive ? 'size-1.5 rounded-none bg-safety' : 'size-1 rounded-full bg-[oklch(0.5_0_0)]',
        )}
      />
      {label}
    </a>
  )
}

const docsControlClass =
  'relative inline-flex min-h-11 min-w-0 cursor-pointer touch-manipulation items-center gap-2 border-0 bg-transparent py-1 font-mono text-[10px] max-[860px]:text-xs font-semibold tracking-[0.06em] uppercase hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

function ChoiceSwitch<T extends string>({
  label,
  options,
  value,
  onChange,
  labels,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  labels?: Record<T, string>
}) {
  return (
    <div
      className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)] max-[860px]:grid-cols-1 items-center gap-x-3 border-b border-dashed border-rule py-1.5"
      role="group"
      aria-label={label}
      data-docs-choice
    >
      <span className="font-mono text-[10px] font-[620] leading-none tracking-[0.06em] text-ink uppercase opacity-40">
        {label}
      </span>
      <div className="grid grid-cols-3 gap-3" data-docs-options>
        {options.map((option) => {
          const pressed = value === option
          return (
            <button
              key={option}
              type="button"
              aria-pressed={pressed}
              className={cn(
                docsControlClass,
                'justify-self-start overflow-visible text-left leading-[1.5] whitespace-pre-line',
                pressed ? 'text-ink' : 'text-muted',
              )}
              onClick={() => onChange(option)}
            >
              {labels?.[option] ?? option}
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

function DepartureBoardTree({
  look,
  motion,
  frame,
  header,
  sound = true,
  staticDisplay = false,
  compact = false,
}: {
  look: LookName
  motion: QuickStartSnippetOptions['motion']
  frame: boolean
  header: boolean
  sound?: boolean
  staticDisplay?: boolean
  compact?: boolean
}) {
  const Frame = frame ? Flapkit.Board : Flapkit.Grid
  const rows = (compact ? departureRows.slice(0, 3) : departureRows).map((row) => (
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
      {!compact && (
        <Flapkit.Group
          deck={departureStatusDeck}
          id="status"
          label="STATUS"
          variant={row.statusVariant}
        >
          {cells(row.status, 8, departureStatusDeck)}
        </Flapkit.Group>
      )}
      <Flapkit.Group id="gate" label="GATE">
        {cells(row.gate, 3)}
      </Flapkit.Group>
    </Flapkit.Row>
  ))

  if (staticDisplay) {
    const compiled = compileFlapkitBoard(
      <Frame aria-label="Airport departures" className={cn(`flapkit-${look}`, 'w-max')}>
        {header ? <Flapkit.Header>Departures</Flapkit.Header> : null}
        {rows}
      </Frame>,
    )
    return (
      <MotionProvider
        adapter={cssCascade()}
        source={compiled.source}
        presentation={compiled.presentation}
        reduceMotion
      >
        {frame ? (
          <BoardView {...compiled.boardProps}>{compiled.header}</BoardView>
        ) : (
          <GridView {...compiled.boardProps} />
        )}
      </MotionProvider>
    )
  }

  return (
    <Flapkit.Root
      key={motion}
      motion={motion === 'css' ? cssCascade() : motion === 'cascade' ? canvasCascade() : riffle()}
      sound={sound ? mechanicalSound({ bank: docsSoundBank }) : undefined}
    >
      <Frame aria-label="Airport departures" className={cn(`flapkit-${look}`, 'w-max')}>
        {header ? <Flapkit.Header>Departures</Flapkit.Header> : null}
        {rows}
      </Frame>
    </Flapkit.Root>
  )
}

const compactBoardQuery = '(max-width: 560px)'
function subscribeCompactBoard(onChange: () => void) {
  const media = window.matchMedia(compactBoardQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
const getCompactBoard = () => window.matchMedia(compactBoardQuery).matches
const getServerCompactBoard = () => false

function DepartureBoard({
  look,
  motion,
  frame,
  header,
}: {
  look: LookName
  motion: QuickStartSnippetOptions['motion']
  frame: boolean
  header: boolean
}) {
  const compact = useSyncExternalStore(
    subscribeCompactBoard,
    getCompactBoard,
    getServerCompactBoard,
  )
  return (
    <div
      className={`quick-start-board-slot flapkit-${look}`}
      data-compact={compact || undefined}
      data-frame={frame ? 'on' : 'off'}
      data-header={header ? 'on' : 'off'}
    >
      <div className="quick-start-board-scale">
        <DepartureBoardTree
          look={look}
          motion={motion}
          frame={frame}
          header={header}
          compact={compact}
        />
      </div>
    </div>
  )
}

function QuickStartSection({ lines }: { lines: readonly QuickStartToken[][] }) {
  const [look, setLook] = useState<LookName>('airport')
  const [motion, setMotion] = useState<QuickStartSnippetOptions['motion']>('cascade')
  const options = { look, motion, board: true, header: true }

  return (
    <DocsSection
      index="01"
      title="Quick start"
      fillPreview
      preview={<DepartureBoard look={look} motion={motion} frame header />}
    >
      <div className="docs-choice-rows">
        <ChoiceSwitch label="Look" options={lookNames} value={look} onChange={setLook} />
        <ChoiceSwitch
          label="Motion"
          options={['cascade', 'riffle', 'css'] as const}
          labels={{
            cascade: 'Cascade\n(Canvas)',
            riffle: 'Riffle\n(Canvas)',
            css: 'Cascade\n(CSS)',
          }}
          value={motion}
          onChange={setMotion}
        />
      </div>
      <TorphCodeBlock lines={lines} options={options} />
    </DocsSection>
  )
}

const anatomyParts = [
  { id: 'root', name: 'Root', note: 'Motion and optional sound' },
  {
    id: 'board',
    name: 'Board',
    note: 'Frame, labels, optional header',
  },
  {
    id: 'grid',
    name: 'Grid',
    note: 'Cassette grid without a frame',
  },
  {
    id: 'header',
    name: 'Header',
    note: 'Optional Board title',
  },
  {
    id: 'row',
    name: 'Row',
    note: 'Horizontal record',
  },
  {
    id: 'group',
    name: 'Group',
    note: 'Adjacent cells with shared settings',
  },
  {
    id: 'cell',
    name: 'Cell / WideCell',
    note: 'One cassette; groups cannot mix widths',
  },
] as const

type AnatomyPartId = (typeof anatomyParts)[number]['id']

const compositionSettleMs = 320
const compositionAnnDelayMs = 560

const compositionAnnotations = {
  row: {
    selector:
      '.composition-mechanism .flapkit-departure-row:first-child .flapkit-departure-group:first-child',
    text: 'Row',
    place: 'left',
  },
  group: {
    selector:
      '.composition-mechanism .flapkit-departure-row:first-child .flapkit-departure-group:nth-child(4)',
    text: 'Group',
    place: 'top',
  },
  cell: {
    selector:
      '.composition-mechanism .flapkit-departure-row:first-child .flapkit-departure-group:nth-child(1) [data-slot="cassette"]',
    text: 'Cell',
    place: 'top',
  },
} as const

type CompositionExplode = keyof typeof compositionAnnotations

function CompositionAnnotation({
  host,
  explode,
}: {
  host: HTMLElement | null
  explode: CompositionExplode | undefined
}) {
  const [anchor, setAnchor] = useState<{
    height: number
    left: number
    top: number
    width: number
  } | null>(null)

  useLayoutEffect(() => {
    if (!host || !explode) {
      setAnchor(null)
      return
    }

    let cancelled = false
    const spec = compositionAnnotations[explode]
    const pin = () => {
      const target = host.querySelector(spec.selector)
      if (cancelled || !target) return
      const hostBox = host.getBoundingClientRect()
      const box = target.getBoundingClientRect()
      setAnchor({
        height: box.height,
        left: box.left - hostBox.left,
        top: box.top - hostBox.top,
        width: box.width,
      })
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(pin, reduceMotion ? 0 : compositionAnnDelayMs)
    window.addEventListener('resize', pin)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener('resize', pin)
      setAnchor(null)
    }
  }, [explode, host])

  if (!explode || !anchor) return null
  const spec = compositionAnnotations[explode]

  return (
    <div
      className="composition-ann"
      data-place={spec.place}
      style={{
        height: anchor.height,
        left: anchor.left,
        top: anchor.top,
        width: anchor.width,
      }}
      aria-hidden="true"
    >
      <span className="composition-ann-label">{spec.text}</span>
    </div>
  )
}

function CompositionSection({ html }: { html: string }) {
  const [preview, setPreview] = useState<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<AnatomyPartId | null>(null)
  const wanted = hover === 'row' || hover === 'group' || hover === 'cell' ? hover : undefined
  const [explode, setExplode] = useState<CompositionExplode | undefined>(undefined)
  // Housing hide outlives explode by the settle duration so parts can return
  // without the frame popping back mid-transition.
  const [scene, setScene] = useState(false)
  const sceneReadyRef = useRef(false)
  useEffect(() => {
    if (wanted) {
      if (sceneReadyRef.current) {
        setScene(true)
        setExplode(wanted)
        return
      }
      // First lift waits two frames so the warm 3D layer can paint before
      // housing hide and part transforms hit the same commit.
      let inner = 0
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => {
          sceneReadyRef.current = true
          setScene(true)
          setExplode(wanted)
        })
      })
      return () => {
        window.cancelAnimationFrame(outer)
        window.cancelAnimationFrame(inner)
      }
    }
    setExplode(undefined)
    const timer = window.setTimeout(() => {
      sceneReadyRef.current = false
      setScene(false)
    }, compositionSettleMs)
    return () => window.clearTimeout(timer)
  }, [wanted])

  return (
    <DocsSection
      index="03"
      title="Composition"
      fillPreview
      preview={
        <div
          ref={setPreview}
          className={cn('composition-preview', 'relative grid w-full')}
          data-explode={explode}
          data-scene={scene ? '' : undefined}
        >
          <div
            className="quick-start-board-slot flapkit-industrial"
            data-frame="on"
            data-header="on"
          >
            <div className="quick-start-board-scale">
              <div className="composition-layers">
                <div className="composition-housing" aria-hidden="true">
                  <DepartureBoardTree
                    look="industrial"
                    motion="cascade"
                    frame
                    header
                    sound={false}
                    staticDisplay
                  />
                </div>
                <div className="composition-mechanism">
                  <DepartureBoardTree
                    look="industrial"
                    motion="cascade"
                    frame
                    header
                    staticDisplay
                  />
                </div>
              </div>
            </div>
          </div>
          <CompositionAnnotation host={preview} explode={explode} />
        </div>
      }
    >
      <p>
        <code>Root</code> compiles the board and owns motion. A flat <code>Row</code> sets its cell
        defaults. With explicit groups, each <code>Group</code> sets its own defaults. Add stable{' '}
        <code>id</code>s to identify rows and groups. Reordering rebuilds their animation state.
      </p>
      <ul className="m-0 grid list-none gap-0 p-0" aria-label="Flapkit component tree">
        {anatomyParts.map((item) => (
          <li
            key={item.id}
            className="group grid grid-cols-[148px_minmax(0,1fr)] items-baseline gap-5 border-b border-dashed border-rule py-2.5 max-[560px]:grid-cols-1 max-[560px]:gap-1.5"
            data-active={hover === item.id ? '' : undefined}
            onPointerEnter={() => setHover(item.id)}
            onPointerLeave={() => setHover((current) => (current === item.id ? null : current))}
          >
            <button
              type="button"
              className={cn(docsControlClass, 'w-fit text-muted group-data-active:text-ink')}
              onFocus={() => setHover(item.id)}
              onBlur={() => setHover((current) => (current === item.id ? null : current))}
              onClick={() => setHover(item.id)}
              aria-pressed={hover === item.id}
            >
              {item.name}
              {hover === item.id && (
                <StreamlineBlockArrowheadsLeft
                  className="size-[7px] text-flare"
                  aria-hidden="true"
                />
              )}
            </button>
            <span className="text-[13px] leading-normal text-muted">{item.note}</span>
          </li>
        ))}
      </ul>
      <CodeBlock html={html} />
    </DocsSection>
  )
}

const docsSoundBank = {
  clicks: ['/flapkit/audio/click.wav'],
  settles: ['/flapkit/audio/settle.wav'],
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
  motion?: 'cascade' | 'riffle' | 'css'
  custom?: boolean
  rows?: readonly [string, string]
  sound?: ReactElement
}) {
  const glyphClass = custom ? 'text-xl font-bold' : undefined
  const [top, bottom] = rows ?? ['FLAPKIT', 'READY']

  return (
    <Flapkit.Root
      motion={motion === 'css' ? cssCascade() : motion === 'cascade' ? canvasCascade() : riffle()}
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

function SoundSection({ html }: { html: string }) {
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
      index="07"
      title="Sound"
      preview={
        <StatusBoard
          motion="riffle"
          rows={soundPhrases[phrase]}
          sound={mechanicalSound({ bank: docsSoundBank, prepareRef: prepareSound })}
        />
      }
    >
      <p className="text-[14px]! font-normal!">
        Audio files are not bundled. Pass click and settle URLs to{' '}
        <code>{'mechanicalSound({ bank })'}</code>. Sounds follow actual flip events and stay in
        sync with the animation. The first interaction unlocks audio. Use <code>SoundEngine</code>{' '}
        without React.
      </p>
      <button
        type="button"
        className={cn(docsControlClass, 'z-1 w-fit text-ink')}
        onClick={playFlaps}
      >
        <svg className="size-3 shrink-0 fill-current" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m5 3 8 5-8 5z" />
        </svg>
        {played ? 'Replay sounds' : 'Play sounds'}
      </button>
      <CodeBlock html={html} />
    </DocsSection>
  )
}

function HowItWorksSection() {
  const lastPitchIndex = principleDeck.length - 1
  const firstCharacterProgress = 1 / lastPitchIndex
  const [progress, setProgress] = useState(firstCharacterProgress)
  const [isPlaying, setIsPlaying] = useState(false)
  const [look, setLook] = useState<LookName>('airport')
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
    const duration = distance * 95
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
      playbackFrame.current = null
      setIsPlaying(false)
    },
    [],
  )

  return (
    <DocsSection
      index="02"
      title="How it works"
      preview={
        <div
          className={cn(
            `flapkit-${look}`,
            'principle-view grid h-[290px] w-[176px] justify-items-center content-start',
          )}
        >
          <CassettePreview
            className="principle-cassette"
            deck={principleDeck}
            fromIndex={fromIndex}
            mode="cascade"
            progress={pitchProgress}
          />
        </div>
      }
    >
      <p>Scrub the CSS 3D mechanism one pitch at a time. Only the active leaf turns.</p>
      <div className="docs-choice-rows">
        <ChoiceSwitch label="Look" options={lookNames} value={look} onChange={setLook} />
      </div>
      <div
        className="grid grid-cols-11 gap-[3px]"
        aria-label="Complete Latin and CJK character deck"
      >
        {principleDeck.map(({ character, variant }, index) => (
          <button
            key={`${character}-${index}`}
            type="button"
            aria-label={character.trim() || 'Blank'}
            aria-pressed={index === visibleIndex}
            className={cn(
              docsControlClass,
              'justify-center leading-none whitespace-nowrap text-muted',
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
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-x-[18px] gap-y-[calc(var(--spacing-u4)/2)]">
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
            'col-span-full grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3',
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
            className={cn(
              docsControlClass,
              'size-11 justify-center text-ink [&_svg]:size-2.5 [&_svg]:fill-current',
            )}
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
    </DocsSection>
  )
}

function MotionSection({
  cascadeHtml,
  riffleHtml,
  cssHtml,
}: {
  cascadeHtml: string
  riffleHtml: string
  cssHtml: string
}) {
  const [motion, setMotion] = useState<'cascade' | 'riffle' | 'css'>('riffle')

  return (
    <DocsSection
      index="06"
      title="Motion"
      preview={
        <div className="motion-preview-scale">
          <StatusBoard key={motion} motion={motion} />
        </div>
      }
    >
      <p>
        <code>riffle()</code> randomizes starts; <code>cascade()</code> staggers them by row. Import
        from <code>motion/canvas</code> for Canvas leaves, or <code>motion/css/cascade</code> for
        CSS 3D leaves. The import selects the renderer without bundling the unused Canvas renderer.
      </p>
      <div className="docs-choice-rows">
        <ChoiceSwitch
          label="Motion"
          options={['cascade', 'riffle', 'css'] as const}
          labels={{
            cascade: 'Cascade\n(Canvas)',
            riffle: 'Riffle\n(Canvas)',
            css: 'Cascade\n(CSS)',
          }}
          value={motion}
          onChange={setMotion}
        />
      </div>
      <div>
        <div className={optionRowClass}>
          <code>riffle()</code>
          <span className="text-[13px] leading-[1.55] text-muted">
            <code>riffleMs</code>, <code>startSpreadMs</code>, <code>cadenceVariationPct</code>,{' '}
            <code>finalSettleMs</code>
          </span>
        </div>
        <div className={optionRowClass}>
          <code>cascade()</code>
          <span className="text-[13px] leading-[1.55] text-muted">
            <code>pitchMs</code>, <code>rowDelayMs</code>, <code>withinRowJitterMs</code>, shared
            settle options
          </span>
        </div>
      </div>
      <CodeBlock
        html={motion === 'css' ? cssHtml : motion === 'cascade' ? cascadeHtml : riffleHtml}
      />
    </DocsSection>
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

function LooksSnippet({ lines, tab }: { lines: readonly QuickStartToken[][]; tab: LooksTab }) {
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

function LooksCodeBlock({ lines, tab }: { lines: readonly QuickStartToken[][]; tab: LooksTab }) {
  return (
    <div className={codeBlockClass} role="region" aria-label="Code example">
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

function LooksSection({
  cssHtml,
  lines,
}: {
  cssHtml: string
  lines: readonly QuickStartToken[][]
}) {
  const [tab, setTab] = useState<LooksTab>('custom')
  const panelId = 'looks-preview'

  return (
    <DocsSection
      index="05"
      title="Looks"
      preview={
        <div
          id={panelId}
          role="region"
          aria-label="Look preview"
          className={cn(
            'flapkit-industrial',
            'grid h-[calc(var(--flapkit-frame-top)+var(--flapkit-frame-bottom)+(3*var(--flapkit-cell-height))+(0.8*var(--flapkit-board-unit)))] w-full',
          )}
        >
          <LooksPlayground tab={tab} />
        </div>
      }
    >
      <p>
        Start with one look, then use ordinary CSS or Tailwind: padding on <code>Board</code>, gap
        on
        <code>Row</code> or <code>Group</code>, width and height on <code>Cell</code>. Declare
        optional
        <code>Face</code>, <code>Glyph</code>, and <code>Retainer</code> parts to style them
        directly, or wrap a cell in your own React component. Canvas mirrors typography, colors, and
        geometry—not filters, shadows, or background images.
      </p>
      <ChoiceSwitch
        label="Look"
        options={looksTabs.map((item) => item.id)}
        value={tab}
        onChange={setTab}
      />
      <LooksCodeBlock lines={lines} tab={tab} />
      <div
        className={tab === 'custom' ? undefined : 'invisible'}
        inert={tab !== 'custom' || undefined}
      >
        <CodeBlock html={cssHtml} />
      </div>
    </DocsSection>
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
    const duration =
      Math.max(0, lineColumnCount(fromLines, toLines) - 1) * scrambleStaggerMs + scrambleWindowMs
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

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
const getReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const getServerReducedMotion = () => true

function DecksSection({ html }: { html: string }) {
  const [phrase, setPhrase] = useState(0)
  const [paused, setPaused] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const inView = useInView(previewRef)
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  )
  const autoPlay = !paused && !reducedMotion
  const characters = customPhrases[phrase]!

  useEffect(() => {
    if (!inView || !autoPlay) return
    let timer: ReturnType<typeof setInterval> | undefined
    const syncVisibility = () => {
      clearInterval(timer)
      if (document.visibilityState === 'visible') {
        timer = setInterval(() => {
          setPhrase((current) => (current + 1) % customPhrases.length)
        }, 4500)
      }
    }
    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [inView, autoPlay])

  return (
    <DocsSection
      index="04"
      title="Decks"
      preview={
        <div ref={previewRef} className="grid w-full justify-items-center gap-5">
          <Flapkit.Root motion={cssCascade()}>
            <Flapkit.Grid aria-label="Custom multilingual deck" className="flapkit-airport w-max">
              <Flapkit.Row deck={customDeck} className="gap-1">
                {characters.map((character, index) => (
                  <Flapkit.Cell key={index} className="h-20 w-14">
                    <Flapkit.Glyph className="font-sans text-[36px]">{character}</Flapkit.Glyph>
                  </Flapkit.Cell>
                ))}
              </Flapkit.Row>
            </Flapkit.Grid>
          </Flapkit.Root>
        </div>
      }
    >
      <p>
        A deck lists cassette stops. Import a built-in deck and pass it to <code>deck</code>, or use{' '}
        <code>createDeck</code> for custom graphemes. This multilingual deck cycles automatically
        with Cascade (CSS). Use Next to advance it manually. Each array entry is one complete
        grapheme, including emoji. Without a deck, cells use <code>alphanumericDeck</code>.{' '}
        <code>WideCell</code> requires a custom deck with two graphemes per leaf. Every row in a{' '}
        <code>Board</code> or <code>Grid</code> must use the same Group / Cell / WideCell structure.
      </p>
      <div className="flex items-center gap-6">
        {!reducedMotion && (
          <button
            type="button"
            className={cn(docsControlClass, 'z-1 w-fit text-ink')}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        )}
        <button
          type="button"
          className={cn(docsControlClass, 'z-1 w-fit text-ink')}
          onClick={() => setPhrase((current) => (current + 1) % customPhrases.length)}
        >
          <svg className="size-3 shrink-0 fill-current" viewBox="0 0 16 16" aria-hidden="true">
            <path d="m5 3 8 5-8 5z" />
          </svg>
          Next
        </button>
      </div>
      <div>
        <div className={optionRowClass}>
          <code>alphanumericDeck</code>
          <span className="text-[13px] leading-[1.55] text-muted">
            Letters, digits, and <code>-./:</code>. Default.
          </span>
        </div>
        <div className={optionRowClass}>
          <code>numericDeck</code>
          <span className="text-[13px] leading-[1.55] text-muted">Space and digits.</span>
        </div>
        <div className={optionRowClass}>
          <code>punctuationDeck</code>
          <span className="text-[13px] leading-[1.55] text-muted">
            Space and <code>:./-</code>.
          </span>
        </div>
        <div className={optionRowClass}>
          <code>variant</code>
          <span className="text-[13px] leading-[1.55] text-muted">
            <code>white</code>, <code>yellow</code>, or <code>orange</code>. Pass as{' '}
            <code>createDeck</code>’s second argument.
          </span>
        </div>
      </div>
      <CodeBlock html={html} />
    </DocsSection>
  )
}

export function DocsPage({
  highlighted: highlightedCode,
  looksLines,
  quickStartLines,
}: {
  highlighted: HighlightedDocsCode
  looksLines: QuickStartToken[][]
  quickStartLines: QuickStartToken[][]
}) {
  return (
    <DocsProvider>
      <SiteFrame>
        <div className="grid grid-cols-[var(--sidebar-width)_minmax(0,1fr)] max-[860px]:block">
          <aside className="min-w-0 border-r border-dashed border-rule font-mono max-[860px]:sticky max-[860px]:top-0 max-[860px]:z-2 max-[860px]:border-r-0 max-[860px]:border-b">
            <div className="sticky top-0 flex min-h-dvh flex-col items-start px-u4 pt-u4 pb-6 max-[860px]:static max-[860px]:min-h-0 max-[860px]:grid max-[860px]:grid-cols-1 max-[860px]:items-center max-[860px]:bg-[color-mix(in_oklch,var(--paper)_92%,transparent)] max-[860px]:px-4 max-[860px]:py-2.5">
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

          <main className="min-w-0">
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
              <LooksSection cssHtml={highlightedCode.looksCss} lines={looksLines} />
            </ActivitySection>
            <ActivitySection id="motion">
              <MotionSection
                cascadeHtml={highlightedCode.motionCascade}
                riffleHtml={highlightedCode.motionRiffle}
                cssHtml={highlightedCode.motionCss}
              />
            </ActivitySection>
            <ActivitySection id="sound">
              <SoundSection html={highlightedCode.sound} />
            </ActivitySection>
          </main>
        </div>
      </SiteFrame>
    </DocsProvider>
  )
}
