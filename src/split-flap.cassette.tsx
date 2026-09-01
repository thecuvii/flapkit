'use client'

import * as stylex from '@stylexjs/stylex'
import { memo, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import {
  activeLeafClearance,
  glyphOffsetValues,
  spareLeafStep,
  spareLeafXOffsets,
  splitFlapReferenceTracks,
} from './split-flap.constants'
import { splitFlapLook } from './split-flap-look.stylex'
import type { SplitFlapMaterial } from './split-flap.material'
import {
  activeGlyphColorProperty,
  signedLeafNoise,
  stackShiftProperty,
  type SplitFlapMotionController,
} from './split-flap.runtime'
import type {
  ResolvedSplitFlapCell,
  ResolvedSplitFlapSource,
  SplitFlapTone,
} from './split-flap.source'
import { styles, glyphOffsets } from './split-flap.styles'

type CellTuning = SplitFlapMaterial

function splitFlapColumnTracks(layout: ResolvedSplitFlapSource) {
  return layout.columns
    .map((column) => `calc(${column.cells} * ${splitFlapLook.cellTrack})`)
    .join(' ')
}

function FaceGlyph({
  activeBottomInset,
  color,
  glyphOffset,
  glyphRef,
  glyphStyle,
  lower,
  moving = false,
}: {
  activeBottomInset: string
  color: string
  glyphOffset: (typeof glyphOffsets)[number]
  glyphRef: RefObject<HTMLSpanElement | null>
  glyphStyle: CSSProperties
  lower: boolean
  moving?: boolean
}) {
  return (
    <span
      {...stylex.props(
        styles.glyphHalf,
        lower ? styles.bottomGlyphHalf : styles.topGlyphHalf,
        moving && styles.movingGlyphHalf,
      )}
      style={lower ? { clipPath: `inset(50% 0 ${activeBottomInset} 0)` } : undefined}
    >
      <span
        ref={glyphRef}
        {...stylex.props(styles.glyph, glyphOffset)}
        style={{
          ...glyphStyle,
          color: `var(${activeGlyphColorProperty}, ${color})`,
          textShadow: `0 0 ${lower ? '0.04' : '0.05'}cqw color-mix(in srgb, var(${activeGlyphColorProperty}, ${color}) ${lower ? 5 : 6}%, transparent)`,
          top: splitFlapLook.glyphY,
          transform: `translateX(-50%)${lower ? ' translateX(0.03cqw)' : ''} scaleX(${splitFlapLook.glyphWidth}) scaleY(0.78)`,
        }}
      />
    </span>
  )
}

const FlapCell = memo(function FlapCell({
  cell,
  controller,
  detailed = false,
  highlighted,
  paired = false,
  tuning,
}: {
  cell: ResolvedSplitFlapCell
  controller: SplitFlapMotionController
  detailed?: boolean
  highlighted: boolean
  paired?: boolean
  tuning: CellTuning
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

  const highlightFacePercent = highlighted ? Math.round(tuning.highlightFaceStrength * 100) : 0
  const highlightGlyphPercent = highlighted ? Math.round(tuning.highlightGlyphStrength * 100) : 0
  const topFaceColor = `color-mix(in srgb, ${splitFlapLook.topFaceColor} ${100 - highlightFacePercent}%, ${splitFlapLook.highlightFace} ${highlightFacePercent}%)`
  const bottomFaceColor = `color-mix(in srgb, ${splitFlapLook.bottomFaceColor} ${100 - highlightFacePercent}%, ${splitFlapLook.highlightFace} ${highlightFacePercent}%)`
  const glyphColorsForTone = (tone: SplitFlapTone) => {
    const baseColor =
      tone === 'ochreOrange'
        ? splitFlapLook.glyphOchre
        : tone === 'signalYellow'
          ? splitFlapLook.glyphSignal
          : splitFlapLook.glyphWarm
    const top = `color-mix(in srgb, ${baseColor} ${100 - highlightGlyphPercent}%, ${splitFlapLook.highlightGlyph} ${highlightGlyphPercent}%)`
    return {
      bottom: `color-mix(in srgb, ${top} 96%, ${bottomFaceColor} 4%)`,
      top,
    }
  }
  const toneGlyphColors: Record<SplitFlapTone, { bottom: string; top: string }> = {
    ochreOrange: glyphColorsForTone('ochreOrange'),
    signalYellow: glyphColorsForTone('signalYellow'),
    warmWhite: glyphColorsForTone('warmWhite'),
  }
  const glyphColor = toneGlyphColors.warmWhite.top
  const bottomGlyphColor = toneGlyphColors.warmWhite.bottom
  const toneGlyphStyle = {
    '--split-flap-glyph-ochre-bottom': toneGlyphColors.ochreOrange.bottom,
    '--split-flap-glyph-ochre-top': toneGlyphColors.ochreOrange.top,
    '--split-flap-glyph-signal-bottom': toneGlyphColors.signalYellow.bottom,
    '--split-flap-glyph-signal-top': toneGlyphColors.signalYellow.top,
    '--split-flap-glyph-warm-bottom': toneGlyphColors.warmWhite.bottom,
    '--split-flap-glyph-warm-top': toneGlyphColors.warmWhite.top,
  } as CSSProperties
  const glyphStyle = {
    fontSize: splitFlapLook.glyphSize,
    letterSpacing: splitFlapLook.glyphTracking,
    opacity: splitFlapLook.glyphOpacity,
    transformOrigin: '50% 0%',
  }
  const wearStrength = Math.min(tuning.patinaStrength, 2)
  const wearVariation = tuning.leafVariation ? tuning.leafWearVariation : 0
  const brightnessVariation = tuning.leafVariation ? tuning.leafBrightnessVariation : 0
  const spareLeafCount = Math.max(2, Math.min(3, Math.round(tuning.spareLeafCount)))
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
  const cavityGeometryDepth = 0.52 * tuning.cavityDepth
  const seamBackground =
    `linear-gradient(90deg, rgba(4 5 3 / calc(0.98 * ${splitFlapLook.seamOpacity})) 0%, ` +
    `rgba(9 10 7 / calc(0.94 * ${splitFlapLook.seamOpacity})) 38%, ` +
    `rgba(5 6 4 / ${splitFlapLook.seamOpacity}) 78%, ` +
    `rgba(3 4 3 / calc(0.97 * ${splitFlapLook.seamOpacity})) 100%)`
  const upperSeamShadow =
    `linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, ${0.035 * tuning.seamShadow}) 42%, ` +
    `rgba(0, 0, 0, ${0.13 * tuning.seamShadow}) 100%)`
  const lowerSeamShadow =
    `linear-gradient(180deg, rgba(0, 0, 0, ${0.24 * tuning.seamShadow}) 0%, ` +
    `rgba(0, 0, 0, ${0.06 * tuning.seamShadow}) 34%, ` +
    `rgba(179, 173, 137, ${0.025 * tuning.seamShadow}) 62%, transparent 100%)`
  const seamContactShadow =
    `0.03cqw 0.08cqw 0.14cqw rgba(0, 0, 0, ${0.24 * tuning.seamShadow}), ` +
    `0 -0.03cqw 0.07cqw rgba(0, 0, 0, ${0.13 * tuning.seamShadow})`
  const halfSeamThickness = `calc(${splitFlapLook.seamThickness} / 2)`
  const activeLeafReveal = activeLeafClearance + spareLeafStep * Math.max(0, spareLeafCount - 1)
  const activeBottomInset = tuning.stackedEdges
    ? `calc(${splitFlapLook.faceInsetY} + ${activeLeafReveal}cqw)`
    : splitFlapLook.faceInsetY
  const stackedCoverShadowOpacity = Math.min(0.28 * tuning.stackedTopShadow, 0.46)
  const bottomFaceBoxShadow = tuning.stackedEdges
    ? `${splitFlapLook.bottomFaceShadow}, 0 ${0.1 * tuning.stackedTopShadow}cqw ${0.16 * tuning.stackedTopShadow}cqw rgba(0, 0, 0, ${stackedCoverShadowOpacity}), 0 -0.09cqw 0 rgba(190, 182, 143, 0.12) inset`
    : splitFlapLook.bottomFaceShadow
  const spareLeafShadowOpacity = Math.min(0.42 * tuning.stackedTopShadow, 0.62)
  const spareLeafVariation = tuning.leafVariation ? 1 : 0
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
        `0 ${0.045 * tuning.stackedTopShadow * shadowStrength}cqw ` +
        `${0.065 * tuning.stackedTopShadow * shadowStrength}cqw ` +
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
  const sideShadowStrength = Math.max(0, tuning.stackedSideShadow)
  const sideShadowStop = (wall: number, extent: number) =>
    (wall + (extent - wall) * sideShadowStrength).toFixed(3)
  const bezelTopShadowOpacity = Math.min(0.62 * tuning.stackedTopShadow, 0.86)
  const cassetteBezelBackground =
    `linear-gradient(90deg, rgba(82, 83, 68, 0.5) 0, rgba(5, 6, 4, 0.96) 0.06cqw, ` +
    `rgba(0, 0, 0, 0.42) ${sideShadowStop(0.06, 0.14)}cqw, transparent ${sideShadowStop(0.06, 0.3)}cqw), ` +
    `linear-gradient(270deg, rgba(72, 73, 60, 0.44) 0, rgba(5, 6, 4, 0.94) 0.06cqw, ` +
    `rgba(0, 0, 0, 0.36) ${sideShadowStop(0.06, 0.14)}cqw, transparent ${sideShadowStop(0.06, 0.28)}cqw), ` +
    `linear-gradient(180deg, rgba(4, 5, 3, ${bezelTopShadowOpacity}) 0, ` +
    `transparent ${0.22 * tuning.stackedTopShadow}cqw), ` +
    'linear-gradient(0deg, rgba(3, 4, 2, 0.88) 0, transparent 0.18cqw)'
  const compactToneLayer = (brightness: number) => {
    const difference = Math.abs(brightness - 1)
    const channel = brightness >= 1 ? '255, 255, 255' : '0, 0, 0'
    const opacity = Math.min(0.16, difference * 0.9)

    return `linear-gradient(rgba(${channel}, ${opacity}), rgba(${channel}, ${opacity}))`
  }
  const compactTopFaceBackground = [
    `linear-gradient(180deg, transparent 0%, transparent calc(50% - ${0.5 + tuning.seamShadow * 0.04}cqw), rgba(0, 0, 0, ${0.1 + tuning.seamShadow * 0.08}) 50%, transparent 50%)`,
    compactToneLayer(topBrightness),
    topFaceBackground,
  ].join(', ')
  const compactBottomFaceBackground = [
    `linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0, 0, 0, ${0.2 + tuning.seamShadow * 0.11}) 50%, transparent calc(50% + ${0.38 + tuning.seamShadow * 0.04}cqw), transparent 100%)`,
    compactToneLayer(bottomBrightness),
    bottomFaceBackground,
  ].join(', ')
  const compactGlyphCarrierStyle = (color: string, lower: boolean, top: string) =>
    ({
      '--compact-glyph-fallback-color': color,
      '--compact-glyph-font-size': splitFlapLook.glyphSize,
      '--compact-glyph-margin-left': `${glyphOffsetValue}cqw`,
      '--compact-glyph-opacity': splitFlapLook.glyphOpacity,
      '--compact-glyph-top': top,
      '--compact-glyph-tracking': splitFlapLook.glyphTracking,
      '--compact-glyph-transform': `translateX(-50%)${lower ? ' translateX(0.03cqw)' : ''} scaleX(${splitFlapLook.glyphWidth}) scaleY(0.78)`,
    }) as CSSProperties
  const compactSpareLeafLayers = tuning.stackedEdges
    ? [...spareLeaves]
        .reverse()
        .map(({ bottomOffset, brightness, edgeMix, shadowOpacity, xOffset }) => {
          const darkness = Math.min(28, Math.max(0, (1 - brightness) * 100))
          const upperColor = `color-mix(in srgb, #24251e ${100 - darkness}%, black)`
          const middleColor = `color-mix(in srgb, #171812 ${100 - darkness}%, black)`
          const lowerColor = `color-mix(in srgb, #090a07 ${100 - darkness}%, black)`
          const edgeColor = `color-mix(in srgb, #585644 ${edgeMix}%, black)`

          return `linear-gradient(180deg, ${upperColor} 0%, ${middleColor} 86%, ${edgeColor} 91%, ${edgeColor} 93%, ${lowerColor} 96%, rgba(0, 0, 0, ${shadowOpacity}) 100%) calc(50% + ${xOffset}cqw) calc(100% - ${splitFlapLook.faceInsetY} - ${bottomOffset}cqw) / calc(100% - ${splitFlapLook.faceInsetX} - ${splitFlapLook.faceInsetX} + 0.12cqw) calc(50% - ${splitFlapLook.faceInsetY}) no-repeat`
        })
    : []
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
  }, [controller, css3dMotion, detailed, index, tuning.stackedEdges])

  if (!detailed) {
    return (
      <span
        ref={rootRef}
        {...stylex.props(styles.cassette, styles.compactCassette, paired && styles.pairedCassette)}
        aria-hidden="true"
        data-slot="cassette"
        data-split-flap-cassette
        data-split-flap-cell-id={cell.id}
        data-split-flap-index={index}
        style={
          {
            ...toneGlyphStyle,
            '--compact-seam-base-opacity': splitFlapLook.seamOpacity,
            '--compact-seam-height': splitFlapLook.seamThickness,
            '--compact-seam-visibility': 1,
          } as CSSProperties
        }
      >
        <span
          ref={compactCellRef}
          {...stylex.props(styles.cell, styles.compactCell)}
          data-slot="cassette-base"
          style={
            {
              '--compact-bezel-background': cassetteBezelBackground,
              '--compact-bezel-opacity': tuning.stackedEdges ? tuning.stackedEdgeOpacity : 0,
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
            {...stylex.props(
              styles.compactGlyphCarrier,
              styles.compactStaticFace,
              styles.compactStaticBottom,
            )}
            data-glyph=""
            data-slot="stationary-lower"
            data-split-flap-compact-glyph
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
          />
          <span
            ref={arrivingUpperRef}
            {...stylex.props(
              styles.compactGlyphCarrier,
              styles.compactStaticFace,
              styles.compactStaticTop,
            )}
            data-glyph=""
            data-slot="stationary-upper"
            data-split-flap-compact-glyph
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
          />
          {css3dMotion && (
            <>
              <span
                ref={compactMovingStackRef}
                {...stylex.props(styles.compactMovingStack)}
                data-slot="moving-spare-leaves"
                style={{
                  background: compactMovingStackBackground,
                  clipPath: `inset(calc(100% - ${activeLeafReveal}cqw - ${splitFlapLook.faceInsetY}) 0 0)`,
                }}
              />
              <span
                ref={movingVaneRef}
                {...stylex.props(styles.movingVane, styles.compactMovingVane)}
                data-slot="moving-leaf"
              >
                <span
                  ref={movingFrontGlyphRef}
                  {...stylex.props(
                    styles.compactGlyphCarrier,
                    styles.movingVaneFace,
                    styles.compactMovingVaneFace,
                  )}
                  data-glyph=""
                  data-slot="moving-leaf-front"
                  data-split-flap-compact-glyph
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
                />
                <span
                  ref={movingBackGlyphRef}
                  {...stylex.props(
                    styles.compactGlyphCarrier,
                    styles.movingVaneFace,
                    styles.compactMovingVaneFace,
                  )}
                  data-glyph=""
                  data-slot="moving-leaf-back"
                  data-split-flap-compact-glyph
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
                />
              </span>
            </>
          )}
        </span>
      </span>
    )
  }

  return (
    <span
      ref={rootRef}
      {...stylex.props(styles.cassette, paired && styles.pairedCassette)}
      aria-hidden="true"
      data-slot="cassette"
      data-split-flap-cassette
      data-split-flap-cell-id={cell.id}
      data-split-flap-index={index}
      style={toneGlyphStyle}
    >
      <span
        {...stylex.props(styles.cell)}
        data-slot="cassette-base"
        style={{
          backgroundColor: splitFlapLook.cavityColor,
          boxShadow: splitFlapLook.cavityShadow,
        }}
      >
        <span {...stylex.props(styles.cellScene)} data-slot="leaf-pack">
          <span
            {...stylex.props(styles.cavityBackPlane)}
            style={{ transform: `translateZ(-${cavityGeometryDepth}cqw)` }}
          />
          <span
            {...stylex.props(styles.cavityWall, styles.cavityWallTop)}
            style={{ height: `${cavityGeometryDepth}cqw` }}
          />
          <span
            {...stylex.props(styles.cavityWall, styles.cavityWallRight)}
            style={{ width: `${cavityGeometryDepth}cqw` }}
          />
          <span
            {...stylex.props(styles.cavityWall, styles.cavityWallBottom)}
            style={{ height: `${cavityGeometryDepth}cqw` }}
          />
          <span
            {...stylex.props(styles.cavityWall, styles.cavityWallLeft)}
            style={{ width: `${cavityGeometryDepth}cqw` }}
          />
          {tuning.stackedEdges && (
            <span
              ref={spareLeafPackRef}
              {...stylex.props(styles.spareLeafPack)}
              style={{
                opacity: tuning.stackedEdgeOpacity,
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
                    {...stylex.props(styles.spareLeafPlate)}
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
          )}
          <span ref={outgoingLowerRef} {...stylex.props(styles.faceLayer, styles.outgoingLower)}>
            <span
              {...stylex.props(styles.face, styles.bottomFace)}
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
            />
          </span>
          <span ref={arrivingUpperRef} {...stylex.props(styles.faceLayer, styles.arrivingUpper)}>
            <span
              {...stylex.props(styles.face, styles.topFace)}
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
            />
          </span>
          <span ref={movingVaneRef} {...stylex.props(styles.movingVane)} data-slot="moving-leaf">
            <span
              {...stylex.props(styles.movingVaneFace, styles.movingVaneFront)}
              style={{ transform: `translateZ(calc(${splitFlapLook.leafThickness} / 2))` }}
            >
              <span
                {...stylex.props(styles.face, styles.topFace)}
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
              />
            </span>
            <span
              {...stylex.props(styles.movingVaneFace, styles.movingVaneBack)}
              style={{
                transform: `translateZ(calc(${splitFlapLook.leafThickness} / -2)) rotateX(180deg)`,
              }}
            >
              <span
                {...stylex.props(styles.face, styles.bottomFace)}
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
              />
              <span
                {...stylex.props(styles.movingVaneSpecular, styles.movingVaneBackSpecular)}
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
              {...stylex.props(styles.movingVaneEdge)}
              style={{
                height: splitFlapLook.leafThickness,
                left: splitFlapLook.faceInsetX,
                right: splitFlapLook.faceInsetX,
                top: `calc(${splitFlapLook.faceInsetY} - ${splitFlapLook.leafThickness} / 2)`,
              }}
            />
            <span
              {...stylex.props(styles.movingVaneSide, styles.movingVaneSideLeft)}
              style={{
                height: `calc(50% - ${splitFlapLook.faceInsetY})`,
                left: `calc(${splitFlapLook.faceInsetX} - ${splitFlapLook.leafThickness} / 2)`,
                top: splitFlapLook.faceInsetY,
                width: splitFlapLook.leafThickness,
              }}
            />
            <span
              {...stylex.props(styles.movingVaneSide, styles.movingVaneSideRight)}
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
            {...stylex.props(styles.motionShadow, styles.lowerMotionShadow)}
          />
          <span
            {...stylex.props(styles.upperSeamShadow)}
            style={{
              backgroundImage: upperSeamShadow,
              bottom: `calc(50% + ${halfSeamThickness})`,
            }}
          />
          <span
            {...stylex.props(styles.lowerSeamShadow)}
            style={{
              backgroundImage: lowerSeamShadow,
              top: `calc(50% + ${halfSeamThickness})`,
            }}
          />
          <span
            {...stylex.props(styles.seam)}
            style={{
              backgroundColor: `rgba(7 8 6 / ${splitFlapLook.seamOpacity})`,
              backgroundImage: seamBackground,
              boxShadow: seamContactShadow,
              height: splitFlapLook.seamThickness,
            }}
          />
          <span {...stylex.props(styles.axle, styles.axleLeft)} />
          <span {...stylex.props(styles.axle, styles.axleRight)} />
          {tuning.stackedEdges && (
            <span
              {...stylex.props(styles.cassetteBezel)}
              style={{
                backgroundImage: cassetteBezelBackground,
                opacity: tuning.stackedEdgeOpacity,
              }}
            />
          )}
        </span>
      </span>
      <span {...stylex.props(styles.cassetteCover, styles.cassetteCoverTop)} data-slot="cover" />
      <span {...stylex.props(styles.cassetteCover, styles.cassetteCoverRight)} data-slot="cover" />
      <span {...stylex.props(styles.cassetteCover, styles.cassetteCoverBottom)} data-slot="cover" />
      <span {...stylex.props(styles.cassetteCover, styles.cassetteCoverLeft)} data-slot="cover" />
    </span>
  )
})

export const SplitFlapBoardRow = memo(function SplitFlapBoardRow({
  columnGap,
  controller,
  fieldGap,
  layout,
  rowIndex,
  tuning,
}: {
  columnGap: number
  controller: SplitFlapMotionController
  fieldGap: number
  layout: ResolvedSplitFlapSource
  rowIndex: number
  tuning: CellTuning
}) {
  const row = layout.rows[rowIndex]
  const columnTracks = splitFlapColumnTracks(layout)

  return (
    <div
      {...stylex.props(styles.departureRow)}
      data-split-flap-row
      data-split-flap-row-id={row.id}
      style={{
        columnGap: `calc(${fieldGap} * ${splitFlapLook.boardUnit})`,
        gridTemplateColumns: columnTracks,
      }}
    >
      {layout.columns.map((column) => (
        <div
          key={column.id}
          {...stylex.props(styles.departureField)}
          data-split-flap-field={column.id}
        >
          <div
            {...stylex.props(styles.departureFieldScaleContext)}
            data-split-flap-scale-context
            style={{
              width: `calc(${splitFlapReferenceTracks} * ${splitFlapLook.cellTrack})`,
            }}
          >
            <div
              {...stylex.props(styles.departureFieldGrid)}
              style={{
                columnGap: `${columnGap}cqw`,
                gridTemplateColumns: `repeat(${column.cells / column.panelsPerCassette}, minmax(0, 1fr))`,
                width: `calc(${column.cells} * ${splitFlapLook.cellTrack})`,
              }}
            >
              {Array.from(
                { length: column.cells / column.panelsPerCassette },
                (_, cassetteIndex) => {
                  const firstColumnIndex = cassetteIndex * column.panelsPerCassette
                  const cassetteCells = Array.from(
                    { length: column.panelsPerCassette },
                    (_, panelIndex) =>
                      layout.cells[
                        rowIndex * layout.rowCellCount +
                          column.offset +
                          firstColumnIndex +
                          panelIndex
                      ],
                  )

                  if (column.panelsPerCassette === 1) {
                    const cell = cassetteCells[0]
                    return (
                      <FlapCell
                        key={cell.id}
                        cell={cell}
                        controller={controller}
                        highlighted={Boolean(row.highlighted)}
                        tuning={tuning}
                      />
                    )
                  }

                  return (
                    <span
                      key={cassetteCells[0].id}
                      {...stylex.props(styles.pairedCassetteShell)}
                      data-split-flap-cassette-panels="2"
                    >
                      {cassetteCells.map((cell) => (
                        <FlapCell
                          key={cell.id}
                          cell={cell}
                          controller={controller}
                          highlighted={Boolean(row.highlighted)}
                          paired
                          tuning={tuning}
                        />
                      ))}
                      <span {...stylex.props(styles.pairedCassetteSeam)} aria-hidden="true" />
                    </span>
                  )
                },
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})
