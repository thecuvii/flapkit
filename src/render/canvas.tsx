'use client'

// Canvas renderer used by the Riffle adapter.

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useSplitFlap } from '../motion/provider'
import {
  glyphOffsetValues,
  lowerGlyphXOffset,
  spareLeafStep,
  spareLeafXOffsets,
  splitFlapLeafBrightnessVariation,
  splitFlapSpareLeafCount,
} from '../motion/constants'
import {
  activeGlyphColorProperty,
  signedLeafNoise,
  splitFlapGlyphScript,
  splitFlapVariantVariable,
  type SplitFlapCanvasRenderer,
  type SplitFlapGlyphScript,
  type SplitFlapRuntime,
} from '../motion/runtime'
import { splitFlapGraphemes, splitFlapVariants, type Variant } from '../deck'
import { classProps, styles } from './classes'

type CanvasCassetteGeometry = {
  baselines: Record<SplitFlapGlyphScript, number>
  bottomFaceHeight: number
  bottomFaceY: number
  bottomSurface: CanvasGradient
  cellHeight: number
  cellWidth: number
  cellX: number
  cellY: number
  faceWidth: number
  faceX: number
  /** Layout-space x centers of each settled glyph, 1 for a cell and 2 for a wide leaf. */
  glyphCenters: readonly number[]
  glyphStyles: Record<SplitFlapGlyphScript, CanvasGlyphStyle>
  seamY: number
  spareLeafEdgeColor: string
  topFaceHeight: number
  topFaceY: number
  topSurface: CanvasGradient
  unit: number
}

type CanvasGlyphStyle = {
  family: string
  height: number
  /** CSS letter-spacing string; centered DOM text includes its trailing spacing. */
  letterSpacing: string
  lineHeight: number
  opacity: number
  size: number
  stretch: CanvasFontStretch
  style: string
  variantCaps: CanvasFontVariantCaps
  weight: string
  width: number
}

type CanvasCellVisual = {
  bottomBrightness: number
  bottomFaceColor: string
  characters: readonly string[]
  glyphColors: Record<Variant, { bottom: string; top: string }>
  glyphOffset: number
  span: number
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
const canvasFontMetricsCache = new Map<string, { ascent: number; descent: number }>()

function disposeCanvasGlyphAtlases() {
  canvasGlyphAtlases.forEach((atlas) => {
    if (atlas.source instanceof ImageBitmap) atlas.source.close()
  })
  canvasGlyphAtlases.clear()
  canvasFontMetricsCache.clear()
}

function canvasFontSignature(glyphStyle: CanvasGlyphStyle) {
  return [
    glyphStyle.size.toFixed(3),
    glyphStyle.family,
    glyphStyle.style,
    glyphStyle.weight,
    glyphStyle.stretch,
    glyphStyle.variantCaps,
    glyphStyle.letterSpacing,
  ].join('|')
}

function applyCanvasFont(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, glyphStyle: CanvasGlyphStyle) {
  context.font = `${glyphStyle.style} ${glyphStyle.weight} ${glyphStyle.size}px ${glyphStyle.family}`
  context.fontStretch = glyphStyle.stretch
  context.fontVariantCaps = glyphStyle.variantCaps
  // Older engines lack letterSpacing on the 2D context; the offset is sub-pixel there.
  if ('letterSpacing' in context) context.letterSpacing = glyphStyle.letterSpacing
}

/** CSS line-box baseline: half-leading + font ascent, not a 0.79em guess. */
function canvasFontMetrics(glyphStyle: CanvasGlyphStyle) {
  const key = canvasFontSignature(glyphStyle)
  const cached = canvasFontMetricsCache.get(key)
  if (cached) return cached

  const fallback = { ascent: glyphStyle.size * 0.8, descent: glyphStyle.size * 0.2 }
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    canvasFontMetricsCache.set(key, fallback)
    return fallback
  }

  applyCanvasFont(context, glyphStyle)
  const metrics = context.measureText('Hg')
  const ascent = metrics.fontBoundingBoxAscent
  const descent = metrics.fontBoundingBoxDescent
  const resolved =
    Number.isFinite(ascent) && Number.isFinite(descent) && ascent + descent > 0
      ? { ascent, descent }
      : fallback
  canvasFontMetricsCache.set(key, resolved)
  return resolved
}

