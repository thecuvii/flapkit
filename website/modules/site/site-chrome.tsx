import {
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type SVGProps,
} from 'react'
import { cn } from 'cn'
import { ExhibitStripes } from './exhibit-stripes'

export function StreamlineBlockArrowheadsLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" {...props}>
      <path fill="currentColor" fillRule="evenodd" d="M11.92.16v15.68L4.08 8z" clipRule="evenodd" />
    </svg>
  )
}

function InstrumentMark({ visible }: { visible: boolean }) {
  return (
    <StreamlineBlockArrowheadsLeft
      className={cn(
        'absolute top-1/2 left-[calc(100%+4px)] block size-[7px] shrink-0 -translate-y-1/2 text-flare',
        visible ? 'visible' : 'invisible',
      )}
      aria-hidden="true"
    />
  )
}

const instrumentType =
  'm-0 font-mono text-[10px] font-semibold tracking-[0.06em] leading-none uppercase'

const specType = 'm-0 font-mono text-[10px] font-[620] tracking-[0.06em] leading-none uppercase'

function StripCorners() {
  return (
    <>
      <span
        aria-hidden
        className="absolute -top-1 -left-1 box-border size-[7px] border border-ink bg-paper"
      />
      <span
        aria-hidden
        className="absolute -top-1 -right-1 box-border size-[7px] border border-ink bg-ink"
      />
    </>
  )
}

