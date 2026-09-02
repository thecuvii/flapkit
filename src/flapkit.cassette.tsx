'use client'

// DOM cassette renderer shared by the motion adapters.

import { memo, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import {
  activeLeafClearance,
  glyphOffsetValues,
  lowerGlyphXOffset,
  spareLeafStep,
  spareLeafXOffsets,
  splitFlapLeafBrightnessVariation,
  splitFlapReferenceTracks,
  splitFlapSpareLeafCount,
} from './flapkit.constants'
import { cssValue as splitFlapLook } from './flapkit.css-values'
import {
  activeGlyphColorProperty,
  signedLeafNoise,
  stackShiftProperty,
  type SplitFlapMotionController,
} from './flapkit.runtime'
import type {
  ResolvedSplitFlapCell,
  ResolvedSplitFlapSource,
  SplitFlapVariant,
} from './flapkit.source'
import { classProps, glyphOffsets, styles } from './flapkit.classes'

function splitFlapColumnTracks(layout: ResolvedSplitFlapSource) {
  return layout.columns
    .map((column) => `calc(${column.cells * column.cassetteSpan} * ${splitFlapLook.cellTrack})`)
    .join(' ')
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
        data-position="outer-left"
        data-slot="retainer"
      />
      <span
        {...classProps(styles.wideRetainer, styles.wideRetainerInnerLeft)}
        data-position="inner-left"
        data-slot="retainer"
      />
      <span
        {...classProps(styles.wideRetainer, styles.wideRetainerInnerRight)}
        data-position="inner-right"
        data-slot="retainer"
      />
      <span
        {...classProps(styles.wideRetainer, styles.wideRetainerOuterRight)}
        data-position="outer-right"
        data-slot="retainer"
      />
    </>
  )
}

function CompactHardware({ wide }: { wide: boolean }) {
  return (
    <span {...classProps(styles.compactHardware)} data-slot="hardware">
      <span {...classProps(styles.compactSeam)} data-slot="seam" />
      {wide ? (
        <WideRetainers />
      ) : (
        <>
          <span
            {...classProps(styles.axle, styles.axleLeft)}
            data-position="left"
            data-slot="retainer"
          />
          <span
            {...classProps(styles.axle, styles.axleRight)}
            data-position="right"
            data-slot="retainer"
          />
        </>
      )}
    </span>
  )
}

function FaceGlyph({
  activeBottomInset,
  color,
  glyphOffset,
  glyphRef,
  glyphStyle,
  lower,
  moving = false,
  wide = false,
}: {
  activeBottomInset: string
  color: string
  glyphOffset: (typeof glyphOffsets)[number]
  glyphRef: RefObject<HTMLSpanElement | null>
  glyphStyle: CSSProperties
  lower: boolean
  moving?: boolean
  wide?: boolean
}) {
  return (
    <span
      {...classProps(
        styles.glyphHalf,
        lower ? styles.bottomGlyphHalf : styles.topGlyphHalf,
        moving && styles.movingGlyphHalf,
      )}
      style={lower ? { clipPath: `inset(50% 0 ${activeBottomInset} 0)` } : undefined}
    >
      <span
        ref={glyphRef}
        {...classProps(styles.glyph, glyphOffset, wide && styles.wideGlyphCarrier)}
        data-split-flap-wide-glyph={wide || undefined}
        style={
          {
            ...glyphStyle,
            color: `var(${activeGlyphColorProperty}, ${color})`,
            textShadow: `0 0 ${lower ? '0.04' : '0.05'}cqw color-mix(in srgb, var(${activeGlyphColorProperty}, ${color}) ${lower ? 5 : 6}%, transparent)`,
            top: splitFlapLook.glyphY,
            transform: `translateX(-50%)${lower ? ` translateX(${lowerGlyphXOffset}cqw)` : ''}${wide ? '' : ` scaleX(${splitFlapLook.glyphWidth}) scaleY(0.78)`}`,
            '--wide-glyph-transform': `scaleX(${splitFlapLook.glyphWidth}) scaleY(0.78)`,
          } as CSSProperties
        }
      >
        {wide && <WideGlyphParts />}
      </span>
    </span>
  )
}

