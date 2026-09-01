'use client'

import * as stylex from '@stylexjs/stylex'
import { memo, useEffect, useMemo, useRef } from 'react'
import { useSplitFlap } from './split-flap.context'
import { glyphOffsetValues, spareLeafStep, spareLeafXOffsets } from './split-flap.constants'
import {
  activeGlyphColorProperty,
  signedLeafNoise,
  splitFlapToneVariable,
  type SplitFlapCanvasRenderer,
  type MotionTuning,
  type SplitFlapRuntime,
} from './split-flap.runtime'
import { splitFlapTones, type SplitFlapTone } from './split-flap.source'
import { styles } from './split-flap.styles'

type CanvasCassetteGeometry = {
  baseline: number
  bottomFaceHeight: number
  bottomFaceY: number
  bottomSurface: CanvasGradient
  cellHeight: number
  cellWidth: number
  cellX: number
  cellY: number
  edge: CanvasGradient
  faceWidth: number
  faceX: number
  glyphStyle: CanvasGlyphStyle
  lowerShadow: CanvasGradient
  seamY: number
  topFaceHeight: number
  topFaceY: number
  topSurface: CanvasGradient
  unit: number
}

type CanvasGlyphStyle = {
  family: string
  opacity: number
  size: number
  weight: string
  width: number
}

type CanvasCellVisual = {
  bottomBrightness: number
  bottomFaceColor: string
  characters: readonly string[]
  glyphColors: Record<SplitFlapTone, { bottom: string; top: string }>
  glyphOffset: number
  topBrightness: number
  topFaceColor: string
}

type CanvasGlyphAtlas = {
  baseline: number
  characterIndices: ReadonlyMap<string, number>
  source: CanvasImageSource
  slots: number
  slotHeight: number
  slotHeightPixels: number
  slotWidth: number
  slotWidthPixels: number
}

const canvasGlyphAtlases = new Map<string, CanvasGlyphAtlas>()
const canvasGlyphAtlasPixelRatio = 2

function disposeCanvasGlyphAtlases() {
  canvasGlyphAtlases.forEach((atlas) => {
    if (atlas.source instanceof ImageBitmap) atlas.source.close()
  })
  canvasGlyphAtlases.clear()
}

function getCanvasGlyphAtlas(
  glyphStyle: CanvasGlyphStyle,
  color: string,
  characters: readonly string[],
) {
  const fontSize = glyphStyle.size
  const key = [
    fontSize.toFixed(3),
    glyphStyle.family,
    glyphStyle.weight,
    glyphStyle.width.toFixed(3),
    glyphStyle.opacity.toFixed(3),
    color,
    characters.join('\u0000'),
  ].join('|')
  const cached = canvasGlyphAtlases.get(key)
  if (cached) return cached

  const slotWidthPixels = Math.ceil(fontSize * 1.6 * canvasGlyphAtlasPixelRatio)
  const slotHeightPixels = Math.ceil(fontSize * 1.5 * canvasGlyphAtlasPixelRatio)
  const slotWidth = slotWidthPixels / canvasGlyphAtlasPixelRatio
  const slotHeight = slotHeightPixels / canvasGlyphAtlasPixelRatio
  const baseline = fontSize * 1.08
  const usesOffscreenCanvas = typeof OffscreenCanvas !== 'undefined'
  const canvas = usesOffscreenCanvas
    ? new OffscreenCanvas(slotWidthPixels * characters.length, slotHeightPixels)
    : document.createElement('canvas')
  canvas.width = slotWidthPixels * characters.length
  canvas.height = slotHeightPixels
  const context = canvas.getContext('2d')

  if (context) {
    context.scale(canvasGlyphAtlasPixelRatio, canvasGlyphAtlasPixelRatio)
    context.font = `${glyphStyle.weight} ${fontSize}px ${glyphStyle.family}`
    context.textAlign = 'center'
    context.textBaseline = 'alphabetic'
    context.fillStyle = color
    context.globalAlpha = glyphStyle.opacity
    context.shadowColor = color
    context.shadowBlur = fontSize * 0.0042

    for (let index = 0; index < characters.length; index += 1) {
      const character = characters[index]
      if (character === ' ') continue

      context.save()
      context.translate(index * slotWidth + slotWidth / 2, baseline)
      context.scale(glyphStyle.width, 0.78)
      context.fillText(character, 0, 0)
      context.restore()
    }
  }

  const atlas = {
    baseline,
    characterIndices: new Map(characters.map((character, index) => [character, index])),
    source:
      usesOffscreenCanvas && canvas instanceof OffscreenCanvas
        ? canvas.transferToImageBitmap()
        : canvas,
    slots: characters.length,
    slotHeight,
    slotHeightPixels,
    slotWidth,
    slotWidthPixels,
  }
  if (canvasGlyphAtlases.size >= 64) {
    const oldestKey = canvasGlyphAtlases.keys().next().value
    if (oldestKey !== undefined) {
      const oldestAtlas = canvasGlyphAtlases.get(oldestKey)
      if (oldestAtlas?.source instanceof ImageBitmap) oldestAtlas.source.close()
      canvasGlyphAtlases.delete(oldestKey)
    }
  }
  canvasGlyphAtlases.set(key, atlas)
  return atlas
}

