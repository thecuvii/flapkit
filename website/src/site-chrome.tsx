import type { CSSProperties, ReactNode, SVGProps } from 'react'

export function StreamlineBlockArrowheadsLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M11.92.16v15.68L4.08 8z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function InstrumentMark() {
  return <StreamlineBlockArrowheadsLeft className="choice-switch-mark" aria-hidden="true" />
}

function InstrumentField<T extends string>({
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
    <div className="instrument-field">
      <dt>{label}</dt>
      {interactive ? (
        <div role="group" aria-label={label}>
          {options!.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => onChange!(option)}
            >
              {option}
              <InstrumentMark />
            </button>
          ))}
        </div>
      ) : (
        <dd>
          {value}
          <InstrumentMark />
        </dd>
      )}
    </div>
  )
}

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="docs-shell">
      <div className="docs-grid" aria-hidden="true" />
      <div className="docs-frame">
        <div className="docs-band" aria-hidden="true" />
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
  ].filter((item): item is readonly [string, string] => item !== null)

  if (items.length === 0) return null

  return (
    <dl className={['spec-strip', className].filter(Boolean).join(' ')}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
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
  footer,
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
  footer?: ReactNode
}) {
  const controlled =
    Boolean(look && lookOptions && onLookChange) || Boolean(motion && motionOptions && onMotionChange)
  const columns = [
    look
      ? (
          <InstrumentField
            key="look"
            label="LOOK"
            value={look}
            options={onLookChange ? lookOptions : undefined}
            onChange={onLookChange}
          />
        )
      : null,
    motion
      ? (
          <InstrumentField
            key="motion"
            label="MOTION"
            value={motion}
            options={onMotionChange ? motionOptions : undefined}
            onChange={onMotionChange}
          />
        )
      : null,
    deck ? <InstrumentField key="deck" label="DECK" value={deck} /> : null,
  ].filter(Boolean)

  return (
    <figure className={['exhibit', className].filter(Boolean).join(' ')}>
      <div className="exhibit-aside" aria-hidden="true" />
      <div className="exhibit-stage">{children}</div>
      <div className="exhibit-aside" aria-hidden="true" />
      <div className="exhibit-meta">
        {controlled ? (
          <dl
            className="instrument-strip"
            style={{ '--instrument-cols': columns.length } as CSSProperties}
          >
            {columns}
          </dl>
        ) : (
          <SpecStrip look={look} motion={motion} deck={deck} />
        )}
        {controlled ? null : footer}
      </div>
      <div className="exhibit-band" aria-hidden="true" />
    </figure>
  )
}