const FlapCell = memo(function FlapCell({
  cell,
  controller,
  detailed = false,
  highlighted,
  className,
}: {
  cell: ResolvedSplitFlapCell
  controller: SplitFlapMotionController
  detailed?: boolean
  highlighted: boolean
  className?: string
}) {
  const { index } = cell
  const [css3dMotion, setCss3dMotion] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const compactCellRef = useRef<HTMLSpanElement>(null)
  const outgoingLowerRef = useRef<HTMLSpanElement>(null)
  const outgoingLowerGlyphRef = useRef<HTMLSpanElement>(null)
  const arrivingUpperRef = useRef<HTMLSpanElement>(null)
  const arrivingUpperGlyphRef = useRef<HTMLSpanElement>(null)
  const movingVaneRef = useRef<HTMLSpanElement>(null)
  const movingFrontGlyphRef = useRef<HTMLSpanElement>(null)
  const movingBackGlyphRef = useRef<HTMLSpanElement>(null)
  const lowerMotionShadowRef = useRef<HTMLSpanElement>(null)
  const compactMovingStackRef = useRef<HTMLSpanElement>(null)
  const spareLeafPackRef = useRef<HTMLSpanElement>(null)
  const glyphOffset = glyphOffsets[index % glyphOffsets.length]
  const glyphOffsetValue = glyphOffsetValues[index % glyphOffsetValues.length]

  useEffect(() => {
    if (detailed) return
    return controller.subscribeCssCassette(index, setCss3dMotion)
  }, [controller, detailed, index])

  const highlightFacePercent = highlighted ? 12 : 0
  const highlightGlyphPercent = highlighted ? 70 : 0
  const topFaceColor = `color-mix(in srgb, ${splitFlapLook.topFaceColor} ${100 - highlightFacePercent}%, ${splitFlapLook.highlightFace} ${highlightFacePercent}%)`
  const bottomFaceColor = `color-mix(in srgb, ${splitFlapLook.bottomFaceColor} ${100 - highlightFacePercent}%, ${splitFlapLook.highlightFace} ${highlightFacePercent}%)`
  const glyphColorsForVariant = (variant: SplitFlapVariant) => {
    const baseColor =
      variant === 'orange'
        ? splitFlapLook.glyphOrange
        : variant === 'yellow'
          ? splitFlapLook.glyphYellow
          : splitFlapLook.glyphWhite
    const top = `color-mix(in srgb, ${baseColor} ${100 - highlightGlyphPercent}%, ${splitFlapLook.highlightGlyph} ${highlightGlyphPercent}%)`
    return {
      bottom: `color-mix(in srgb, ${top} 96%, ${bottomFaceColor} 4%)`,
      top,
    }
  }
  const variantGlyphColors: Record<SplitFlapVariant, { bottom: string; top: string }> = {
    orange: glyphColorsForVariant('orange'),
    white: glyphColorsForVariant('white'),
    yellow: glyphColorsForVariant('yellow'),
  }
  const glyphColor = variantGlyphColors.white.top
  const bottomGlyphColor = variantGlyphColors.white.bottom
  const variantGlyphStyle = {
    '--flapkit-glyph-orange-bottom': variantGlyphColors.orange.bottom,
    '--flapkit-glyph-orange-top': variantGlyphColors.orange.top,
    '--flapkit-glyph-yellow-bottom': variantGlyphColors.yellow.bottom,
    '--flapkit-glyph-yellow-top': variantGlyphColors.yellow.top,
    '--flapkit-glyph-white-bottom': variantGlyphColors.white.bottom,
    '--flapkit-glyph-white-top': variantGlyphColors.white.top,
  } as CSSProperties
  const glyphStyle = {
    opacity: splitFlapLook.glyphOpacity,
    transformOrigin: '50% 0%',
    width: `calc(${cell.span} * 10cqw)`,
  }
  const wearStrength = 0.8
  const wearVariation = 0.65
  const brightnessVariation = splitFlapLeafBrightnessVariation
  const spareLeafCount = splitFlapSpareLeafCount
  const topWearNoise = signedLeafNoise(index, 17)
  const bottomWearNoise = signedLeafNoise(index, 43)
  const topWearStrength = Math.max(
    0,
    Math.min(2.5, wearStrength * (1 + topWearNoise * 0.42 * wearVariation)),
  )
  const bottomWearStrength = Math.max(
    0,
    Math.min(2.5, wearStrength * (1 + bottomWearNoise * 0.42 * wearVariation)),
  )
  const topBrightness = 1 + signedLeafNoise(index, 7) * brightnessVariation
  const bottomBrightness = 1 + signedLeafNoise(index, 31) * brightnessVariation
  const topSaturation = Math.max(0.88, 1 - Math.max(0, topWearNoise) * 0.08 * wearVariation)
  const bottomSaturation = Math.max(0.88, 1 - Math.max(0, bottomWearNoise) * 0.08 * wearVariation)
  const topFaceFilter = `brightness(${topBrightness.toFixed(3)}) saturate(${topSaturation.toFixed(3)})`
  const bottomFaceFilter = `brightness(${bottomBrightness.toFixed(3)}) saturate(${bottomSaturation.toFixed(3)})`
  const mottleRange = 32 * Math.min(wearVariation, 1)
  const topMottleX = Math.round(50 + signedLeafNoise(index, 53) * mottleRange)
  const topMottleY = Math.round(50 + signedLeafNoise(index, 67) * mottleRange)
  const bottomMottleX = Math.round(50 + signedLeafNoise(index, 79) * mottleRange)
  const bottomMottleY = Math.round(50 + signedLeafNoise(index, 97) * mottleRange)
  const topScratchX = Math.round(50 + signedLeafNoise(index, 109) * 34)
  const bottomScratchX = Math.round(50 + signedLeafNoise(index, 127) * 34)
  const topScratchOpacity = Math.min(0.08, 0.032 * topWearStrength * wearVariation)
  const bottomScratchOpacity = Math.min(0.08, 0.032 * bottomWearStrength * wearVariation)
  const topScratchImage =
    wearVariation > 0 && signedLeafNoise(index, 139) > 0.56
      ? `linear-gradient(${96 + Math.round(signedLeafNoise(index, 149) * 7)}deg, transparent ${topScratchX - 1}%, rgba(218, 210, 176, ${topScratchOpacity}) ${topScratchX}%, transparent ${topScratchX + 1.2}%)`
      : 'linear-gradient(transparent, transparent)'
  const bottomScratchImage =
    wearVariation > 0 && signedLeafNoise(index, 163) > 0.54
      ? `linear-gradient(${98 + Math.round(signedLeafNoise(index, 173) * 7)}deg, transparent ${bottomScratchX - 1}%, rgba(218, 210, 176, ${bottomScratchOpacity}) ${bottomScratchX}%, transparent ${bottomScratchX + 1.2}%)`
      : 'linear-gradient(transparent, transparent)'
  const topFaceBackground =
    `${topScratchImage}, ` +
    `radial-gradient(ellipse 68% 42% at ${topMottleX}% ${topMottleY}%, rgba(0, 0, 0, ${0.025 * topWearStrength}) 0%, transparent 72%), ` +
    splitFlapLook.topFaceSurface
  const bottomFaceBackground =
    `${bottomScratchImage}, ` +
    `radial-gradient(ellipse 72% 46% at ${bottomMottleX}% ${bottomMottleY}%, rgba(0, 0, 0, ${0.03 * bottomWearStrength}) 0%, transparent 74%), ` +
    splitFlapLook.bottomFaceSurface
  const cavityGeometryDepth = 0.52
  const seamBackground =
    `linear-gradient(90deg, rgba(4 5 3 / calc(0.98 * ${splitFlapLook.seamOpacity})) 0%, ` +
    `rgba(9 10 7 / calc(0.94 * ${splitFlapLook.seamOpacity})) 38%, ` +
    `rgba(5 6 4 / ${splitFlapLook.seamOpacity}) 78%, ` +
    `rgba(3 4 3 / calc(0.97 * ${splitFlapLook.seamOpacity})) 100%)`
  const upperSeamShadow =
    'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.035) 42%, rgba(0, 0, 0, 0.13) 100%)'
  const lowerSeamShadow =
    'linear-gradient(180deg, rgba(0, 0, 0, 0.24) 0%, rgba(0, 0, 0, 0.06) 34%, rgba(179, 173, 137, 0.025) 62%, transparent 100%)'
  const seamContactShadow =
    '0.03cqw 0.08cqw 0.14cqw rgba(0, 0, 0, 0.24), 0 -0.03cqw 0.07cqw rgba(0, 0, 0, 0.13)'
  const halfSeamThickness = `calc(${splitFlapLook.seamThickness} / 2)`
  const activeLeafReveal = activeLeafClearance + spareLeafStep * Math.max(0, spareLeafCount - 1)
  const activeBottomInset = `calc(${splitFlapLook.faceInsetY} + ${activeLeafReveal}cqw)`
  const bottomFaceBoxShadow = `${splitFlapLook.bottomFaceShadow}, 0 0.2cqw 0.32cqw rgba(0, 0, 0, 0.46), 0 -0.09cqw 0 rgba(190, 182, 143, 0.12) inset`
  const spareLeafShadowOpacity = 0.62
  const spareLeafVariation = 1
  const spareLeafRevealScale = 1 + signedLeafNoise(index, 181) * 0.14 * spareLeafVariation
  const spareLeafGroupX = signedLeafNoise(index, 187) * 0.035 * spareLeafVariation
  const spareLeaves = spareLeafXOffsets.slice(0, spareLeafCount).map((baseXOffset, leafIndex) => {
    const layerProgress = leafIndex / Math.max(1, spareLeafCount - 1)
    const brightness = Math.min(
      0.99,
      (0.78 + layerProgress * 0.2) *
        (1 + signedLeafNoise(index, 191 + leafIndex * 17) * brightnessVariation * 0.7),
    )
    const wearNoise = signedLeafNoise(index, 211 + leafIndex * 19)
    const saturation = Math.max(0.86, 1 - Math.max(0, wearNoise) * wearVariation * 0.06)
    const edgeStrength =
      1 -
      (0.12 + ((signedLeafNoise(index, 229 + leafIndex * 23) + 1) / 2) * 0.16) * spareLeafVariation
    const shadowStrength =
      1 + signedLeafNoise(index, 251 + leafIndex * 29) * 0.18 * spareLeafVariation
    const edgeMix = Math.round(Math.min(70, brightness * edgeStrength * 80))

    return {
      bottomOffset:
        leafIndex *
        spareLeafStep *
        (spareLeafRevealScale +
          signedLeafNoise(index, 277 + leafIndex * 31) * 0.035 * spareLeafVariation),
      boxShadow:
        `0 ${0.09 * shadowStrength}cqw ` +
        `${0.13 * shadowStrength}cqw ` +
        `rgba(0, 0, 0, ${Math.min(0.72, spareLeafShadowOpacity * shadowStrength)}), ` +
        `0 -0.2cqw 0 rgba(190, 182, 143, ${0.18 * edgeStrength}) inset`,
      brightness,
      edgeMix,
      leafIndex,
      saturation,
      shadowOpacity: Math.min(
        0.98,
        Math.max(
          0.8,
          0.92 + signedLeafNoise(index, 307 + leafIndex * 37) * 0.12 * spareLeafVariation,
        ),
      ),
      xOffset:
        baseXOffset +
        spareLeafGroupX +
        signedLeafNoise(index, 331 + leafIndex * 41) * 0.025 * spareLeafVariation,
    }
  })
  const sideShadowStrength = 2
  const sideShadowStop = (wall: number, extent: number) =>
    (wall + (extent - wall) * sideShadowStrength).toFixed(3)
  const bezelTopShadowOpacity = 0.86
  const cassetteBezelBackground =
    `linear-gradient(90deg, rgba(82, 83, 68, 0.5) 0, rgba(5, 6, 4, 0.96) 0.06cqw, ` +
    `rgba(0, 0, 0, 0.42) ${sideShadowStop(0.06, 0.14)}cqw, transparent ${sideShadowStop(0.06, 0.3)}cqw), ` +
    `linear-gradient(270deg, rgba(72, 73, 60, 0.44) 0, rgba(5, 6, 4, 0.94) 0.06cqw, ` +
    `rgba(0, 0, 0, 0.36) ${sideShadowStop(0.06, 0.14)}cqw, transparent ${sideShadowStop(0.06, 0.28)}cqw), ` +
    `linear-gradient(180deg, rgba(4, 5, 3, ${bezelTopShadowOpacity}) 0, ` +
    'transparent 0.44cqw), ' +
    'linear-gradient(0deg, rgba(3, 4, 2, 0.88) 0, transparent 0.18cqw)'
  const compactBrightnessLayer = (brightness: number) => {
    const difference = Math.abs(brightness - 1)
    const channel = brightness >= 1 ? '255, 255, 255' : '0, 0, 0'
    const opacity = Math.min(0.16, difference * 0.9)

    return `linear-gradient(rgba(${channel}, ${opacity}), rgba(${channel}, ${opacity}))`
  }
  const compactTopFaceBackground = [
    'linear-gradient(180deg, transparent 0%, transparent calc(50% - 0.54cqw), rgba(0, 0, 0, 0.18) 50%, transparent 50%)',
    compactBrightnessLayer(topBrightness),
    topFaceBackground,
  ].join(', ')
  const compactBottomFaceBackground = [
    'linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.31) 50%, transparent calc(50% + 0.42cqw), transparent 100%)',
    compactBrightnessLayer(bottomBrightness),
    bottomFaceBackground,
  ].join(', ')
  const compactGlyphCarrierStyle = (color: string, lower: boolean, top: string) =>
    ({
      '--compact-glyph-fallback-color': color,
      '--compact-glyph-margin-left': `${glyphOffsetValue}cqw`,
      '--compact-glyph-opacity': splitFlapLook.glyphOpacity,
      '--compact-glyph-top': top,
      '--compact-glyph-transform': `translateX(-50%)${lower ? ` translateX(${lowerGlyphXOffset}cqw)` : ''} scaleX(${splitFlapLook.glyphWidth}) scaleY(0.78)`,
      '--wide-glyph-transform': `${lower ? `translateX(${lowerGlyphXOffset}cqw) ` : ''}scaleX(${splitFlapLook.glyphWidth}) scaleY(0.78)`,
      '--compact-glyph-width': `calc(${cell.span} * 10cqw)`,
    }) as CSSProperties
  const compactSpareLeafLayers = [...spareLeaves]
    .reverse()
    .map(({ bottomOffset, brightness, edgeMix, shadowOpacity, xOffset }) => {
      const darkness = Math.min(28, Math.max(0, (1 - brightness) * 100))
      const upperColor = `color-mix(in srgb, #24251e ${100 - darkness}%, black)`
      const middleColor = `color-mix(in srgb, #171812 ${100 - darkness}%, black)`
      const lowerColor = `color-mix(in srgb, #090a07 ${100 - darkness}%, black)`
      const edgeColor = `color-mix(in srgb, #585644 ${edgeMix}%, black)`

      return `linear-gradient(180deg, ${upperColor} 0%, ${middleColor} 86%, ${edgeColor} 91%, ${edgeColor} 93%, ${lowerColor} 96%, rgba(0, 0, 0, ${shadowOpacity}) 100%) calc(50% + ${xOffset}cqw) calc(100% - ${splitFlapLook.faceInsetY} - ${bottomOffset}cqw) / calc(100% - ${splitFlapLook.faceInsetX} - ${splitFlapLook.faceInsetX} + 0.12cqw) calc(50% - ${splitFlapLook.faceInsetY}) no-repeat`
    })
  const compactCavityBackground = [
    ...compactSpareLeafLayers,
    `linear-gradient(180deg, rgba(41, 40, 37, 0.74) 0%, rgba(18, 17, 16, 0.96) 54%, rgba(5, 5, 5, 0.98) 100%) top / 100% ${cavityGeometryDepth}cqw no-repeat`,
    `linear-gradient(90deg, rgba(14, 13, 12, 0.98) 0%, rgba(31, 29, 27, 0.84) 58%, rgba(4, 4, 4, 0.98) 100%) right / ${cavityGeometryDepth}cqw 100% no-repeat`,
    `linear-gradient(0deg, rgba(4, 4, 4, 0.99) 0%, rgba(23, 22, 20, 0.9) 52%, rgba(8, 8, 8, 0.98) 100%) bottom / 100% ${cavityGeometryDepth}cqw no-repeat`,
    `linear-gradient(270deg, rgba(13, 12, 11, 0.98) 0%, rgba(29, 27, 25, 0.83) 58%, rgba(4, 4, 4, 0.98) 100%) left / ${cavityGeometryDepth}cqw 100% no-repeat`,
    'repeating-linear-gradient(180deg, transparent 0, transparent 0.28cqw, rgba(255, 255, 255, 0.016) 0.29cqw, rgba(0, 0, 0, 0.12) 0.31cqw), linear-gradient(180deg, #10100f 0%, #080808 50%, #050505 100%)',
  ].join(', ')
  const compactMovingStackBackground = [
    ...compactSpareLeafLayers,
    `linear-gradient(#050605, #050605) bottom / 100% calc(${activeLeafReveal}cqw + ${splitFlapLook.faceInsetY}) no-repeat`,
  ].join(', ')

  useEffect(() => {
    const outgoingLowerGlyph = detailed ? outgoingLowerGlyphRef.current : outgoingLowerRef.current
    const arrivingUpperGlyph = detailed ? arrivingUpperGlyphRef.current : arrivingUpperRef.current
    const movingFrontGlyph =
      detailed || css3dMotion ? movingFrontGlyphRef.current : outgoingLowerRef.current
    const movingBackGlyph =
      detailed || css3dMotion ? movingBackGlyphRef.current : arrivingUpperRef.current
    const movingVane = detailed || css3dMotion ? movingVaneRef.current : compactCellRef.current
    const lowerMotionShadow = detailed ? lowerMotionShadowRef.current : compactCellRef.current
    const spareLeafPack = detailed
      ? (spareLeafPackRef.current ?? rootRef.current)
      : (compactMovingStackRef.current ?? compactCellRef.current)

    if (
      !rootRef.current ||
      !outgoingLowerRef.current ||
      !(outgoingLowerGlyph instanceof HTMLSpanElement) ||
      !arrivingUpperRef.current ||
      !(arrivingUpperGlyph instanceof HTMLSpanElement) ||
      !movingVane ||
      !(movingFrontGlyph instanceof HTMLSpanElement) ||
      !(movingBackGlyph instanceof HTMLSpanElement) ||
      !lowerMotionShadow ||
      !spareLeafPack
    ) {
      return
    }

    return controller.registerView(index, {
      animations: [],
      arrivingUpper: arrivingUpperRef.current,
      arrivingUpperGlyph,
      compact: !detailed,
      compactMotion: !detailed && css3dMotion,
      cssRiffleDuration: null,
      cssRiffleTargetIndex: null,
      lowerMotionShadow,
      movingBackGlyph,
      movingFrontGlyph,
      movingVane,
      outgoingLower: outgoingLowerRef.current,
      outgoingLowerGlyph,
      root: rootRef.current,
      spareLeafPack,
    })
  }, [controller, css3dMotion, detailed, index])

  if (!detailed) {
    return (
      <span
        ref={rootRef}
        {...classProps(styles.cassette, styles.compactCassette, className)}
        aria-hidden="true"
        data-slot="cassette"
        data-split-flap-cassette
        data-split-flap-cassette-span={cell.span}
        data-split-flap-cell-id={cell.id}
        data-split-flap-index={index}
        style={
          {
            ...variantGlyphStyle,
            '--compact-seam-base-opacity': splitFlapLook.seamOpacity,
            '--compact-seam-height': splitFlapLook.seamThickness,
          } as CSSProperties
        }
      >
        <span
          ref={compactCellRef}
          {...classProps(styles.cell, styles.compactCell)}
          data-slot="cassette-base"
          style={
            {
              '--compact-bezel-background': cassetteBezelBackground,
              '--compact-bezel-opacity': 0.92,
              '--compact-motion-shadow-opacity': 0,
              '--compact-motion-shadow-transform': 'translate3d(0, 0, 0) scaleY(0.45)',
              background: compactCavityBackground,
              backgroundColor: splitFlapLook.cavityColor,
              boxShadow: splitFlapLook.cavityShadow,
            } as CSSProperties
          }
        >
          <span
            ref={outgoingLowerRef}
            {...classProps(
              styles.compactGlyphCarrier,
              styles.compactStaticFace,
              styles.compactStaticBottom,
              cell.span === 2 && styles.compactWideGlyphCarrier,
            )}
            data-part="face"
            data-glyph=""
            data-face-half="lower"
            data-face-state="stationary"
            data-slot="stationary-lower"
            data-split-flap-compact-glyph
            data-split-flap-wide-glyph={cell.span === 2 || undefined}
            style={{
              ...compactGlyphCarrierStyle(
                bottomGlyphColor,
                true,
                `calc(${splitFlapLook.glyphY} - ${splitFlapLook.compactHalfCell})`,
              ),
              backgroundColor: bottomFaceColor,
              backgroundImage: compactBottomFaceBackground,
              bottom: activeBottomInset,
              boxShadow: bottomFaceBoxShadow,
              left: splitFlapLook.faceInsetX,
              right: splitFlapLook.faceInsetX,
            }}
          >
            {cell.span === 2 && <WideGlyphParts compact />}
          </span>
          <span
            ref={arrivingUpperRef}
            {...classProps(
              styles.compactGlyphCarrier,
              styles.compactStaticFace,
              styles.compactStaticTop,
              cell.span === 2 && styles.compactWideGlyphCarrier,
            )}
            data-part="face"
            data-glyph=""
            data-face-half="upper"
            data-face-state="stationary"
            data-slot="stationary-upper"
            data-split-flap-compact-glyph
            data-split-flap-wide-glyph={cell.span === 2 || undefined}
            style={{
              ...compactGlyphCarrierStyle(
                glyphColor,
                false,
                `calc(${splitFlapLook.glyphY} - ${splitFlapLook.faceInsetY})`,
              ),
              backgroundColor: topFaceColor,
              backgroundImage: compactTopFaceBackground,
              boxShadow: splitFlapLook.topFaceShadow,
              height: `calc(50% - ${splitFlapLook.faceInsetY})`,
              left: splitFlapLook.faceInsetX,
              right: splitFlapLook.faceInsetX,
              top: splitFlapLook.faceInsetY,
            }}
          >
            {cell.span === 2 && <WideGlyphParts compact />}
          </span>
          {css3dMotion && (
            <>
              <span
                ref={compactMovingStackRef}
                {...classProps(styles.compactMovingStack)}
                data-slot="moving-spare-leaves"
                style={{
                  background: compactMovingStackBackground,
                  clipPath: `inset(calc(100% - ${activeLeafReveal}cqw - ${splitFlapLook.faceInsetY}) 0 0)`,
                }}
              />
              <span
                ref={movingVaneRef}
                {...classProps(styles.movingVane, styles.compactMovingVane)}
                data-slot="moving-leaf"
              >
                <span
                  ref={movingFrontGlyphRef}
                  {...classProps(
                    styles.compactGlyphCarrier,
                    styles.movingVaneFace,
                    styles.compactMovingVaneFace,
                    cell.span === 2 && styles.compactWideGlyphCarrier,
                  )}
                  data-part="face"
                  data-glyph=""
                  data-face-half="upper"
                  data-face-state="moving"
                  data-slot="moving-leaf-front"
                  data-split-flap-compact-glyph
                  data-split-flap-wide-glyph={cell.span === 2 || undefined}
                  style={{
                    ...compactGlyphCarrierStyle(
                      glyphColor,
                      false,
                      `calc(${splitFlapLook.glyphY} - ${splitFlapLook.faceInsetY})`,
                    ),
                    backgroundColor: topFaceColor,
                    backgroundImage: compactTopFaceBackground,
                    clipPath: `inset(${splitFlapLook.faceInsetY} ${splitFlapLook.faceInsetX} 50% ${splitFlapLook.faceInsetX})`,
                    transform: `translateZ(calc(${splitFlapLook.leafThickness} / 2))`,
                  }}
                >
                  {cell.span === 2 && <WideGlyphParts compact />}
                </span>
                <span
                  ref={movingBackGlyphRef}
                  {...classProps(
                    styles.compactGlyphCarrier,
                    styles.movingVaneFace,
                    styles.compactMovingVaneFace,
                    cell.span === 2 && styles.compactWideGlyphCarrier,
                  )}
                  data-part="face"
                  data-glyph=""
                  data-face-half="lower"
                  data-face-state="moving"
                  data-slot="moving-leaf-back"
                  data-split-flap-compact-glyph
                  data-split-flap-wide-glyph={cell.span === 2 || undefined}
                  style={{
                    ...compactGlyphCarrierStyle(
                      bottomGlyphColor,
                      true,
                      `calc(${splitFlapLook.glyphY} - ${splitFlapLook.compactHalfCell})`,
                    ),
                    backgroundColor: bottomFaceColor,
                    backgroundImage: compactBottomFaceBackground,
                    clipPath: `inset(50% ${splitFlapLook.faceInsetX} ${activeBottomInset} ${splitFlapLook.faceInsetX})`,
                    transform: `translateZ(calc(${splitFlapLook.leafThickness} / -2)) rotateX(180deg)`,
                  }}
                >
                  {cell.span === 2 && <WideGlyphParts compact />}
                </span>
              </span>
            </>
          )}
        </span>
        <CompactHardware wide={cell.span === 2} />
      </span>
    )
  }

  return (
    <span
      ref={rootRef}
      {...classProps(styles.cassette, className)}
      aria-hidden="true"
      data-slot="cassette"
      data-split-flap-cassette
      data-split-flap-cassette-span={cell.span}
      data-split-flap-cell-id={cell.id}
      data-split-flap-index={index}
      style={variantGlyphStyle}
    >
      <span
        {...classProps(styles.cell)}
        data-slot="cassette-base"
        style={{
          backgroundColor: splitFlapLook.cavityColor,
          boxShadow: splitFlapLook.cavityShadow,
        }}
      >
        <span {...classProps(styles.cellScene)} data-slot="leaf-pack">
          <span
            {...classProps(styles.cavityBackPlane)}
            style={{ transform: `translateZ(-${cavityGeometryDepth}cqw)` }}
          />
          <span
            {...classProps(styles.cavityWall, styles.cavityWallTop)}
            style={{ height: `${cavityGeometryDepth}cqw` }}
          />
          <span
            {...classProps(styles.cavityWall, styles.cavityWallRight)}
            style={{ width: `${cavityGeometryDepth}cqw` }}
          />
          <span
            {...classProps(styles.cavityWall, styles.cavityWallBottom)}
            style={{ height: `${cavityGeometryDepth}cqw` }}
          />
          <span
            {...classProps(styles.cavityWall, styles.cavityWallLeft)}
            style={{ width: `${cavityGeometryDepth}cqw` }}
          />
          <span
            ref={spareLeafPackRef}
            {...classProps(styles.spareLeafPack)}
            style={{
              opacity: 0.92,
              transform: `translate3d(0, var(${stackShiftProperty}, 0px), 0)`,
            }}
          >
            {spareLeaves.map(
              ({
                bottomOffset,
                boxShadow,
                brightness,
                edgeMix,
                leafIndex,
                saturation,
                xOffset,
              }) => (
                <span
                  key={leafIndex}
                  {...classProps(styles.spareLeafPlate)}
                  style={{
                    bottom: `calc(${splitFlapLook.faceInsetY} + ${bottomOffset}cqw)`,
                    boxShadow,
                    backgroundImage: `linear-gradient(180deg, #24251e 0%, #1a1b16 68%, #0b0c09 91%, color-mix(in srgb, #585644 ${edgeMix}%, black) 95.5%, #151610 98%, #080906 100%)`,
                    filter: `brightness(${brightness.toFixed(3)}) saturate(${saturation.toFixed(3)})`,
                    height: `calc(50% - ${splitFlapLook.faceInsetY})`,
                    left: `calc(${splitFlapLook.faceInsetX} - 0.06cqw)`,
                    right: `calc(${splitFlapLook.faceInsetX} - 0.06cqw)`,
                    transform: `translateX(${xOffset}cqw)`,
                    zIndex: leafIndex + 1,
                  }}
                />
              ),
            )}
          </span>
          <span ref={outgoingLowerRef} {...classProps(styles.faceLayer, styles.outgoingLower)}>
            <span
              {...classProps(styles.face, styles.bottomFace)}
              data-part="face"
              data-face-half="lower"
              data-face-state="stationary"
              data-slot="face"
              style={{
                backgroundColor: bottomFaceColor,
                backgroundImage: bottomFaceBackground,
                bottom: activeBottomInset,
                boxShadow: bottomFaceBoxShadow,
                filter: bottomFaceFilter,
                left: splitFlapLook.faceInsetX,
                right: splitFlapLook.faceInsetX,
              }}
            />
            <FaceGlyph
              activeBottomInset={activeBottomInset}
              color={bottomGlyphColor}
              glyphOffset={glyphOffset}
              glyphRef={outgoingLowerGlyphRef}
              glyphStyle={glyphStyle}
              lower
              wide={cell.span === 2}
            />
          </span>
          <span ref={arrivingUpperRef} {...classProps(styles.faceLayer, styles.arrivingUpper)}>
            <span
              {...classProps(styles.face, styles.topFace)}
              data-part="face"
              data-face-half="upper"
              data-face-state="stationary"
              data-slot="face"
              style={{
                backgroundColor: topFaceColor,
                backgroundImage: topFaceBackground,
                boxShadow: splitFlapLook.topFaceShadow,
                filter: topFaceFilter,
                height: `calc(50% - ${splitFlapLook.faceInsetY})`,
                left: splitFlapLook.faceInsetX,
                right: splitFlapLook.faceInsetX,
                top: splitFlapLook.faceInsetY,
              }}
            />
            <FaceGlyph
              activeBottomInset={activeBottomInset}
              color={glyphColor}
              glyphOffset={glyphOffset}
              glyphRef={arrivingUpperGlyphRef}
              glyphStyle={glyphStyle}
              lower={false}
              wide={cell.span === 2}
            />
          </span>
          <span ref={movingVaneRef} {...classProps(styles.movingVane)} data-slot="moving-leaf">
            <span
              {...classProps(styles.movingVaneFace, styles.movingVaneFront)}
              style={{ transform: `translateZ(calc(${splitFlapLook.leafThickness} / 2))` }}
            >
              <span
                {...classProps(styles.face, styles.topFace)}
                data-part="face"
                data-face-half="upper"
                data-face-state="moving"
                data-slot="face"
                style={{
                  backgroundColor: topFaceColor,
                  backgroundImage: topFaceBackground,
                  boxShadow: splitFlapLook.topFaceShadow,
                  height: `calc(50% - ${splitFlapLook.faceInsetY})`,
                  left: splitFlapLook.faceInsetX,
                  right: splitFlapLook.faceInsetX,
                  top: splitFlapLook.faceInsetY,
                }}
              />
              <FaceGlyph
                activeBottomInset={activeBottomInset}
                color={glyphColor}
                glyphOffset={glyphOffset}
                glyphRef={movingFrontGlyphRef}
                glyphStyle={glyphStyle}
                lower={false}
                moving
                wide={cell.span === 2}
              />
            </span>
            <span
              {...classProps(styles.movingVaneFace, styles.movingVaneBack)}
              style={{
                transform: `translateZ(calc(${splitFlapLook.leafThickness} / -2)) rotateX(180deg)`,
              }}
            >
              <span
                {...classProps(styles.face, styles.bottomFace)}
                data-part="face"
                data-face-half="lower"
                data-face-state="moving"
                data-slot="face"
                style={{
                  backgroundColor: bottomFaceColor,
                  backgroundImage: bottomFaceBackground,
                  bottom: activeBottomInset,
                  boxShadow: bottomFaceBoxShadow,
                  left: splitFlapLook.faceInsetX,
                  right: splitFlapLook.faceInsetX,
                }}
              />
              <FaceGlyph
                activeBottomInset={activeBottomInset}
                color={bottomGlyphColor}
                glyphOffset={glyphOffset}
                glyphRef={movingBackGlyphRef}
                glyphStyle={glyphStyle}
                lower
                moving
                wide={cell.span === 2}
              />
              <span
                {...classProps(styles.movingVaneSpecular, styles.movingVaneBackSpecular)}
                style={{
                  bottom: activeBottomInset,
                  height: `calc(50% - ${activeBottomInset})`,
                  left: splitFlapLook.faceInsetX,
                  right: splitFlapLook.faceInsetX,
                  top: '50%',
                }}
              />
            </span>
            <span
              {...classProps(styles.movingVaneEdge)}
              style={{
                height: splitFlapLook.leafThickness,
                left: splitFlapLook.faceInsetX,
                right: splitFlapLook.faceInsetX,
                top: `calc(${splitFlapLook.faceInsetY} - ${splitFlapLook.leafThickness} / 2)`,
              }}
            />
            <span
              {...classProps(styles.movingVaneSide, styles.movingVaneSideLeft)}
              style={{
                height: `calc(50% - ${splitFlapLook.faceInsetY})`,
                left: `calc(${splitFlapLook.faceInsetX} - ${splitFlapLook.leafThickness} / 2)`,
                top: splitFlapLook.faceInsetY,
                width: splitFlapLook.leafThickness,
              }}
            />
            <span
              {...classProps(styles.movingVaneSide, styles.movingVaneSideRight)}
              style={{
                height: `calc(50% - ${splitFlapLook.faceInsetY})`,
                right: `calc(${splitFlapLook.faceInsetX} - ${splitFlapLook.leafThickness} / 2)`,
                top: splitFlapLook.faceInsetY,
                width: splitFlapLook.leafThickness,
              }}
            />
          </span>
          <span
            ref={lowerMotionShadowRef}
            {...classProps(styles.motionShadow, styles.lowerMotionShadow)}
          />
          <span
            {...classProps(styles.upperSeamShadow)}
            style={{
              backgroundImage: upperSeamShadow,
              bottom: `calc(50% + ${halfSeamThickness})`,
            }}
          />
          <span
            {...classProps(styles.lowerSeamShadow)}
            style={{
              backgroundImage: lowerSeamShadow,
              top: `calc(50% + ${halfSeamThickness})`,
            }}
          />
          <span
            {...classProps(styles.seam)}
            style={{
              backgroundColor: `rgba(7 8 6 / ${splitFlapLook.seamOpacity})`,
              backgroundImage: seamBackground,
              boxShadow: seamContactShadow,
              height: splitFlapLook.seamThickness,
            }}
          />
          {cell.span === 2 ? (
            <WideRetainers />
          ) : (
            <>
              <span {...classProps(styles.axle, styles.axleLeft)} />
              <span {...classProps(styles.axle, styles.axleRight)} />
            </>
          )}
          <span
            {...classProps(styles.cassetteBezel)}
            style={{
              backgroundImage: cassetteBezelBackground,
              opacity: 0.92,
            }}
          />
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
  groupGap,
  layout,
  rowIndex,
  presentation,
}: {
  columnGap: number
  controller: SplitFlapMotionController
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

  return (
    <div
      {...classProps(styles.departureRow, presentation?.className)}
      data-split-flap-row
      data-split-flap-row-id={row.id}
      style={{
        columnGap: `calc(${groupGap} * ${splitFlapLook.boardUnit})`,
        gridTemplateColumns: columnTracks,
      }}
    >
      {layout.columns.map((column, columnIndex) => (
        <div
          key={column.id}
          {...classProps(styles.departureGroup, presentation?.groups[columnIndex]?.className)}
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
                    highlighted={Boolean(row.highlighted)}
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