function drawCanvasGlyph(
  context: CanvasRenderingContext2D,
  geometry: CanvasCassetteGeometry,
  glyphOffset: number,
  characters: readonly string[],
  character: string,
  color: string,
  faceY: number,
  faceHeight: number,
) {
  if (character === ' ') return 0

  const atlas = getCanvasGlyphAtlas(geometry.glyphStyle, color, characters)
  const index = atlas.characterIndices.get(character) ?? atlas.characterIndices.get(' ') ?? 0
  const destinationX =
    geometry.cellX + geometry.cellWidth / 2 + geometry.unit * glyphOffset - atlas.slotWidth / 2
  const destinationY = geometry.baseline - atlas.baseline
  const clippedLeft = Math.max(destinationX, geometry.faceX)
  const clippedTop = Math.max(destinationY, faceY)
  const clippedRight = Math.min(destinationX + atlas.slotWidth, geometry.faceX + geometry.faceWidth)
  const clippedBottom = Math.min(destinationY + atlas.slotHeight, faceY + faceHeight)
  if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) return 0

  const sourceScaleX = atlas.slotWidthPixels / atlas.slotWidth
  const sourceScaleY = atlas.slotHeightPixels / atlas.slotHeight
  context.drawImage(
    atlas.source,
    index * atlas.slotWidthPixels + (clippedLeft - destinationX) * sourceScaleX,
    (clippedTop - destinationY) * sourceScaleY,
    (clippedRight - clippedLeft) * sourceScaleX,
    (clippedBottom - clippedTop) * sourceScaleY,
    clippedLeft,
    clippedTop,
    clippedRight - clippedLeft,
    clippedBottom - clippedTop,
  )
  return 1
}

function drawCanvasFace(
  context: CanvasRenderingContext2D,
  geometry: CanvasCassetteGeometry,
  visual: CanvasCellVisual,
  faceY: number,
  faceHeight: number,
  faceColor: string,
  character: string,
  glyphColor: string,
  brightness: number,
  surface: CanvasGradient,
) {
  let drawOperations = 2
  context.fillStyle = faceColor
  context.fillRect(geometry.faceX, faceY, geometry.faceWidth, faceHeight)
  context.fillStyle = surface
  context.fillRect(geometry.faceX, faceY, geometry.faceWidth, faceHeight)

  const toneDifference = Math.abs(brightness - 1)
  if (toneDifference > 0.001) {
    context.fillStyle =
      brightness >= 1
        ? `rgba(255, 255, 255, ${Math.min(0.16, toneDifference * 0.9)})`
        : `rgba(0, 0, 0, ${Math.min(0.16, toneDifference * 0.9)})`
    context.fillRect(geometry.faceX, faceY, geometry.faceWidth, faceHeight)
    drawOperations += 1
  }

  return (
    drawOperations +
    drawCanvasGlyph(
      context,
      geometry,
      visual.glyphOffset,
      visual.characters,
      character,
      glyphColor,
      faceY,
      faceHeight,
    )
  )
}

