// Mirrored in flapkit.css as `--flapkit-active-bottom-inset` (clearance + step * (count - 1) = 1.6cqw).
export const activeLeafClearance = 0.6
export const glyphOffsetValues = [-0.06, 0, 0.08, -0.12, 0, 0.04] as const
// Mirrored in flapkit.css as the lower-half `translateX(0.03cqw)` / `--wide-glyph-x-offset`.
export const lowerGlyphXOffset = 0.03
export const spareLeafStep = 0.5
export const spareLeafXOffsets = [-0.05, 0.05, -0.02] as const
// Physical constants shared by the DOM and Canvas renderers.
export const splitFlapReferenceTracks = 11
export const splitFlapLeafBrightnessVariation = 0.07
export const splitFlapLeafThickness = 0.24
export const splitFlapSpareLeafCount = 3
export const splitFlapSpecularStrength = 0.82
