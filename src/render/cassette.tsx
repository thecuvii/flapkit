'use client'

// DOM cassette renderer shared by the motion adapters.

import { memo, useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import {
  glyphOffsetValues,
  spareLeafStep,
  spareLeafXOffsets,
  splitFlapLeafBrightnessVariation,
  splitFlapReferenceTracks,
  splitFlapSpareLeafCount,
} from '../motion/constants'
import { signedLeafNoise, type SplitFlapMotionController } from '../motion/runtime'
import type { ResolvedSplitFlapCell, ResolvedSplitFlapSource } from '../layout'
import { classProps, glyphOffsets, styles } from './classes'
import { cssValue as splitFlapLook } from './css-values'

function splitFlapColumnTracks(layout: ResolvedSplitFlapSource) {
  return layout.columns
    .map((column) => `calc(${column.cells * column.cassetteSpan} * ${splitFlapLook.cellTrack})`)
    .join(' ')
}

/** Short numeric token for a custom property; trims trailing zeros. */
function token(value: number, digits = 4) {
  const fixed = value.toFixed(digits).replace(/\.?0+$/, '')
  return fixed === '' || fixed === '-0' || fixed === '-' ? '0' : fixed
}

/**
 * Per-cell wear as custom properties on the cassette root. `flapkit.css` composes them into
 * the shared gradients, so every cassette carries a few hundred bytes instead of the full
 * material strings. The numbers mirror the canvas renderer (see canvas.tsx).
 */
function cellWearStyle(index: number, detailed: boolean) {
  const wearStrength = 0.8
  const wearVariation = 0.65
  const brightnessVariation = splitFlapLeafBrightnessVariation
  const topWearNoise = signedLeafNoise(index, 17)
  const bottomWearNoise = signedLeafNoise(index, 43)
  const wear = (noise: number) =>
    Math.max(0, Math.min(2.5, wearStrength * (1 + noise * 0.42 * wearVariation)))
  const topWearStrength = wear(topWearNoise)
  const bottomWearStrength = wear(bottomWearNoise)
  const topBrightness = 1 + signedLeafNoise(index, 7) * brightnessVariation
  const bottomBrightness = 1 + signedLeafNoise(index, 31) * brightnessVariation
  const saturation = (noise: number) => Math.max(0.88, 1 - Math.max(0, noise) * 0.08 * wearVariation)
  const mottleRange = 32 * Math.min(wearVariation, 1)
  const mottle = (salt: number) => `${Math.round(50 + signedLeafNoise(index, salt) * mottleRange)}%`
  const scratchX = (salt: number) => `${Math.round(50 + signedLeafNoise(index, salt) * 34)}%`
  const scratchOpacity = (strength: number) => Math.min(0.08, 0.032 * strength * wearVariation)
  const hasTopScratch = wearVariation > 0 && signedLeafNoise(index, 139) > 0.56
  const hasBottomScratch = wearVariation > 0 && signedLeafNoise(index, 163) > 0.54
  // Flat wash approximating the detailed path's brightness filter on the compact faces.
  const brightnessLayer = (brightness: number) => {
    const difference = Math.abs(brightness - 1)
    const channel = brightness >= 1 ? '255, 255, 255' : '0, 0, 0'
    return `rgba(${channel}, ${token(Math.min(0.16, difference * 0.9))})`
  }

  const style: Record<string, string> = {
    '--fk-gx': `${glyphOffsetValues[index % glyphOffsetValues.length]}cqw`,
    '--fk-tsa': `${96 + Math.round(signedLeafNoise(index, 149) * 7)}deg`,
    '--fk-tsx': scratchX(109),
    '--fk-tso': hasTopScratch ? token(scratchOpacity(topWearStrength)) : '0',
    '--fk-tmx': mottle(53),
    '--fk-tmy': mottle(67),
    '--fk-tma': token(0.025 * topWearStrength),
    '--fk-bsa': `${98 + Math.round(signedLeafNoise(index, 173) * 7)}deg`,
    '--fk-bsx': scratchX(127),
    '--fk-bso': hasBottomScratch ? token(scratchOpacity(bottomWearStrength)) : '0',
    '--fk-bmx': mottle(79),
    '--fk-bmy': mottle(97),
    '--fk-bma': token(0.03 * bottomWearStrength),
  }
  if (detailed) {
    style['--fk-tb'] = topBrightness.toFixed(3)
    style['--fk-ts'] = saturation(topWearNoise).toFixed(3)
    style['--fk-bb'] = bottomBrightness.toFixed(3)
    style['--fk-bs'] = saturation(bottomWearNoise).toFixed(3)
  } else {
    style['--fk-tbl'] = brightnessLayer(topBrightness)
    style['--fk-bbl'] = brightnessLayer(bottomBrightness)
  }

  const spareLeafVariation = 1
  const spareLeafCount = splitFlapSpareLeafCount
  const spareLeafRevealScale = 1 + signedLeafNoise(index, 181) * 0.14 * spareLeafVariation
  const spareLeafGroupX = signedLeafNoise(index, 187) * 0.035 * spareLeafVariation
  spareLeafXOffsets.slice(0, spareLeafCount).forEach((baseXOffset, leafIndex) => {
    const layerProgress = leafIndex / Math.max(1, spareLeafCount - 1)
    const brightness = Math.min(
      0.99,
      (0.78 + layerProgress * 0.2) *
        (1 + signedLeafNoise(index, 191 + leafIndex * 17) * brightnessVariation * 0.7),
    )
    const wearNoise = signedLeafNoise(index, 211 + leafIndex * 19)
    const leafSaturation = Math.max(0.86, 1 - Math.max(0, wearNoise) * wearVariation * 0.06)
    const edgeStrength =
      1 -
      (0.12 + ((signedLeafNoise(index, 229 + leafIndex * 23) + 1) / 2) * 0.16) * spareLeafVariation
    const edgeMix = Math.round(Math.min(70, brightness * edgeStrength * 80))
    const bottomOffset =
      leafIndex *
      spareLeafStep *
      (spareLeafRevealScale +
        signedLeafNoise(index, 277 + leafIndex * 31) * 0.035 * spareLeafVariation)
    const shadowOpacity = Math.min(
      0.22,
      Math.max(0.12, 0.17 + signedLeafNoise(index, 307 + leafIndex * 37) * 0.05 * spareLeafVariation),
    )
    const xOffset =
      baseXOffset +
      spareLeafGroupX +
      signedLeafNoise(index, 331 + leafIndex * 41) * 0.025 * spareLeafVariation
    const prefix = `--fk-l${leafIndex}`

    style[`${prefix}-e`] = `${edgeMix}%`
    style[`${prefix}-x`] = `${token(xOffset)}cqw`
    style[`${prefix}-y`] = `${token(bottomOffset)}cqw`
    if (detailed) {
      style[`${prefix}-b`] = brightness.toFixed(3)
      style[`${prefix}-sat`] = leafSaturation.toFixed(3)
      style[`${prefix}-es`] = token(edgeStrength)
    } else {
      const darkness = Math.min(28, Math.max(0, (1 - brightness) * 100))
      style[`${prefix}-k`] = `${token(100 - darkness)}%`
      style[`${prefix}-s`] = token(shadowOpacity)
    }
  })

  return style as CSSProperties
}

function WideGlyphParts({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <span
        {...classProps(
          styles.wideGlyphPart,
          compact && styles.compactWideGlyphPart,
          styles.wideGlyphPartLeft,
        )}
        data-split-flap-glyph-part="0"
      />
      <span
        {...classProps(
          styles.wideGlyphPart,
          compact && styles.compactWideGlyphPart,
          styles.wideGlyphPartRight,
        )}
        data-split-flap-glyph-part="1"
      />
    </>
  )
}

function WideRetainers() {
  return (
    <>
      <span
        {...classProps(styles.wideRetainer, styles.wideRetainerOuterLeft)}
        data-part="retainer"
        data-slot="retainer"
      />
      <span
        {...classProps(styles.wideRetainer, styles.wideRetainerInnerLeft)}
        data-part="retainer"
        data-slot="retainer"
      />
      <span
        {...classProps(styles.wideRetainer, styles.wideRetainerInnerRight)}
        data-part="retainer"
        data-slot="retainer"
      />
      <span
        {...classProps(styles.wideRetainer, styles.wideRetainerOuterRight)}
        data-part="retainer"
        data-slot="retainer"
      />
    </>
  )
}

function Axles() {
  return (
    <>
      <span
        {...classProps(styles.axle, styles.axleLeft)}
        data-part="retainer"
        data-slot="retainer"
      />
      <span
        {...classProps(styles.axle, styles.axleRight)}
        data-part="retainer"
        data-slot="retainer"
      />
    </>
  )
}

// The seam is this layer's ::before; only the retainers need their own boxes.
function CompactHardware({ wide }: { wide: boolean }) {
  return (
    <span {...classProps(styles.compactHardware)} data-slot="hardware">
      {wide ? <WideRetainers /> : <Axles />}
    </span>
  )
}

function FaceGlyph({
  glyphOffset,
  glyphRef,
  lower,
  wide = false,
}: {
  glyphOffset: (typeof glyphOffsets)[number]
  glyphRef: RefObject<HTMLSpanElement | null>
  lower: boolean
  wide?: boolean
}) {
  return (
    <span {...classProps(styles.glyphHalf, lower ? styles.bottomGlyphHalf : styles.topGlyphHalf)}>
      <span
        ref={glyphRef}
        {...classProps(styles.glyph, glyphOffset, wide && styles.wideGlyphCarrier)}
        data-split-flap-wide-glyph={wide || undefined}
      >
        {wide && <WideGlyphParts />}
      </span>
    </span>
  )
}

// One compact leaf half. The glyph is the ::before pseudo-element reading `data-glyph`.
function CompactFace({
  faceRef,
  lower,
  moving = false,
  slot,
  wide,
}: {
  faceRef: RefObject<HTMLSpanElement | null>
  lower: boolean
  moving?: boolean
  slot: string
  wide: boolean
}) {
  return (
    <span
      ref={faceRef}
      {...classProps(
        styles.compactGlyphCarrier,
        lower ? styles.compactLower : styles.compactUpper,
        moving ? styles.movingVaneFace : styles.compactStaticFace,
        moving
          ? styles.compactMovingVaneFace
          : lower
            ? styles.compactStaticBottom
            : styles.compactStaticTop,
        wide && styles.compactWideGlyphCarrier,
      )}
      data-part="face"
      data-glyph=""
      data-slot={slot}
      data-split-flap-compact-glyph
      data-split-flap-wide-glyph={wide || undefined}
    >
      {wide && <WideGlyphParts compact />}
    </span>
  )
}

export const FlapCell = memo(function FlapCell({
  cell,
  controller,
  detailed = false,
  className,
}: {
  cell: ResolvedSplitFlapCell
  controller: SplitFlapMotionController
  detailed?: boolean
  className?: string
}) {
  const { index } = cell
  const wide = cell.span === 2
  const rootRef = useRef<HTMLSpanElement>(null)
  const outgoingLowerRef = useRef<HTMLSpanElement>(null)
  const outgoingLowerGlyphRef = useRef<HTMLSpanElement>(null)
  const arrivingUpperRef = useRef<HTMLSpanElement>(null)
  const arrivingUpperGlyphRef = useRef<HTMLSpanElement>(null)
  const movingVaneRef = useRef<HTMLSpanElement>(null)
  const movingFrontGlyphRef = useRef<HTMLSpanElement>(null)
  const movingBackGlyphRef = useRef<HTMLSpanElement>(null)
  const compactMovingStackRef = useRef<HTMLSpanElement>(null)
  const spareLeafPackRef = useRef<HTMLSpanElement>(null)
  const glyphOffset = glyphOffsets[index % glyphOffsets.length]
  const wearStyle = cellWearStyle(index, detailed)

  // The view registers once per mount; the controller toggles compact 3D motion by attribute.
  useEffect(() => {
    const outgoingLowerGlyph = detailed ? outgoingLowerGlyphRef.current : outgoingLowerRef.current
    const arrivingUpperGlyph = detailed ? arrivingUpperGlyphRef.current : arrivingUpperRef.current
    const movingFrontGlyph = movingFrontGlyphRef.current
    const movingBackGlyph = movingBackGlyphRef.current
    const movingVane = movingVaneRef.current
    const spareLeafPack = detailed
      ? (spareLeafPackRef.current ?? rootRef.current)
      : compactMovingStackRef.current

    if (
      !rootRef.current ||
      !outgoingLowerRef.current ||
      !(outgoingLowerGlyph instanceof HTMLSpanElement) ||
      !arrivingUpperRef.current ||
      !(arrivingUpperGlyph instanceof HTMLSpanElement) ||
      !movingVane ||
      !(movingFrontGlyph instanceof HTMLSpanElement) ||
      !(movingBackGlyph instanceof HTMLSpanElement) ||
      !spareLeafPack
    ) {
      return
    }

    return controller.registerView(index, {
      animations: [],
      arrivingUpper: arrivingUpperRef.current,
      arrivingUpperGlyph,
      compact: !detailed,
      compactMotion: false,
      movingBackGlyph,
      movingFrontGlyph,
      movingVane,
      outgoingLower: outgoingLowerRef.current,
      outgoingLowerGlyph,
      root: rootRef.current,
      spareLeafPack,
    })
  }, [controller, detailed, index])

  if (!detailed) {
    return (
      <span
        ref={rootRef}
        {...classProps(styles.cassette, styles.compactCassette, className)}
        data-slot="cassette"
        data-split-flap-cassette
        data-split-flap-index={index}
        style={wearStyle}
      >
        <span {...classProps(styles.cell, styles.compactCell)} data-slot="cassette-base">
          <CompactFace faceRef={outgoingLowerRef} lower slot="stationary-lower" wide={wide} />
          <CompactFace faceRef={arrivingUpperRef} lower={false} slot="stationary-upper" wide={wide} />
          {/* Mounted permanently; hidden by CSS until the controller marks the cassette active. */}
          <span
            ref={compactMovingStackRef}
            {...classProps(styles.compactMovingStack)}
            data-slot="moving-spare-leaves"
          />
          <span
            ref={movingVaneRef}
            {...classProps(styles.movingVane, styles.compactMovingVane)}
            data-slot="moving-leaf"
          >
            <CompactFace
              faceRef={movingFrontGlyphRef}
              lower={false}
              moving
              slot="moving-leaf-front"
              wide={wide}
            />
            <CompactFace
              faceRef={movingBackGlyphRef}
              lower
              moving
              slot="moving-leaf-back"
              wide={wide}
            />
          </span>
        </span>
        <CompactHardware wide={wide} />
      </span>
    )
  }

  return (
    <span
      ref={rootRef}
      {...classProps(styles.cassette, className)}
      data-slot="cassette"
      data-split-flap-cassette
      data-split-flap-index={index}
      style={wearStyle}
    >
      <span {...classProps(styles.cell)} data-slot="cassette-base">
        <span {...classProps(styles.cellScene)} data-slot="leaf-pack">
          <span {...classProps(styles.cavityBackPlane)} />
          <span {...classProps(styles.cavityWall, styles.cavityWallTop)} />
          <span {...classProps(styles.cavityWall, styles.cavityWallRight)} />
          <span {...classProps(styles.cavityWall, styles.cavityWallBottom)} />
          <span {...classProps(styles.cavityWall, styles.cavityWallLeft)} />
          <span ref={spareLeafPackRef} {...classProps(styles.spareLeafPack)}>
            {Array.from({ length: splitFlapSpareLeafCount }, (_, leafIndex) => (
              <span key={leafIndex} {...classProps(styles.spareLeafPlate)} />
            ))}
          </span>
          <span ref={outgoingLowerRef} {...classProps(styles.faceLayer, styles.outgoingLower)}>
            <span
              {...classProps(styles.face, styles.bottomFace)}
              data-part="face"
              data-slot="face"
            />
            <FaceGlyph
              glyphOffset={glyphOffset}
              glyphRef={outgoingLowerGlyphRef}
              lower
              wide={wide}
            />
          </span>
          <span ref={arrivingUpperRef} {...classProps(styles.faceLayer, styles.arrivingUpper)}>
            <span {...classProps(styles.face, styles.topFace)} data-part="face" data-slot="face" />
            <FaceGlyph
              glyphOffset={glyphOffset}
              glyphRef={arrivingUpperGlyphRef}
              lower={false}
              wide={wide}
            />
          </span>
          <span ref={movingVaneRef} {...classProps(styles.movingVane)} data-slot="moving-leaf">
            <span {...classProps(styles.movingVaneFace, styles.movingVaneFront)}>
              <span
                {...classProps(styles.face, styles.topFace)}
                data-part="face"
                data-slot="face"
              />
              <FaceGlyph
                glyphOffset={glyphOffset}
                glyphRef={movingFrontGlyphRef}
                lower={false}
                wide={wide}
              />
            </span>
            <span {...classProps(styles.movingVaneFace, styles.movingVaneBack)}>
              <span
                {...classProps(styles.face, styles.bottomFace)}
                data-part="face"
                data-slot="face"
              />
              <FaceGlyph
                glyphOffset={glyphOffset}
                glyphRef={movingBackGlyphRef}
                lower
                wide={wide}
              />
            </span>
            <span {...classProps(styles.movingVaneSide, styles.movingVaneSideLeft)} />
            <span {...classProps(styles.movingVaneSide, styles.movingVaneSideRight)} />
          </span>
          <span {...classProps(styles.seam)} />
          {wide ? <WideRetainers /> : <Axles />}
          <span {...classProps(styles.cassetteBezel)} />
        </span>
      </span>
      <span {...classProps(styles.cassetteCover, styles.cassetteCoverTop)} data-slot="cover" />
      <span {...classProps(styles.cassetteCover, styles.cassetteCoverRight)} data-slot="cover" />
      <span {...classProps(styles.cassetteCover, styles.cassetteCoverBottom)} data-slot="cover" />
      <span {...classProps(styles.cassetteCover, styles.cassetteCoverLeft)} data-slot="cover" />
    </span>
  )
})

export const BoardRow = memo(function BoardRow({
  columnGap,
  controller,
  detailed = false,
  groupGap,
  layout,
  rowIndex,
  presentation,
}: {
  columnGap: number
  controller: SplitFlapMotionController
  detailed?: boolean
  groupGap: number
  layout: ResolvedSplitFlapSource
  rowIndex: number
  presentation?: {
    className?: string
    groups: Array<{ className?: string; cells: Array<{ className?: string }> }>
  }
}) {
  const row = layout.rows[rowIndex]
  const columnTracks = splitFlapColumnTracks(layout)
  // Highlight mixes are resolved in CSS; the row only publishes the strength once.
  const highlightStyle = row.highlighted
    ? { '--fk-hlf': '12%', '--fk-hlfi': '88%', '--fk-hlg': '70%', '--fk-hlgi': '30%' }
    : undefined

  return (
    <div
      {...classProps(styles.departureRow, presentation?.className)}
      data-slot="row"
      data-split-flap-row
      data-split-flap-row-id={row.id}
      style={
        {
          ...highlightStyle,
          columnGap: `calc(${groupGap} * ${splitFlapLook.boardUnit})`,
          gridTemplateColumns: columnTracks,
        } as CSSProperties
      }
    >
      {layout.columns.map((column, columnIndex) => (
        <div
          key={column.id}
          {...classProps(styles.departureGroup, presentation?.groups[columnIndex]?.className)}
          data-slot="group"
          data-split-flap-group={column.id}
        >
          <div
            {...classProps(styles.departureGroupScaleContext)}
            data-split-flap-scale-context
            style={{
              width: `calc(${splitFlapReferenceTracks} * ${splitFlapLook.cellTrack})`,
            }}
          >
            <div
              {...classProps(styles.departureGroupGrid)}
              style={{
                columnGap: `${columnGap}cqw`,
                gridTemplateColumns: `repeat(${column.cells}, minmax(0, 1fr))`,
                width: `calc(${column.cells * column.cassetteSpan} * ${splitFlapLook.cellTrack})`,
              }}
            >
              {Array.from({ length: column.cells }, (_, cassetteIndex) => {
                const cell =
                  layout.cells[rowIndex * layout.rowCellCount + column.offset + cassetteIndex]
                return (
                  <FlapCell
                    key={cell.id}
                    cell={cell}
                    controller={controller}
                    detailed={detailed}
                    className={presentation?.groups[columnIndex]?.cells[cassetteIndex]?.className}
                  />
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})