function interpolateCanvasValue(progress: number, keyframes: readonly [number, number][]) {
  const clampedProgress = Math.max(0, Math.min(1, progress))

  for (let index = 1; index < keyframes.length; index += 1) {
    const [endOffset, endAngle] = keyframes[index]
    if (clampedProgress > endOffset) continue

    const [startOffset, startAngle] = keyframes[index - 1]
    const segmentProgress =
      endOffset === startOffset ? 1 : (clampedProgress - startOffset) / (endOffset - startOffset)
    return startAngle + (endAngle - startAngle) * segmentProgress
  }

  return keyframes[keyframes.length - 1][1]
}

function canvasVaneAngle(runtime: SplitFlapRuntime, motion: MotionTuning, now: number) {
  if (now <= runtime.pitchStart) return 0
  const elapsed = Math.min(runtime.duration, now - runtime.pitchStart)
  const progress = elapsed / runtime.duration

  return interpolateCanvasValue(
    progress,
    runtime.finalPitch
      ? [
          [0, 0],
          [0.34, -55],
          [0.5, -90],
          [0.62, -125],
          [0.78, -180],
          [0.9, -180 + motion.reboundDeg],
          [1, -180],
        ]
      : [
          [0, 0],
          [0.28, -55],
          [0.5, -90],
          [0.68, -125],
          [0.82, -180],
          [1, -180],
        ],
  )
}

function canvasStackShift(runtime: SplitFlapRuntime, now: number) {
  if (now <= runtime.pitchStart) return 0
  const progress = Math.min(runtime.duration, now - runtime.pitchStart) / runtime.duration

  return interpolateCanvasValue(
    progress,
    runtime.finalPitch
      ? [
          [0, 0],
          [0.42, 0],
          [0.65, 0.08],
          [0.78, 0.2],
          [0.9, -0.045],
          [1, 0],
        ]
      : [
          [0, 0],
          [0.45, 0],
          [0.72, 0.08],
          [0.82, 0.18],
          [0.9, -0.03],
          [1, 0],
        ],
  )
}

function canvasGlyphScaleX(transform: string) {
  if (!transform || transform === 'none') return 1
  try {
    return Math.abs(new DOMMatrixReadOnly(transform).a) || 1
  } catch {
    return 1
  }
}