export function ExhibitTabList<T extends string>({
  label,
  onChange,
  options,
  panelId,
  value,
}: {
  label: string
  onChange: (value: T) => void
  options: readonly { id: T; label: string }[]
  panelId: string
  value: T
}) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (next: number) => {
    const option = options[next]
    if (!option) return
    onChange(option.id)
    tabs.current[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      move(index === last ? 0 : index + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(index === 0 ? last : index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      move(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      move(last)
    }
  }

  return (
    <div
      className="relative m-0 flex w-[var(--exhibit-span)] items-center gap-1 px-u4 py-[calc((var(--u)-44px)/2)]"
      role="tablist"
      aria-label={label}
    >
      <StripCorners />
      {options.map((option, index) => {
        const selected = value === option.id
        return (
          <button
            key={option.id}
            ref={(node) => {
              tabs.current[index] = node
            }}
            type="button"
            role="tab"
            id={`${panelId}-tab-${option.id}`}
            aria-controls={panelId}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cn(
              instrumentType,
              'relative min-h-11 cursor-pointer border-0 bg-transparent px-3',
              'after:absolute after:right-3 after:bottom-1.5 after:left-3 after:h-px after:bg-ink',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              selected ? 'text-ink after:opacity-100' : 'text-muted after:opacity-0',
            )}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function InstrumentField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options?: readonly T[]
  onChange?: (value: T) => void
}) {
  const interactive = Boolean(options && onChange)

  return (
    <div className="grid min-w-0 content-start gap-2">
      <dt className={cn(instrumentType, 'font-[620] text-ink opacity-40')}>{label}</dt>
      {interactive ? (
        <div className="grid justify-items-start gap-2" role="group" aria-label={label}>
          {options!.map((option) => {
            const pressed = value === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={pressed}
                className={cn(
                  instrumentType,
                  'relative inline-flex min-h-0 min-w-0 cursor-pointer items-center overflow-visible border-0 bg-transparent p-0',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  pressed ? 'text-ink' : 'text-muted',
                )}
                onClick={() => onChange!(option)}
              >
                {option}
                <InstrumentMark visible={pressed} />
              </button>
            )
          })}
        </div>
      ) : (
        <dd
          className={cn(
            instrumentType,
            'relative inline-flex min-h-0 min-w-0 items-center text-ink',
          )}
        >
          {value}
          <InstrumentMark visible />
        </dd>
      )}
    </div>
  )
}

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh grid-cols-[minmax(0,1fr)] [overflow-x:clip]">
      <div className="docs-grid" aria-hidden="true" />
      <div className="relative col-start-1 row-start-1 min-w-0">
        <div className="relative h-[6px]" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 w-2u bg-safety" />
          <span className="absolute inset-y-0 right-4u w-u bg-ink" />
          <span className="absolute inset-y-0 right-2u w-2u bg-flare" />
        </div>
        {children}
      </div>
    </div>
  )
}

export function SpecStrip({
  look,
  motion,
  deck,
  className,
}: {
  look?: string
  motion?: string
  deck?: string
  className?: string
}) {
  const items = [
    look ? (['LOOK', look] as const) : null,
    motion ? (['MOTION', motion] as const) : null,
    deck ? (['DECK', deck] as const) : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  if (items.length === 0) return null

  return (
    <dl
      className={cn(
        'relative m-0 flex w-[var(--exhibit-span)] flex-col gap-3 px-u4 py-[calc((var(--u)-54px)/2)] max-[860px]:w-full',
        className,
      )}
    >
      <StripCorners />
      {items.map(([label, value]) => (
        <div key={label} className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-baseline">
          <dt className={cn(specType, 'text-ink opacity-40')}>{label}</dt>
          <dd className={cn(specType, 'inline-flex items-center text-ink')}>
            {value}
            <span aria-hidden className="ml-2 inline-block size-2.5 bg-mark align-middle" />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function Exhibit<L extends string = string, M extends string = string>({
  children,
  className,
  look,
  motion,
  deck,
  lookOptions,
  motionOptions,
  onLookChange,
  onMotionChange,
  extras,
  footer,
  stage = 'default',
  tabs,
}: {
  children: ReactNode
  className?: string
  look?: L | string
  motion?: M | string
  deck?: string
  lookOptions?: readonly L[]
  motionOptions?: readonly M[]
  onLookChange?: (value: L) => void
  onMotionChange?: (value: M) => void
  extras?: ReactNode[]
  footer?: ReactNode
  stage?: 'default' | 'board' | 'quick-start'
  tabs?: ReactNode
}) {
  const controlled =
    Boolean(tabs) ||
    Boolean(look && lookOptions && onLookChange) ||
    Boolean(motion && motionOptions && onMotionChange) ||
    Boolean(extras?.length)
  const columns = [
    look ? (
      <InstrumentField
        key="look"
        label="LOOK"
        value={look}
        options={onLookChange ? lookOptions : undefined}
        onChange={onLookChange}
      />
    ) : null,
    motion ? (
      <InstrumentField
        key="motion"
        label="MOTION"
        value={motion}
        options={onMotionChange ? motionOptions : undefined}
        onChange={onMotionChange}
      />
    ) : null,
    deck ? <InstrumentField key="deck" label="DECK" value={deck} /> : null,
    ...(extras ?? []),
  ].filter(Boolean)

  return (
    <figure className={cn('exhibit', className)}>
      <div className="exhibit-aside" data-aside="left" aria-hidden="true">
        <ExhibitStripes />
      </div>
      <div className="exhibit-stage" data-stage={stage}>
        {children}
      </div>
      <div className="exhibit-aside" data-aside="right" aria-hidden="true">
        <ExhibitStripes />
      </div>
      <div className="exhibit-meta">
        {controlled ? (
          (tabs ?? (
            <dl
              className="relative m-0 grid w-[var(--exhibit-span)] grid-cols-[repeat(var(--instrument-cols,3),minmax(0,1fr))] gap-x-u4 gap-y-3 px-u4 py-[calc((var(--u)-54px)/2)] max-[960px]:grid-cols-[repeat(min(2,var(--instrument-cols,3)),minmax(0,1fr))] max-[680px]:grid-cols-1 max-[680px]:gap-4 max-[680px]:py-4"
              style={{ '--instrument-cols': columns.length } as CSSProperties}
            >
              <StripCorners />
              {columns}
            </dl>
          ))
        ) : (
          <SpecStrip look={look} motion={motion} deck={deck} />
        )}
        {controlled ? null : footer}
      </div>
      <div className="exhibit-band" aria-hidden="true" />
    </figure>
  )
}
