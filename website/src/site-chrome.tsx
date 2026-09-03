import type { ReactNode } from 'react'

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="docs-shell">
      <div className="docs-grid" aria-hidden="true" />
      <div className="docs-grain" aria-hidden="true">
        <svg>
          <filter id="docs-noise-fx">
            <feTurbulence baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#docs-noise-fx)" />
        </svg>
      </div>
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
}: {
  look?: string
  motion?: string
  deck?: string
}) {
  const items = [
    look ? (['LOOK', look] as const) : null,
    motion ? (['MOTION', motion] as const) : null,
    deck ? (['DECK', deck] as const) : null,
  ].filter((item): item is readonly [string, string] => item !== null)

  if (items.length === 0) return null

  return (
    <dl className="spec-strip">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Exhibit({
  children,
  className,
  look,
  motion,
  deck,
  footer,
}: {
  children: ReactNode
  className?: string
  look?: string
  motion?: string
  deck?: string
  footer?: ReactNode
}) {
  return (
    <figure className={['exhibit', className].filter(Boolean).join(' ')}>
      <div className="exhibit-aside" aria-hidden="true" />
      <div className="exhibit-stage">{children}</div>
      <div className="exhibit-aside" aria-hidden="true" />
      <div className="exhibit-meta">
        <SpecStrip look={look} motion={motion} deck={deck} />
        {footer}
      </div>
      <div className="exhibit-band" aria-hidden="true" />
    </figure>
  )
}