export const SplitFlapMotionCanvas = memo(function SplitFlapMotionCanvas({
  geometryKey,
}: {
  geometryKey: string
}) {
  const { controller, layout, material: tuning } = useSplitFlap()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const staticGlyphIndicesRef = useRef(new Int16Array())
  const geometryRef = useRef<(CanvasCassetteGeometry | undefined)[]>([])
  const cellVisuals = useMemo(
    () =>
      layout.cells.map((cell, index) => {
        const highlighted = Boolean(layout.rows[cell.rowIndex]?.highlighted)
        const highlightFacePercent = highlighted
          ? Math.round(tuning.highlightFaceStrength * 100)
          : 0
        const highlightGlyphPercent = highlighted
          ? Math.round(tuning.highlightGlyphStrength * 100)
          : 0
        const topFaceColor = `color-mix(in srgb, ${tuning.topFaceColor} ${100 - highlightFacePercent}%, ${tuning.highlightFaceColor} ${highlightFacePercent}%)`
        const bottomFaceColor = `color-mix(in srgb, ${tuning.bottomFaceColor} ${100 - highlightFacePercent}%, ${tuning.highlightFaceColor} ${highlightFacePercent}%)`
        const glyphColors = Object.fromEntries(
          splitFlapTones.map((tone) => {
            const baseGlyphColor =
              tone === 'ochreOrange'
                ? tuning.ochreOrangeGlyphColor
                : tone === 'signalYellow'
                  ? tuning.signalYellowGlyphColor
                  : tuning.warmWhiteGlyphColor
            const top = `color-mix(in srgb, ${baseGlyphColor} ${100 - highlightGlyphPercent}%, ${tuning.highlightGlyphColor} ${highlightGlyphPercent}%)`
            return [
              tone,
              {
                bottom: `color-mix(in srgb, ${top} 96%, ${bottomFaceColor} 4%)`,
                top,
              },
            ]
          }),
        ) as CanvasCellVisual['glyphColors']

        return {
          bottomBrightness: 1 + signedLeafNoise(index, 31) * tuning.leafBrightnessVariation,
          bottomFaceColor,
          characters: Array.from(new Set(cell.flapDeck.map(({ character }) => character))),
          glyphColors,
          glyphOffset: glyphOffsetValues[index % glyphOffsetValues.length],
          topBrightness: 1 + signedLeafNoise(index, 7) * tuning.leafBrightnessVariation,
          topFaceColor,
        }
      }),
    [layout.cells, layout.rows, tuning],
  )
  const renderConfigRef = useRef({ cellVisuals, tuning })
  useEffect(() => {
    renderConfigRef.current = { cellVisuals, tuning }
  }, [cellVisuals, tuning])

  const rendererRef = useRef<SplitFlapCanvasRenderer>(() => undefined)
  useEffect(() => {
    rendererRef.current = (runtimes, motion, now) => {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      const staticCanvas = staticCanvasRef.current
      const staticContext = staticCanvas?.getContext('2d')
      if (!canvas || !context || !staticCanvas || !staticContext) return

      const pixelRatio = Number(canvas.dataset.pixelRatio ?? 1)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, canvas.width / pixelRatio, canvas.height / pixelRatio)
      let drawOperations = 1
      if (motion.variant === 'css3dCascade') {
        controller.recordCanvasFrame(drawOperations)
        return
      }

      const { cellVisuals: activeVisuals, tuning: activeTuning } = renderConfigRef.current

      runtimes.forEach((runtime) => {
        const geometry = geometryRef.current[runtime.index]
        const visual = activeVisuals[runtime.index]
        if (!geometry || !visual) return

        const staticGlyphIndices = staticGlyphIndicesRef.current
        if (!runtime.running) {
          if (staticGlyphIndices[runtime.index] !== -1) {
            staticContext.clearRect(
              geometry.cellX,
              geometry.cellY,
              geometry.cellWidth,
              geometry.cellHeight,
            )
            staticGlyphIndices[runtime.index] = -1
            drawOperations += 1
          }
          return
        }

        const currentPosition = runtime.positions[runtime.currentIndex]
        const nextPosition =
          runtime.positions[(runtime.currentIndex + 1) % runtime.positions.length]
        const currentGlyphColors = visual.glyphColors[currentPosition.tone]
        const nextGlyphColors = visual.glyphColors[nextPosition.tone]
        const angle = canvasVaneAngle(runtime, motion, now)
        const angleRadians = (Math.abs(angle) * Math.PI) / 180
        const edgeOn = Math.sin(Math.min(Math.PI, angleRadians))
        const stackShift = canvasStackShift(runtime, now)
        const {
          bottomFaceHeight,
          bottomFaceY,
          bottomSurface,
          cellHeight,
          cellWidth,
          cellX,
          cellY,
          edge,
          faceWidth,
          faceX,
          lowerShadow,
          seamY,
          topFaceHeight,
          topFaceY,
          topSurface,
          unit,
        } = geometry

        if (staticGlyphIndices[runtime.index] !== runtime.currentIndex) {
          staticContext.clearRect(cellX, geometry.cellY, cellWidth, cellHeight)
          drawOperations += drawCanvasGlyph(
            staticContext,
            geometry,
            visual.glyphOffset,
            visual.characters,
            nextPosition.character,
            nextGlyphColors.top,
            topFaceY,
            topFaceHeight,
          )
          drawOperations += drawCanvasGlyph(
            staticContext,
            geometry,
            visual.glyphOffset,
            visual.characters,
            currentPosition.character,
            currentGlyphColors.bottom,
            bottomFaceY,
            bottomFaceHeight,
          )
          staticGlyphIndices[runtime.index] = runtime.currentIndex
          drawOperations += 1
        }

        if (edgeOn > 0.01) {
          context.save()
          context.globalAlpha = edgeOn
          context.fillStyle = lowerShadow
          context.fillRect(cellX + 0.1 * unit, seamY, cellWidth - 0.2 * unit, cellHeight / 2)
          drawOperations += 1
          context.restore()
        }

        if (activeTuning.stackedEdges && Math.abs(stackShift) > 0.002) {
          const stackMotion = Math.min(1, Math.abs(stackShift) / 0.18)
          const stackTop = bottomFaceY + bottomFaceHeight
          const stackBottom = cellY + cellHeight
          const faceInsetY = topFaceY - cellY
          const spareLeafHeight = cellHeight / 2 - faceInsetY
          const spareLeafCount = Math.max(2, Math.min(3, Math.round(activeTuning.spareLeafCount)))
          const spareLeafVariation = activeTuning.leafVariation ? 1 : 0
          const revealScale = 1 + signedLeafNoise(runtime.index, 181) * 0.14 * spareLeafVariation

          context.save()
          context.beginPath()
          context.rect(faceX, stackTop, faceWidth, Math.max(0, stackBottom - stackTop))
          context.clip()
          context.globalAlpha = 0.72 * stackMotion
          context.fillStyle = '#050605'
          context.fillRect(faceX, stackTop, faceWidth, stackBottom - stackTop)
          drawOperations += 1

          spareLeafXOffsets.slice(0, spareLeafCount).forEach((baseXOffset, leafIndex) => {
            const layerProgress = leafIndex / Math.max(1, spareLeafCount - 1)
            const bottomOffset =
              leafIndex *
              spareLeafStep *
              (revealScale +
                signedLeafNoise(runtime.index, 277 + leafIndex * 31) * 0.035 * spareLeafVariation)
            const xOffset =
              baseXOffset +
              signedLeafNoise(runtime.index, 187) * 0.035 * spareLeafVariation +
              signedLeafNoise(runtime.index, 331 + leafIndex * 41) * 0.025 * spareLeafVariation
            const brightness = Math.min(
              0.99,
              (0.78 + layerProgress * 0.2) *
                (1 +
                  signedLeafNoise(runtime.index, 191 + leafIndex * 17) *
                    activeTuning.leafBrightnessVariation *
                    0.7),
            )
            const edgeStrength =
              1 -
              (0.12 + ((signedLeafNoise(runtime.index, 229 + leafIndex * 23) + 1) / 2) * 0.16) *
                spareLeafVariation
            const edgeMix = Math.round(Math.min(70, brightness * edgeStrength * 80)) / 100
            const edgeY =
              stackBottom -
              faceInsetY -
              bottomOffset * unit -
              spareLeafHeight * 0.08 +
              stackShift * unit

            context.globalAlpha = (0.42 + layerProgress * 0.16) * stackMotion
            context.fillStyle = `rgb(${Math.round(88 * edgeMix)}, ${Math.round(86 * edgeMix)}, ${Math.round(68 * edgeMix)})`
            context.fillRect(faceX + xOffset * unit, edgeY, faceWidth, Math.max(0.45, 0.04 * unit))
            drawOperations += 1
          })
          context.restore()
        }

        context.save()
        if (angle > -90) {
          const projection = Math.max(0.001, Math.cos(angleRadians))
          context.translate(0, seamY)
          context.scale(1, projection)
          context.translate(0, -seamY)
          drawOperations += drawCanvasFace(
            context,
            geometry,
            visual,
            topFaceY,
            topFaceHeight,
            visual.topFaceColor,
            currentPosition.character,
            currentGlyphColors.top,
            visual.topBrightness,
            topSurface,
          )
        } else {
          const projection = Math.max(0.001, -Math.cos(angleRadians))
          context.translate(0, seamY)
          context.scale(1, projection)
          context.translate(0, -seamY)
          drawOperations += drawCanvasFace(
            context,
            geometry,
            visual,
            bottomFaceY,
            bottomFaceHeight,
            visual.bottomFaceColor,
            nextPosition.character,
            nextGlyphColors.bottom,
            visual.bottomBrightness,
            bottomSurface,
          )
        }
        context.restore()

        if (edgeOn > 0.32) {
          const edgeHeight = Math.max(0.5, activeTuning.leafThickness * unit * edgeOn)
          context.globalAlpha = 0.72
          context.fillStyle = edge
          context.fillRect(faceX, seamY - edgeHeight / 2, faceWidth, edgeHeight)
          context.globalAlpha = 1
          drawOperations += 1
        }
      })

      controller.recordCanvasFrame(drawOperations)
    }
  }, [controller])

  useEffect(
    () => controller.registerCanvasRenderer((...arguments_) => rendererRef.current(...arguments_)),
    [controller],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const staticCanvas = staticCanvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !staticCanvas || !parent) return

    const measure = () => {
      const canvasRect = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.dataset.pixelRatio = `${pixelRatio}`
      staticCanvas.dataset.pixelRatio = `${pixelRatio}`
      canvas.width = Math.max(1, Math.round(canvasRect.width * pixelRatio))
      canvas.height = Math.max(1, Math.round(canvasRect.height * pixelRatio))
      staticCanvas.width = canvas.width
      staticCanvas.height = canvas.height
      const context = canvas.getContext('2d')
      const staticContext = staticCanvas.getContext('2d')
      if (!context || !staticContext) return
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      staticContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      geometryRef.current = Array.from({ length: layout.cells.length })
      staticGlyphIndicesRef.current = new Int16Array(layout.cells.length)
      staticGlyphIndicesRef.current.fill(-1)

      const cassettes = Array.from(
        parent.querySelectorAll<HTMLElement>('[data-split-flap-cassette]'),
      )
      const resolvedVisuals = [...renderConfigRef.current.cellVisuals]
      const computedVisuals = new Map<
        string,
        Pick<CanvasCellVisual, 'bottomFaceColor' | 'glyphColors' | 'topFaceColor'>
      >()

      cassettes.forEach((cassette) => {
        const index = Number(cassette.dataset.splitFlapIndex)
        if (Number.isNaN(index)) return
        const cell = layout.cells[index]
        if (!cell) return
        const upperFace = cassette.querySelector<HTMLElement>('[data-slot="stationary-upper"]')
        const lowerFace = cassette.querySelector<HTMLElement>('[data-slot="stationary-lower"]')
        const visual = resolvedVisuals[index]
        if (upperFace && lowerFace && visual) {
          const visualKey = `${Number(Boolean(layout.rows[cell.rowIndex]?.highlighted))}`
          let computedVisual = computedVisuals.get(visualKey)
          if (!computedVisual) {
            const upperStyle = getComputedStyle(upperFace)
            const lowerStyle = getComputedStyle(lowerFace)
            const previousUpperColor = upperFace.style.getPropertyValue(activeGlyphColorProperty)
            const previousLowerColor = lowerFace.style.getPropertyValue(activeGlyphColorProperty)
            const glyphColors = Object.fromEntries(
              splitFlapTones.map((tone) => {
                upperFace.style.setProperty(
                  activeGlyphColorProperty,
                  splitFlapToneVariable(tone, false),
                )
                lowerFace.style.setProperty(
                  activeGlyphColorProperty,
                  splitFlapToneVariable(tone, true),
                )
                return [
                  tone,
                  {
                    bottom: getComputedStyle(lowerFace, '::before').color,
                    top: getComputedStyle(upperFace, '::before').color,
                  },
                ]
              }),
            ) as CanvasCellVisual['glyphColors']
            if (previousUpperColor) {
              upperFace.style.setProperty(activeGlyphColorProperty, previousUpperColor)
            } else {
              upperFace.style.removeProperty(activeGlyphColorProperty)
            }
            if (previousLowerColor) {
              lowerFace.style.setProperty(activeGlyphColorProperty, previousLowerColor)
            } else {
              lowerFace.style.removeProperty(activeGlyphColorProperty)
            }
            computedVisual = {
              bottomFaceColor: lowerStyle.backgroundColor,
              glyphColors,
              topFaceColor: upperStyle.backgroundColor,
            }
            computedVisuals.set(visualKey, computedVisual)
          }
          resolvedVisuals[index] = {
            ...visual,
            ...computedVisual,
          }
        }
        const cassetteBase = cassette.querySelector<HTMLElement>('[data-slot="cassette-base"]')
        const scaleContext = cassette.closest<HTMLElement>('[data-split-flap-scale-context]')
        if (!cassetteBase || !scaleContext || !upperFace || !lowerFace || !visual) return

        const rectangle = cassetteBase.getBoundingClientRect()
        const upperRectangle = upperFace.getBoundingClientRect()
        const lowerRectangle = lowerFace.getBoundingClientRect()
        const scaleRectangle = scaleContext.getBoundingClientRect()
        const unit = scaleRectangle.width / 100
        const cellX = rectangle.left - canvasRect.left
        const cellY = rectangle.top - canvasRect.top
        const cellWidth = rectangle.width
        const cellHeight = rectangle.height
        const seamY = cellY + cellHeight / 2
        const faceX = upperRectangle.left - canvasRect.left
        const faceWidth = upperRectangle.width
        const topFaceY = upperRectangle.top - canvasRect.top
        const topFaceHeight = upperRectangle.height
        const bottomFaceY = lowerRectangle.top - canvasRect.top
        const bottomFaceHeight = lowerRectangle.height
        const computedGlyphStyle = getComputedStyle(upperFace, '::before')
        const glyphSize = Number.parseFloat(computedGlyphStyle.fontSize)
        const glyphLineHeight = Number.parseFloat(computedGlyphStyle.lineHeight)
        const glyphTop = Number.parseFloat(computedGlyphStyle.top)
        const glyphStyle = {
          family: computedGlyphStyle.fontFamily,
          opacity: Number.parseFloat(computedGlyphStyle.opacity) || 1,
          size: glyphSize,
          weight: computedGlyphStyle.fontWeight,
          width: canvasGlyphScaleX(computedGlyphStyle.transform),
        }
        const baseline =
          topFaceY +
          (Number.isFinite(glyphTop) ? glyphTop : 0) +
          ((Number.isFinite(glyphLineHeight) ? glyphLineHeight : glyphSize * 1.2) - glyphSize) / 2 +
          glyphSize * 0.79
        const topSurface = context.createLinearGradient(0, topFaceY, 0, topFaceY + topFaceHeight)
        topSurface.addColorStop(0, 'rgba(224, 216, 177, 0.032)')
        topSurface.addColorStop(0.38, 'rgba(0, 0, 0, 0)')
        topSurface.addColorStop(1, 'rgba(0, 0, 0, 0.12)')
        const bottomSurface = context.createLinearGradient(
          0,
          bottomFaceY,
          0,
          bottomFaceY + bottomFaceHeight,
        )
        bottomSurface.addColorStop(0, 'rgba(0, 0, 0, 0.18)')
        bottomSurface.addColorStop(0.38, 'rgba(0, 0, 0, 0.035)')
        bottomSurface.addColorStop(1, 'rgba(214, 207, 170, 0.025)')
        const lowerShadow = context.createLinearGradient(0, seamY, 0, cellY + cellHeight)
        lowerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.66)')
        lowerShadow.addColorStop(0.34, 'rgba(0, 0, 0, 0.2)')
        lowerShadow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        const edge = context.createLinearGradient(faceX, 0, faceX + faceWidth, 0)
        edge.addColorStop(0, '#080a08')
        edge.addColorStop(0.22, '#30342f')
        edge.addColorStop(0.42, '#777d76')
        edge.addColorStop(0.63, '#2a2e2a')
        edge.addColorStop(1, '#070807')
        geometryRef.current[index] = {
          baseline,
          bottomFaceHeight,
          bottomFaceY,
          bottomSurface,
          cellHeight,
          cellWidth,
          cellX,
          cellY,
          edge,
          faceWidth,
          faceX,
          glyphStyle,
          lowerShadow,
          seamY,
          topFaceHeight,
          topFaceY,
          topSurface,
          unit,
        }
      })

      renderConfigRef.current = {
        ...renderConfigRef.current,
        cellVisuals: resolvedVisuals,
      }

      const glyphAtlases = new Set<CanvasGlyphAtlas>()
      geometryRef.current.forEach((geometry, index) => {
        const visual = resolvedVisuals[index]
        if (!geometry || !visual) return
        const deckTones = new Set(layout.cells[index]?.flapDeck.map((position) => position.tone))
        deckTones.forEach((tone) => {
          glyphAtlases.add(
            getCanvasGlyphAtlas(
              geometry.glyphStyle,
              visual.glyphColors[tone].top,
              visual.characters,
            ),
          )
          glyphAtlases.add(
            getCanvasGlyphAtlas(
              geometry.glyphStyle,
              visual.glyphColors[tone].bottom,
              visual.characters,
            ),
          )
        })
      })

      // Upload each immutable atlas before motion starts. Without this warm-up,
      // the first active frame pays the texture upload cost for every field and tone.
      for (const targetContext of [context, staticContext]) {
        targetContext.save()
        targetContext.globalAlpha = 0.001
        let atlasIndex = 0
        glyphAtlases.forEach((atlas) => {
          targetContext.drawImage(
            atlas.source,
            0,
            0,
            atlas.slotWidthPixels * atlas.slots,
            atlas.slotHeightPixels,
            atlasIndex,
            0,
            1,
            1,
          )
          atlasIndex += 1
        })
        targetContext.restore()
      }

      controller.requestCanvasRender()
    }

    let measureFrame = 0
    const scheduleMeasure = () => {
      if (measureFrame) return
      measureFrame = requestAnimationFrame(() => {
        measureFrame = 0
        measure()
      })
    }
    const resizeObserver = new ResizeObserver(scheduleMeasure)
    const styleObserver = new MutationObserver(scheduleMeasure)
    const board = parent.closest<HTMLElement>(
      '[data-slot="split-flap-board"], [data-slot="split-flap-grid"]',
    )
    resizeObserver.observe(parent)
    for (let element = board; element; element = element.parentElement) {
      styleObserver.observe(element, { attributes: true, attributeFilter: ['class', 'style'] })
    }
    const handleFontsLoaded = () => {
      disposeCanvasGlyphAtlases()
      scheduleMeasure()
    }
    document.fonts.addEventListener('loadingdone', handleFontsLoaded)
    scheduleMeasure()

    return () => {
      cancelAnimationFrame(measureFrame)
      document.fonts.removeEventListener('loadingdone', handleFontsLoaded)
      resizeObserver.disconnect()
      styleObserver.disconnect()
    }
  }, [controller, geometryKey, layout.cells, layout.columns, layout.rows])

  return (
    <>
      <canvas
        ref={staticCanvasRef}
        {...stylex.props(styles.motionCanvas, styles.staticMotionCanvas)}
        aria-hidden="true"
        data-split-flap-static-canvas
      />
      <canvas
        ref={canvasRef}
        {...stylex.props(styles.motionCanvas)}
        aria-hidden="true"
        data-split-flap-motion-canvas
      />
    </>
  )
})
