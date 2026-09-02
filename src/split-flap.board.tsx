'use client'

import * as stylex from '@stylexjs/stylex'
import { memo, useId, type CSSProperties, type ReactNode } from 'react'
import { SplitFlapMotionCanvas } from './split-flap.canvas'
import { SplitFlapBoardRow } from './split-flap.cassette'
import { useSplitFlap } from './split-flap.context'
import { splitFlapLook } from './split-flap-look.stylex'
import { splitFlapMaterialStyle, type SplitFlapStyle } from './split-flap.material'
import type { ResolvedSplitFlapSource } from './split-flap.source'
import { styles } from './split-flap.styles'

function splitFlapColumnTracks(layout: ResolvedSplitFlapSource) {
  return layout.columns
    .map((column) => `calc(${column.cells * column.cassetteSpan} * ${splitFlapLook.cellTrack})`)
    .join(' ')
}

const BoardGrain = memo(function BoardGrain({ opacity }: { opacity: number }) {
  const filterId = useId()
  const fineGrainId = `${filterId}-fine-grain`
  const coarseGrainId = `${filterId}-coarse-grain`

  return (
    <svg
      {...stylex.props(styles.boardGrain)}
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

export type SplitFlapBoardProps = {
  'aria-label'?: string
  children?: ReactNode
  className?: string
  columnGap?: number
  groupGap?: number
  grainOpacity?: number
  rowGap?: number
  showColumnLabels?: boolean
  style?: SplitFlapStyle
}

export type SplitFlapGridProps = {
  'aria-label'?: string
  className?: string
  columnGap?: number
  groupGap?: number
  rowGap?: number
  style?: SplitFlapStyle
}

function splitFlapGridWidth(layout: ResolvedSplitFlapSource, groupGap: number) {
  const trackCount = layout.columns.reduce(
    (count, column) => count + column.cells * column.cassetteSpan,
    0,
  )
  return `calc(${trackCount} * ${splitFlapLook.cellTrack} + ${Math.max(0, layout.columns.length - 1) * groupGap} * ${splitFlapLook.boardUnit})`
}

function SplitFlapGridContent({
  columnGap,
  groupGap,
  rowGap,
}: {
  columnGap: number
  groupGap: number
  rowGap: number
}) {
  const { controller, layout, material, motion } = useSplitFlap()
  const canvasGeometryKey = [
    layout.layoutKey,
    columnGap,
    groupGap,
    rowGap,
    material.faceInsetX,
    material.faceInsetY,
    material.glyphSize,
    material.glyphY,
    material.spareLeafCount,
    Number(material.stackedEdges),
  ].join(':')

  return (
    <div
      {...stylex.props(styles.grid)}
      aria-hidden="true"
      style={{
        gridTemplateRows: `repeat(${layout.rows.length}, max-content)`,
        rowGap: `calc(${rowGap} * ${splitFlapLook.boardUnit})`,
      }}
    >
      {layout.rows.map((row, rowIndex) => (
        <SplitFlapBoardRow
          key={row.id}
          columnGap={columnGap}
          controller={controller}
          groupGap={groupGap}
          layout={layout}
          rowIndex={rowIndex}
          tuning={material}
        />
      ))}
      {motion.variant === 'riffle' && <SplitFlapMotionCanvas geometryKey={canvasGeometryKey} />}
    </div>
  )
}

export function SplitFlapGrid({
  'aria-label': ariaLabel = 'Split-flap display grid',
  className,
  columnGap = 0.28,
  groupGap = 0.8,
  rowGap = 0.4,
  style,
}: SplitFlapGridProps) {
  const { layout, material } = useSplitFlap()
  const gridProps = stylex.props(styles.standaloneGrid)

  return (
    <figure
      {...gridProps}
      aria-label={ariaLabel}
      className={[gridProps.className, className].filter(Boolean).join(' ')}
      data-slot="split-flap-grid"
      style={
        {
          ...splitFlapMaterialStyle(material),
          width: splitFlapGridWidth(layout, groupGap),
          ...style,
        } as CSSProperties
      }
    >
      <SplitFlapGridContent columnGap={columnGap} groupGap={groupGap} rowGap={rowGap} />
    </figure>
  )
}

export function SplitFlapBoard({
  'aria-label': ariaLabel = 'Split-flap display board',
  children,
  className,
  columnGap = 0.28,
  groupGap = 0.8,
  grainOpacity = 0.32,
  rowGap = 0.4,
  showColumnLabels = true,
  style,
}: SplitFlapBoardProps) {
  const { layout, material } = useSplitFlap()
  const hasHeader = children !== undefined && children !== null
  const headerHeight = hasHeader
    ? showColumnLabels
      ? splitFlapLook.headerHeight
      : splitFlapLook.titleOnlyHeaderHeight
    : '0px'
  const columnTracks = splitFlapColumnTracks(layout)
  const groupGapSize = `calc(${groupGap} * ${splitFlapLook.boardUnit})`
  const boardWidth = `calc(${splitFlapLook.frameLeft} + ${splitFlapGridWidth(layout, groupGap)} + ${splitFlapLook.frameRight})`
  const boardProps = stylex.props(styles.board)

  return (
    <figure
      {...boardProps}
      aria-label={ariaLabel}
      className={[boardProps.className, className].filter(Boolean).join(' ')}
      data-slot="split-flap-board"
      style={{ ...splitFlapMaterialStyle(material), ...style }}
    >
      <div
        {...stylex.props(styles.boardContent)}
        style={
          {
            '--split-flap-header-height': headerHeight,
            width: boardWidth,
          } as CSSProperties
        }
      >
        <span {...stylex.props(styles.outerRim)} aria-hidden="true" />
        <span {...stylex.props(styles.innerRim)} aria-hidden="true" />
        <span {...stylex.props(styles.boardSheen)} aria-hidden="true" />
        <BoardGrain opacity={grainOpacity} />
        {hasHeader && (
          <div {...stylex.props(styles.boardHeader)}>
            {children}
            {showColumnLabels && (
              <div
                {...stylex.props(styles.boardColumnLabels)}
                style={{ columnGap: groupGapSize, gridTemplateColumns: columnTracks }}
              >
                {layout.columns.map((column) => (
                  <span key={column.id} {...stylex.props(styles.boardColumnLabel)}>
                    {column.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <SplitFlapGridContent columnGap={columnGap} groupGap={groupGap} rowGap={rowGap} />
      </div>
    </figure>
  )
}