function canvasLineBoxBaseline(
  top: number,
  lineHeight: number,
  metrics: { ascent: number; descent: number },
) {
  const fontHeight = metrics.ascent + metrics.descent
  return top + (lineHeight - fontHeight) / 2 + metrics.ascent
}

function getCanvasGlyphAtlas(
  glyphStyle: CanvasGlyphStyle,
  color: string,
  characters: readonly string[],
  script: SplitFlapGlyphScript,
) {
  const fontSize = glyphStyle.size
  const matchingCharacters = characters.filter(
    (character) => character === ' ' || splitFlapGlyphScript(character) === script,
  )
  if (!matchingCharacters.includes(' ')) matchingCharacters.unshift(' ')
  const key = [
    fontSize.toFixed(3),
    glyphStyle.family,
    glyphStyle.style,
    glyphStyle.weight,
    glyphStyle.stretch,
    glyphStyle.variantCaps,
    glyphStyle.letterSpacing,
    glyphStyle.width.toFixed(3),
    glyphStyle.height.toFixed(3),
    glyphStyle.lineHeight.toFixed(3),
    glyphStyle.opacity.toFixed(3),
    color,
    matchingCharacters.join('\u0000'),
    'origin:line-box',
  ].join('|')
  const cached = canvasGlyphAtlases.get(key)
  if (cached) return cached

  const slotWidthPixels = Math.ceil(fontSize * 1.6 * canvasGlyphAtlasPixelRatio)
  const slotHeightPixels = Math.ceil(fontSize * 1.5 * canvasGlyphAtlasPixelRatio)
  const slotWidth = slotWidthPixels / canvasGlyphAtlasPixelRatio
  const slotHeight = slotHeightPixels / canvasGlyphAtlasPixelRatio
  const fontMetrics = canvasFontMetrics(glyphStyle)
  const baseline = canvasLineBoxBaseline(0, glyphStyle.lineHeight, fontMetrics)
  const usesOffscreenCanvas = typeof OffscreenCanvas !== 'undefined'
  const canvas = usesOffscreenCanvas
    ? new OffscreenCanvas(slotWidthPixels * matchingCharacters.length, slotHeightPixels)
    : document.createElement('canvas')
  canvas.width = slotWidthPixels * matchingCharacters.length
  canvas.height = slotHeightPixels
  const context = canvas.getContext('2d')

  if (context) {
    context.scale(canvasGlyphAtlasPixelRatio, canvasGlyphAtlasPixelRatio)
    applyCanvasFont(context, glyphStyle)
    context.textAlign = 'center'
    context.textBaseline = 'alphabetic'
    context.fillStyle = color
    context.globalAlpha = glyphStyle.opacity
    // No shadow: the looks' text-shadow is a 6% alpha halo that reads as
    // nothing, while a full-strength canvas shadow doubles edge coverage and
    // makes the raster glyph visibly bolder than the DOM glyph it hands to.

    // Scale around the CSS line-height box center (transform-origin 50% 50%).
    const boxCenterY = glyphStyle.lineHeight / 2

    for (let index = 0; index < matchingCharacters.length; index += 1) {
      const character = matchingCharacters[index]
      if (character === ' ') continue

      context.save()
      context.translate(index * slotWidth + slotWidth / 2, boxCenterY)
      context.scale(glyphStyle.width, glyphStyle.height)
      context.fillText(character, 0, baseline - boxCenterY)
      context.restore()
    }
  }

  const atlas = {
    baseline,
    characterIndices: new Map(matchingCharacters.map((character, index) => [character, index])),
    source:
      usesOffscreenCanvas && canvas instanceof OffscreenCanvas
        ? canvas.transferToImageBitmap()
        : canvas,
    slots: matchingCharacters.length,
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

function drawCanvasGlyphSlot(
  context: CanvasRenderingContext2D,
  geometry: CanvasCassetteGeometry,
  glyphOffset: number,
  characters: readonly string[],
  character: string,
  color: string,
  centerX: number,
  faceY: number,
  faceHeight: number,
  lower = false,
) {
  if (character === ' ') return 0

  const script = splitFlapGlyphScript(character)
  const atlas = getCanvasGlyphAtlas(geometry.glyphStyles[script], color, characters, script)
  const index = atlas.characterIndices.get(character) ?? atlas.characterIndices.get(' ') ?? 0
  const destinationX =
    centerX + geometry.unit * (glyphOffset + (lower ? lowerGlyphXOffset : 0)) - atlas.slotWidth / 2
  const destinationY = geometry.baselines[script] - atlas.baseline
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

function drawCanvasGlyph(
  context: CanvasRenderingContext2D,
  geometry: CanvasCassetteGeometry,
  glyphOffset: number,
  characters: readonly string[],
  character: string,
  color: string,
  span: number,
  faceY: number,
  faceHeight: number,
  lower = false,
) {
  const graphemes = splitFlapGraphemes(character)
  const centers =
    geometry.glyphCenters.length > 0
      ? geometry.glyphCenters
      : span === 2
        ? [
            geometry.faceX + geometry.faceWidth * 0.21,
            geometry.faceX + geometry.faceWidth * 0.79,
          ]
        : [geometry.cellX + geometry.cellWidth / 2]
  // Wide CSS parts do not take the single-cell mechanical jitter. Adding it
  // here put the last animated frame beside the settled DOM glyphs.
  const mechanicalOffset = centers.length > 1 ? 0 : glyphOffset

  return centers.reduce(
    (operations, centerX, index) =>
      operations +
      drawCanvasGlyphSlot(
        context,
        geometry,
        mechanicalOffset,
        characters,
        graphemes[index] ?? ' ',
        color,
        centerX,
        faceY,
        faceHeight,
        lower,
      ),
    0,
  )
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
  lower = false,
) {
  let drawOperations = 2
  context.fillStyle = faceColor
  context.fillRect(geometry.faceX, faceY, geometry.faceWidth, faceHeight)
  context.fillStyle = surface
  context.fillRect(geometry.faceX, faceY, geometry.faceWidth, faceHeight)

  const brightnessDifference = Math.abs(brightness - 1)
  if (brightnessDifference > 0.001) {
    context.fillStyle =
      brightness >= 1
        ? `rgba(255, 255, 255, ${Math.min(0.16, brightnessDifference * 0.9)})`
        : `rgba(0, 0, 0, ${Math.min(0.16, brightnessDifference * 0.9)})`
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
      visual.span,
      faceY,
      faceHeight,
      lower,
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

function canvasVaneAngle(runtime: SplitFlapRuntime, now: number) {
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

function parseCssNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function canvasGlyphScale(
  transform: string,
  hostStyle: CSSStyleDeclaration,
  axis: 'x' | 'y',
) {
  if (transform && transform !== 'none') {
    try {
      const matrix = new DOMMatrixReadOnly(transform)
      const value = Math.abs(axis === 'x' ? matrix.a : matrix.d)
      if (value) return value
    } catch {
      // Fall through to the look's published scale variables.
    }
  }

  const keys =
    axis === 'x'
      ? ['--flapkit-active-glyph-width', '--flapkit-glyph-width']
      : ['--flapkit-active-glyph-scale-y', '--flapkit-glyph-scale-y']
  for (const key of keys) {
    const parsed = parseCssNumber(hostStyle.getPropertyValue(key))
    if (parsed > 0) return parsed
  }
  return axis === 'y' ? 0.78 : 1
}

function measureCanvasGlyph(
  element: HTMLElement,
  script: SplitFlapGlyphScript,
  topFaceY: number,
  pseudoElement: '::before' | null,
) {
  const previousScript = element.dataset.splitFlapScript
  if (script === 'cjk') {
    element.dataset.splitFlapScript = 'cjk'
  } else {
    delete element.dataset.splitFlapScript
  }

  const computedStyle = getComputedStyle(element, pseudoElement)
  const hostStyle = getComputedStyle(element)
  // Layout px — same space as the canvas backing store. Ancestor scales then
  // shrink both the DOM glyph and the canvas the same way.
  const size = parseCssNumber(computedStyle.fontSize)
  const generated = computedStyle.display !== 'none'
  let lineHeight = generated ? parseCssNumber(computedStyle.lineHeight) : Number.NaN
  let top = generated ? parseCssNumber(computedStyle.top) : Number.NaN
  if (!Number.isFinite(top)) {
    top = parseCssNumber(hostStyle.getPropertyValue('--compact-glyph-top'))
  }
  if (!Number.isFinite(lineHeight)) lineHeight = size * 1.2
  if (!Number.isFinite(top)) top = 0
  const glyphStyle: CanvasGlyphStyle = {
    family: computedStyle.fontFamily,
    height: canvasGlyphScale(computedStyle.transform, hostStyle, 'y'),
    letterSpacing:
      computedStyle.letterSpacing === 'normal' ? '0px' : computedStyle.letterSpacing,
    lineHeight,
    opacity: Number.parseFloat(computedStyle.opacity) || 1,
    size,
    stretch: computedStyle.fontStretch as CanvasFontStretch,
    style: computedStyle.fontStyle,
    variantCaps: computedStyle.fontVariantCaps as CanvasFontVariantCaps,
    weight: computedStyle.fontWeight,
    width: canvasGlyphScale(computedStyle.transform, hostStyle, 'x'),
  }
  const baseline = topFaceY + canvasLineBoxBaseline(top, lineHeight, canvasFontMetrics(glyphStyle))

  if (previousScript) {
    element.dataset.splitFlapScript = previousScript
  } else {
    delete element.dataset.splitFlapScript
  }

  return { baseline, glyphStyle }
}

export const MotionCanvas = memo(function MotionCanvas({ geometryKey }: { geometryKey: string }) {
  const { controller, layout, presentation } = useSplitFlap()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const staticGlyphIndicesRef = useRef(new Int16Array())
  const geometryRef = useRef<(CanvasCassetteGeometry | undefined)[]>([])
  const layoutRef = useRef(layout)
  useLayoutEffect(() => {
    layoutRef.current = layout
  }, [layout])
  const cellVisualsKey = `${layout.layoutKey}:${layout.rows
    .map((row) => Number(Boolean(row.highlighted)))
    .join('')}:${JSON.stringify(presentation)}`
  const cellVisuals = useMemo(
    () =>
      layout.cells.map((cell, index) => {
        const topFaceColor = '#282921'
        const bottomFaceColor = '#25261e'
        const glyphColors = Object.fromEntries(
          splitFlapVariants.map((variant) => {
            const baseGlyphColor =
              variant === 'orange' ? '#cf9138' : variant === 'yellow' ? '#e4c22f' : '#e8e5d7'
            const top = baseGlyphColor
            return [
              variant,
              {
                bottom: `color-mix(in srgb, ${top} 96%, ${bottomFaceColor} 4%)`,
                top,
              },
            ]
          }),
        ) as CanvasCellVisual['glyphColors']

        return {
          bottomBrightness: 1 + signedLeafNoise(index, 31) * splitFlapLeafBrightnessVariation,
          bottomFaceColor,
          characters: Array.from(
            new Set(cell.flapDeck.flatMap(({ character }) => splitFlapGraphemes(character))),
          ),
          glyphColors,
          glyphOffset: glyphOffsetValues[index % glyphOffsetValues.length],
          span: cell.span,
          topBrightness: 1 + signedLeafNoise(index, 7) * splitFlapLeafBrightnessVariation,
          topFaceColor,
        }
      }),
    // Targets create fresh layout arrays, but do not alter these static visuals.
    // Recompute only when topology, highlighting, or presentation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cellVisualsKey],
  )
  const renderConfigRef = useRef({ cellVisuals })
  useEffect(() => {
    renderConfigRef.current = { cellVisuals }
  }, [cellVisuals])

  const rendererRef = useRef<SplitFlapCanvasRenderer>(() => undefined)
  useEffect(() => {
    rendererRef.current = (runtimes, motion, now) => {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      const staticCanvas = staticCanvasRef.current
      const staticContext = staticCanvas?.getContext('2d')
      if (!canvas || !context || !staticCanvas || !staticContext) return

      const pixelRatio = Number(canvas.dataset.pixelRatio ?? 1)
      const snapX = Number(canvas.dataset.snapX ?? 0)
      const snapY = Number(canvas.dataset.snapY ?? 0)
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      // Same device-pixel snap offset measure() applied, so layout-space
      // drawing lands on the pixels the DOM cassettes occupy.
      context.setTransform(pixelRatio, 0, 0, pixelRatio, snapX * pixelRatio, snapY * pixelRatio)
      let drawOperations = 1
      if (motion.variant === 'scrub') {
        controller.recordCanvasFrame(drawOperations)
        return
      }

      const { cellVisuals: activeVisuals } = renderConfigRef.current

      runtimes.forEach((runtime) => {
        const geometry = geometryRef.current[runtime.index]
        const visual = activeVisuals[runtime.index]
        if (!geometry || !visual) return

        const staticGlyphIndices = staticGlyphIndicesRef.current
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
        if (!runtime.running) return

        const currentPosition = runtime.positions[runtime.currentIndex]
        const nextPosition =
          runtime.positions[(runtime.currentIndex + 1) % runtime.positions.length]
        const currentGlyphColors = visual.glyphColors[currentPosition.variant]
        const nextGlyphColors = visual.glyphColors[nextPosition.variant]
        const angle = canvasVaneAngle(runtime, now)
        const angleRadians = (Math.abs(angle) * Math.PI) / 180
        const stackShift = canvasStackShift(runtime, now)
        // Keep the last settle hold on the DOM glyphs. Painting them on canvas
        // here was the snap: the landed raster never quite matched idle.
        const landed = runtime.finalPitch && angle <= -180 + 1e-6
        if (now < runtime.pitchStart || landed) return

        const {
          bottomFaceHeight,
          bottomFaceY,
          bottomSurface,
          cellHeight,
          cellY,
          faceWidth,
          faceX,
          seamY,
          topFaceHeight,
          topFaceY,
          topSurface,
          unit,
        } = geometry

        if (Math.abs(stackShift) > 0.002) {
          const stackMotion = Math.min(1, Math.abs(stackShift) / 0.18)
          const stackTop = bottomFaceY + bottomFaceHeight
          const stackBottom = cellY + cellHeight
          const faceInsetY = topFaceY - cellY
          const spareLeafHeight = cellHeight / 2 - faceInsetY
          const spareLeafCount = splitFlapSpareLeafCount
          const spareLeafVariation = 1
          const revealScale = 1 + signedLeafNoise(runtime.index, 181) * 0.14 * spareLeafVariation

          context.save()
          context.beginPath()
          context.rect(faceX, stackTop, faceWidth, Math.max(0, stackBottom - stackTop))
          context.clip()
          context.globalAlpha = 0.14 * stackMotion
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
                    splitFlapLeafBrightnessVariation *
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
            context.fillStyle = `color-mix(in srgb, ${geometry.spareLeafEdgeColor} ${Math.round(edgeMix * 100)}%, black)`
            context.fillRect(faceX + xOffset * unit, edgeY, faceWidth, Math.max(0.3, 0.015 * unit))
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
          // Incoming vane is the arriving lower leaf — same short height as the
          // idle face, so it never paints over the spare magazine.
          context.beginPath()
          context.rect(faceX, bottomFaceY, faceWidth, bottomFaceHeight)
          context.clip()
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
            true,
          )
        }
        context.restore()
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
      const activeLayout = layoutRef.current
      // Layout pixels, not getBoundingClientRect. An ancestor scale (docs fit)
      // must not change the backing-store size or font-size would disagree with
      // the CSS box the bitmap is stretched into.
      const layoutWidth = parent.clientWidth
      const layoutHeight = parent.clientHeight
      const parentRect = parent.getBoundingClientRect()
      const visualScaleX = layoutWidth > 0 ? parentRect.width / layoutWidth : 1
      const visualScaleY = layoutHeight > 0 ? parentRect.height / layoutHeight : 1
      const deviceRatio = window.devicePixelRatio || 1
      const pixelRatio = Math.min(deviceRatio, 2)
      // Snap the bitmap to the device pixel grid. cqw sizing leaves the board
      // at a fractional device offset, and a canvas composited there is
      // resampled bilinearly: every raster glyph goes soft while the DOM glyph
      // it hands over to stays vector-crisp, which reads as a snap when the
      // last leaf lands. Pull the canvas back by the fraction and draw
      // forward by the same amount so content stays put but texels map 1:1.
      // clientWidth/Height are rounded, so allow up to a pixel of drift
      // before treating the difference as an ancestor transform.
      const canSnap =
        deviceRatio === pixelRatio &&
        Math.abs(parentRect.width - layoutWidth) < 1 &&
        Math.abs(parentRect.height - layoutHeight) < 1
      const fraction = (value: number) => ((value % 1) + 1) % 1
      const snapX = canSnap ? fraction(parentRect.left * pixelRatio) / pixelRatio : 0
      const snapY = canSnap ? fraction(parentRect.top * pixelRatio) / pixelRatio : 0
      const backingWidth = Math.max(1, Math.ceil((layoutWidth + snapX) * pixelRatio))
      const backingHeight = Math.max(1, Math.ceil((layoutHeight + snapY) * pixelRatio))
      for (const target of [canvas, staticCanvas]) {
        target.dataset.pixelRatio = `${pixelRatio}`
        target.dataset.snapX = `${snapX}`
        target.dataset.snapY = `${snapY}`
        target.width = backingWidth
        target.height = backingHeight
        target.style.left = `${-snapX}px`
        target.style.top = `${-snapY}px`
        target.style.width = `${backingWidth / pixelRatio}px`
        target.style.height = `${backingHeight / pixelRatio}px`
      }
      const context = canvas.getContext('2d')
      const staticContext = staticCanvas.getContext('2d')
      if (!context || !staticContext) return
      context.setTransform(pixelRatio, 0, 0, pixelRatio, snapX * pixelRatio, snapY * pixelRatio)
      staticContext.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        snapX * pixelRatio,
        snapY * pixelRatio,
      )

      const toLayout = (rect: DOMRect) => ({
        x: (rect.left - parentRect.left) / visualScaleX,
        y: (rect.top - parentRect.top) / visualScaleY,
        width: rect.width / visualScaleX,
        height: rect.height / visualScaleY,
      })
      geometryRef.current = Array.from({ length: activeLayout.cells.length })
      staticGlyphIndicesRef.current = new Int16Array(activeLayout.cells.length)
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
        const cell = activeLayout.cells[index]
        if (!cell) return
        const upperFace = cassette.querySelector<HTMLElement>('[data-slot="stationary-upper"]')
        const lowerFace = cassette.querySelector<HTMLElement>('[data-slot="stationary-lower"]')
        const visual = resolvedVisuals[index]
        if (upperFace && lowerFace && visual) {
          const row = cassette.closest<HTMLElement>('[data-split-flap-row]')
          const group = cassette.closest<HTMLElement>('[data-split-flap-group]')
          const visualKey = JSON.stringify([
            row?.className,
            group?.className,
            cassette.className,
            Number(Boolean(activeLayout.rows[cell.rowIndex]?.highlighted)),
          ])
          let computedVisual = computedVisuals.get(visualKey)
          if (!computedVisual) {
            const upperStyle = getComputedStyle(upperFace)
            const lowerStyle = getComputedStyle(lowerFace)
            const previousUpperColor = upperFace.style.getPropertyValue(activeGlyphColorProperty)
            const previousLowerColor = lowerFace.style.getPropertyValue(activeGlyphColorProperty)
            const glyphColors = Object.fromEntries(
              splitFlapVariants.map((variant) => {
                upperFace.style.setProperty(
                  activeGlyphColorProperty,
                  splitFlapVariantVariable(variant, false),
                )
                lowerFace.style.setProperty(
                  activeGlyphColorProperty,
                  splitFlapVariantVariable(variant, true),
                )
                return [
                  variant,
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

        const rectangle = toLayout(cassetteBase.getBoundingClientRect())
        const upperRectangle = toLayout(upperFace.getBoundingClientRect())
        const lowerRectangle = toLayout(lowerFace.getBoundingClientRect())
        const cassetteStyle = getComputedStyle(cassette)
        const unit = scaleContext.offsetWidth / 100
        const cellX = rectangle.x
        const cellY = rectangle.y
        const cellWidth = rectangle.width
        const cellHeight = rectangle.height
        const seamY = cellY + cellHeight / 2
        const faceX = upperRectangle.x
        const faceWidth = upperRectangle.width
        const topFaceY = upperRectangle.y
        const topFaceHeight = upperRectangle.height
        const bottomFaceY = lowerRectangle.y
        const bottomFaceHeight = lowerRectangle.height
        const glyphParts = Array.from(
          upperFace.querySelectorAll<HTMLElement>('[data-split-flap-glyph-part]'),
        )
        const glyphMeasureElement = glyphParts[0] ?? upperFace
        const glyphPseudoElement = glyphParts[0] ? null : '::before'
        const glyphCenters =
          glyphParts.length > 0
            ? glyphParts.map((part) => {
                const partRectangle = toLayout(part.getBoundingClientRect())
                return partRectangle.x + partRectangle.width / 2
              })
            : [cellX + cellWidth / 2]
        const defaultGlyph = measureCanvasGlyph(
          glyphMeasureElement,
          'default',
          topFaceY,
          glyphPseudoElement,
        )
        const cjkGlyph = measureCanvasGlyph(
          glyphMeasureElement,
          'cjk',
          topFaceY,
          glyphPseudoElement,
        )
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
        geometryRef.current[index] = {
          baselines: {
            cjk: cjkGlyph.baseline,
            default: defaultGlyph.baseline,
          },
          bottomFaceHeight,
          bottomFaceY,
          bottomSurface,
          cellHeight,
          cellWidth,
          cellX,
          cellY,
          faceWidth,
          faceX,
          glyphCenters,
          glyphStyles: {
            cjk: cjkGlyph.glyphStyle,
            default: defaultGlyph.glyphStyle,
          },
          seamY,
          spareLeafEdgeColor:
            cassetteStyle.getPropertyValue('--flapkit-spare-leaf-edge-color').trim() || '#585644',
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

      const warmedAtlases = new WeakSet<CanvasGlyphAtlas>()
      let atlasIndex = 0
      const warmAtlas = (atlas: CanvasGlyphAtlas) => {
        if (warmedAtlases.has(atlas)) return
        warmedAtlases.add(atlas)
        for (const targetContext of [context, staticContext]) {
          targetContext.save()
          targetContext.globalAlpha = 0.001
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
          targetContext.restore()
        }
        atlasIndex += 1
      }

      geometryRef.current.forEach((geometry, index) => {
        const visual = resolvedVisuals[index]
        if (!geometry || !visual) return
        const deckVariants = new Set(
          activeLayout.cells[index]?.flapDeck.map((position) => position.variant),
        )
        const glyphScripts = new Set(visual.characters.map(splitFlapGlyphScript))
        deckVariants.forEach((variant) => {
          glyphScripts.forEach((script) => {
            warmAtlas(
              getCanvasGlyphAtlas(
                geometry.glyphStyles[script],
                visual.glyphColors[variant].top,
                visual.characters,
                script,
              ),
            )
            warmAtlas(
              getCanvasGlyphAtlas(
                geometry.glyphStyles[script],
                visual.glyphColors[variant].bottom,
                visual.characters,
                script,
              ),
            )
          })
        })
      })

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
  }, [cellVisualsKey, controller, geometryKey])

  return (
    <>
      <canvas
        ref={staticCanvasRef}
        {...classProps(styles.motionCanvas, styles.staticMotionCanvas)}
        aria-hidden="true"
        data-split-flap-static-canvas
      />
      <canvas
        ref={canvasRef}
        {...classProps(styles.motionCanvas)}
        aria-hidden="true"
        data-split-flap-motion-canvas
      />
    </>
  )
})
