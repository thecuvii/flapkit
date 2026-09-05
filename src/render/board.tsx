'use client'

// Board and grid renderers for the Flapkit component model.

import { memo, useId, type CSSProperties, type ReactNode } from 'react'
import { useSplitFlap } from '../motion/provider'
import type { ResolvedSplitFlapSource } from '../layout'
import { MotionCanvas } from './canvas'
import { BoardRow } from './cassette'
import { classProps, styles } from './classes'
import { cssValue } from './css-values'

function splitFlapColumnTracks(layout: ResolvedSplitFlapSource) {
  return layout.columns
    .map((column) => `calc(${column.cells * column.cassetteSpan} * ${cssValue.cellTrack})`)
    .join(' ')
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

export type BoardViewProps = {
  'aria-label'?: string
  children?: ReactNode
  className?: string
  columnGap?: number
  groupGap?: number
  grainOpacity?: number
  rowGap?: number
  showColumnLabels?: boolean
  style?: CSSProperties
}

export type GridViewProps = {
  'aria-label'?: string
  className?: string
  columnGap?: number
  groupGap?: number
  rowGap?: number
  style?: CSSProperties
}

function splitFlapGridWidth(layout: ResolvedSplitFlapSource, groupGap: number) {
  const trackCount = layout.columns.reduce(
    (count, column) => count + column.cells * column.cassetteSpan,
    0,
  )
  return `calc(${trackCount} * ${cssValue.cellTrack} + ${Math.max(0, layout.columns.length - 1) * groupGap} * ${cssValue.boardUnit})`
}

function GridContent({
  columnGap,
  groupGap,
  rowGap,
}: {
  columnGap: number
  groupGap: number
  rowGap: number
}) {
  const { controller, layout, motion, presentation } = useSplitFlap()
  const canvasGeometryKey = `${layout.layoutKey}:${columnGap}:${groupGap}:${rowGap}:${JSON.stringify(presentation)}`

  return (
    <div
      {...classProps(styles.grid)}
      aria-hidden="true"
      style={{
        gridTemplateRows: `repeat(${layout.rows.length}, max-content)`,
        rowGap: `calc(${rowGap} * ${cssValue.boardUnit})`,
      }}
    >
      {layout.rows.map((row, rowIndex) => (
        <BoardRow
          key={row.id}
          columnGap={columnGap}
          controller={controller}
          detailed={motion.variant === 'scrub'}
          groupGap={groupGap}
          layout={layout}
          rowIndex={rowIndex}
          presentation={presentation.rows[rowIndex]}
        />
      ))}
      {motion.variant !== 'scrub' && <MotionCanvas geometryKey={canvasGeometryKey} />}
    </div>
  )
}

export function GridView({
  'aria-label': ariaLabel = 'Split-flap display grid',
  className,
  columnGap = 0.28,
  groupGap = 0.8,
  rowGap = 0.4,
  style,
}: GridViewProps) {
  const { layout } = useSplitFlap()
  const gridProps = classProps(styles.standaloneGrid)

  return (
    <figure
      {...gridProps}
      aria-label={ariaLabel}
      className={[gridProps.className, className].filter(Boolean).join(' ')}
      data-slot="split-flap-grid"
      style={
        {
          width: splitFlapGridWidth(layout, groupGap),
          ...style,
        } as CSSProperties
      }
    >
      <GridContent columnGap={columnGap} groupGap={groupGap} rowGap={rowGap} />
    </figure>
  )
}

export function BoardView({
  'aria-label': ariaLabel = 'Split-flap display board',
  children,
  className,
  columnGap = 0.28,
  groupGap = 0.8,
  grainOpacity = 0.32,
  rowGap = 0.4,
  showColumnLabels = true,
  style,
}: BoardViewProps) {
  const { layout } = useSplitFlap()
  const hasHeader = children !== undefined && children !== null
  const headerHeight = hasHeader
    ? showColumnLabels
      ? cssValue.headerHeight
      : cssValue.titleOnlyHeaderHeight
    : '0px'
  const columnTracks = splitFlapColumnTracks(layout)
  const groupGapSize = `calc(${groupGap} * ${cssValue.boardUnit})`
  const boardWidth = `calc(${cssValue.frameLeft} + ${splitFlapGridWidth(layout, groupGap)} + ${cssValue.frameRight})`
  const boardProps = classProps(styles.board)

  return (
    <figure
      {...boardProps}
      aria-label={ariaLabel}
      className={[boardProps.className, className].filter(Boolean).join(' ')}
      data-slot="split-flap-board"
      style={style}
    >
      <div
        {...classProps(styles.boardContent)}
        style={
          {
            '--flapkit-rendered-header-height': headerHeight,
            width: boardWidth,
          } as CSSProperties
        }
      >
        <span {...classProps(styles.outerRim)} aria-hidden="true" />
        <span {...classProps(styles.innerRim)} aria-hidden="true" />
        <span {...classProps(styles.boardSheen)} aria-hidden="true" />
        <BoardGrain opacity={grainOpacity} />
        {hasHeader && (
          <div {...classProps(styles.boardHeader)}>
            {children}
            {showColumnLabels && (
              <div
                {...classProps(styles.boardColumnLabels)}
                style={{ columnGap: groupGapSize, gridTemplateColumns: columnTracks }}
              >
                {layout.columns.map((column) => (
                  <span key={column.id} {...classProps(styles.boardColumnLabel)}>
                    {column.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <GridContent columnGap={columnGap} groupGap={groupGap} rowGap={rowGap} />
      </div>
    </figure>
  )
}
