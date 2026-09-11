'use client'

// Board and grid renderers for the Flapkit component model.

import { memo, useId, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { presentationSignature } from '../compiler'
import type { ResolvedSplitFlapSource } from '../layout'
import { useMotionOverlay, useSplitFlap, useSplitFlapContent } from '../motion/provider'
import { BoardRow } from './cassette'
import { classProps, styles } from './classes'
import { cssValue } from './css-values'

function liveBoardText(layout: ResolvedSplitFlapSource) {
  return layout.rows
    .map((row) =>
      layout.columns
        .map((column) => {
          const value = row.values[column.id]
          const text = typeof value === 'string' ? value : (value?.text ?? '')
          return column.label ? `${column.label} ${text}` : text
        })
        .join(' '),
    )
    .join('. ')
}

const BoardGrain = memo(function BoardGrain({ opacity }: { opacity: number }) {
  const filterId = useId()
  const fineGrainId = `${filterId}-fine-grain`
  const coarseGrainId = `${filterId}-coarse-grain`

  return (
    <svg
      {...classProps(styles.boardGrain)}
      viewBox="0 0 820 315"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      <filter id={fineGrainId} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.82"
          numOctaves="4"
          seed="26"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.8" intercept="-0.4" />
          <feFuncG type="linear" slope="1.8" intercept="-0.4" />
          <feFuncB type="linear" slope="1.8" intercept="-0.4" />
        </feComponentTransfer>
      </filter>
      <filter id={coarseGrainId} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.028 0.045"
          numOctaves="3"
          seed="71"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="820" height="315" opacity="0.48" filter={`url(#${fineGrainId})`} />
      <rect width="820" height="315" opacity="0.3" filter={`url(#${coarseGrainId})`} />
    </svg>
  )
})

/**
 * Consumer-owned `data-*` attributes forwarded to the styling host.
 * Looks are selected this way: `data-look="airport"` matches `airport.css`.
 */
export type DataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined
}

export type BoardViewProps = DataAttributes & {
  'aria-label'?: string
  children?: ReactNode
  className?: string
  grainOpacity?: number
  showColumnLabels?: boolean
  style?: CSSProperties
}

export type GridViewProps = DataAttributes & {
  'aria-label'?: string
  className?: string
  style?: CSSProperties
}

function GridContent() {
  const { controller, layout, motion, presentation } = useSplitFlap()
  const Overlay = useMotionOverlay()
  const canvasGeometryKey = `${layout.layoutKey}:${presentationSignature(presentation)}`

  return (
    <div
      {...classProps(styles.grid)}
      aria-hidden="true"
      style={{
        gridTemplateRows: `repeat(${layout.rows.length}, max-content)`,
      }}
    >
      {layout.rows.map((row, rowIndex) => (
        <BoardRow
          key={row.id}
          controller={controller}
          detailed={motion.variant === 'scrub' || motion.renderer === 'css'}
          layout={layout}
          rowIndex={rowIndex}
          presentation={presentation.rows[rowIndex]}
        />
      ))}
      {Overlay && <Overlay geometryKey={canvasGeometryKey} />}
    </div>
  )
}

export function GridView({
  'aria-label': ariaLabel = 'Split-flap display grid',
  className,
  style,
  ...dataAttributes
}: GridViewProps) {
  const layout = useSplitFlapContent()
  const gridProps = classProps(styles.standaloneGrid)

  return (
    <figure
      {...dataAttributes}
      {...gridProps}
      aria-label={ariaLabel}
      className={[gridProps.className, className].filter(Boolean).join(' ')}
      data-slot="split-flap-grid"
      style={style}
    >
      <span {...classProps(styles.srOnly)} aria-live="polite">
        {liveBoardText(layout)}
      </span>
      <GridContent />
    </figure>
  )
}

export function BoardView({
  'aria-label': ariaLabel = 'Split-flap display board',
  children,
  className,
  grainOpacity = 0.32,
  showColumnLabels = true,
  style,
  ...dataAttributes
}: BoardViewProps) {
  const layout = useSplitFlapContent()
  const boardRef = useRef<HTMLElement>(null)
  const labelsRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const row = boardRef.current?.querySelector<HTMLElement>('[data-slot="row"]')
    const labels = labelsRef.current
    if (!row || !labels) return
    const groups = Array.from(row.querySelectorAll<HTMLElement>(':scope > [data-slot="group"]'))
    const measure = () => {
      labels.style.gridTemplateColumns = row.dataset.flat
        ? `${row.offsetWidth}px`
        : groups.map((group) => `${group.offsetWidth}px`).join(' ')
      labels.style.columnGap = getComputedStyle(row).columnGap
    }
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    groups.forEach((group) => observer.observe(group))
    measure()
    return () => observer.disconnect()
  }, [layout, className, style, children])
  const hasHeader = children !== undefined && children !== null
  const headerHeight = hasHeader
    ? showColumnLabels
      ? cssValue.headerHeight
      : cssValue.titleOnlyHeaderHeight
    : '0px'
  const boardProps = classProps(styles.board)

  return (
    <figure
      ref={boardRef}
      {...dataAttributes}
      {...boardProps}
      aria-label={ariaLabel}
      className={[boardProps.className, className].filter(Boolean).join(' ')}
      data-slot="split-flap-board"
      style={style}
    >
      <span {...classProps(styles.srOnly)} aria-live="polite">
        {liveBoardText(layout)}
      </span>
      <span {...classProps(styles.outerRim)} aria-hidden="true" />
      <span {...classProps(styles.boardSheen)} aria-hidden="true" />
      <BoardGrain opacity={grainOpacity} />
      <div
        {...classProps(styles.boardContent)}
        style={
          {
            '--flapkit-rendered-header-height': headerHeight,
          } as CSSProperties
        }
      >
        <span {...classProps(styles.innerRim)} aria-hidden="true" />
        {hasHeader && (
          <div {...classProps(styles.boardHeader)}>
            {children}
            {showColumnLabels && (
              <div ref={labelsRef} {...classProps(styles.boardColumnLabels)}>
                {layout.columns.map((column) => (
                  <span key={column.id} {...classProps(styles.boardColumnLabel)}>
                    {column.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <GridContent />
      </div>
    </figure>
  )
}
