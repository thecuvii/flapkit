import type { CSSProperties } from 'react'

export type SplitFlapMaterial = {
  bottomFaceColor: string
  cavityColor: string
  cavityDepth: number
  contactShadow: number
  faceInsetX: number
  faceInsetY: number
  glyphOpacity: number
  glyphSize: number
  glyphTracking: number
  glyphWidth: number
  glyphY: number
  highlightFaceColor: string
  highlightFaceStrength: number
  highlightGlyphColor: string
  highlightGlyphStrength: number
  leafBrightnessVariation: number
  leafThickness: number
  leafVariation: boolean
  leafWearVariation: number
  orangeGlyphColor: string
  patinaStrength: number
  seamOpacity: number
  seamShadow: number
  seamThickness: number
  stackedEdgeOpacity: number
  stackedEdges: boolean
  spareLeafCount: number
  specularStrength: number
  stackedSideShadow: number
  stackedTopShadow: number
  yellowGlyphColor: string
  topFaceColor: string
  whiteGlyphColor: string
}

export const defaultSplitFlapMaterial: SplitFlapMaterial = {
  bottomFaceColor: '#25261e',
  cavityColor: '#11120e',
  cavityDepth: 1,
  contactShadow: 1,
  faceInsetX: 0.12,
  faceInsetY: 0.18,
  glyphOpacity: 0.94,
  glyphSize: 9.55,
  glyphTracking: 0.025,
  glyphWidth: 0.62,
  glyphY: 0.15,
  highlightFaceColor: '#3b3d31',
  highlightFaceStrength: 0.12,
  highlightGlyphColor: '#fff2c8',
  highlightGlyphStrength: 0.7,
  leafBrightnessVariation: 0.07,
  leafThickness: 0.24,
  leafVariation: true,
  leafWearVariation: 0.65,
  orangeGlyphColor: '#cf9138',
  patinaStrength: 0.8,
  seamOpacity: 0.78,
  seamShadow: 1,
  seamThickness: 0.22,
  stackedEdgeOpacity: 0.92,
  stackedEdges: true,
  spareLeafCount: 3,
  specularStrength: 0.82,
  stackedSideShadow: 2,
  stackedTopShadow: 2,
  yellowGlyphColor: '#e4c22f',
  topFaceColor: '#282921',
  whiteGlyphColor: '#e8e5d7',
}

export type SplitFlapStyle = Omit<
  CSSProperties,
  'aspectRatio' | 'height' | 'maxHeight' | 'maxWidth' | 'minHeight' | 'minWidth' | 'width'
> & {
  '--split-flap-bottom-face-shadow'?: string
  '--split-flap-cavity'?: string
  '--split-flap-cavity-shadow'?: string
  '--split-flap-face-inset-x'?: string
  '--split-flap-face-inset-y'?: string
  '--split-flap-face-bottom'?: string
  '--split-flap-face-top'?: string
  '--split-flap-glyph-opacity'?: number
  '--split-flap-glyph-orange'?: string
  '--split-flap-glyph-size'?: string
  '--split-flap-glyph-yellow'?: string
  '--split-flap-glyph-tracking'?: string
  '--split-flap-glyph-white'?: string
  '--split-flap-glyph-width'?: number
  '--split-flap-glyph-y'?: string
  '--split-flap-highlight-face'?: string
  '--split-flap-highlight-glyph'?: string
  '--split-flap-leaf-thickness'?: string
  '--split-flap-seam-opacity'?: number
  '--split-flap-seam-thickness'?: string
  '--split-flap-top-face-shadow'?: string
}

export function splitFlapMaterialStyle(material: SplitFlapMaterial): SplitFlapStyle {
  const cavityShadow =
    `0 0.22cqw 0.38cqw rgba(0, 0, 0, ${0.52 * material.cavityDepth}) inset, ` +
    `0.12cqw 0 0.22cqw rgba(0, 0, 0, ${0.26 * material.cavityDepth}) inset, ` +
    `0 -0.05cqw 0.08cqw rgba(211, 204, 167, ${0.02 * material.cavityDepth}) inset`
  const topFaceShadow =
    '0 0.03cqw 0 rgba(224, 216, 177, 0.035) inset, ' +
    '0 -0.07cqw 0.12cqw rgba(0, 0, 0, 0.18) inset, ' +
    `0.05cqw 0.13cqw 0.2cqw rgba(0, 0, 0, ${0.29 * material.contactShadow})`
  const bottomFaceShadow =
    '0 0.02cqw 0 rgba(224, 216, 177, 0.018) inset, ' +
    '0 -0.09cqw 0.14cqw rgba(0, 0, 0, 0.19) inset, ' +
    `0.05cqw 0.15cqw 0.22cqw rgba(0, 0, 0, ${0.32 * material.contactShadow})`

  return {
    '--split-flap-bottom-face-shadow': bottomFaceShadow,
    '--split-flap-cavity': material.cavityColor,
    '--split-flap-cavity-shadow': cavityShadow,
    '--split-flap-face-inset-x': `${material.faceInsetX}cqw`,
    '--split-flap-face-inset-y': `${material.faceInsetY}cqw`,
    '--split-flap-face-bottom': material.bottomFaceColor,
    '--split-flap-face-top': material.topFaceColor,
    '--split-flap-glyph-opacity': material.glyphOpacity,
    '--split-flap-glyph-orange': material.orangeGlyphColor,
    '--split-flap-glyph-size': `${material.glyphSize}cqw`,
    '--split-flap-glyph-yellow': material.yellowGlyphColor,
    '--split-flap-glyph-tracking': `${material.glyphTracking}em`,
    '--split-flap-glyph-white': material.whiteGlyphColor,
    '--split-flap-glyph-width': material.glyphWidth,
    '--split-flap-glyph-y': `${material.glyphY}cqw`,
    '--split-flap-highlight-face': material.highlightFaceColor,
    '--split-flap-highlight-glyph': material.highlightGlyphColor,
    '--split-flap-leaf-thickness': `${material.leafThickness}cqw`,
    '--split-flap-seam-opacity': material.seamOpacity,
    '--split-flap-seam-thickness': `${material.seamThickness}cqw`,
    '--split-flap-top-face-shadow': topFaceShadow,
  }
}
