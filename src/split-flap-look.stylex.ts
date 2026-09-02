import * as stylex from '@stylexjs/stylex'

/** Shared CSS variable contract implemented by independently importable split-flap Looks. */
export const splitFlapLook = stylex.defineVars({
  axleBackground:
    'linear-gradient(90deg, rgba(3, 4, 2, 0.98) 0%, rgba(73, 72, 58, 0.34) 34%, rgba(11, 12, 9, 0.96) 72%, rgba(2, 3, 1, 0.98) 100%), radial-gradient(ellipse at 42% 31%, rgba(211, 204, 168, 0.1) 0 14%, transparent 34%)',
  axleHeight: '1.48cqw',
  axleOpacity: '0.9',
  axleShadow:
    '0 0 0 0.025cqw rgba(194, 187, 150, 0.07), 0.04cqw 0 0.08cqw rgba(188, 181, 145, 0.05) inset, -0.08cqw 0 0.14cqw rgba(0, 0, 0, 0.78) inset, 0 0 0.1cqw rgba(0, 0, 0, 0.68)',
  axleWidth: '0.56cqw',
  boardBackgroundColor: '#22231e',
  boardBackgroundImage:
    'radial-gradient(ellipse 90% 55% at 34% -8%, rgba(215, 211, 178, 0.038), transparent 62%), radial-gradient(circle at 82% 74%, rgba(8, 9, 7, 0.2), transparent 44%), linear-gradient(104deg, #1b1c18 0%, #25261f 44%, #1c1d19 100%)',
  boardShadow:
    '0 0 0 1px #080906, 0 1px 0 rgba(210, 207, 176, 0.06) inset, 1px 0 0 rgba(210, 207, 176, 0.025) inset, 0 -2px 4px rgba(0, 0, 0, 0.46) inset, 0 5px 13px rgba(0, 0, 0, 0.7), 0 22px 54px rgba(0, 0, 0, 0.38)',
  boardUnit: '8.2px',
  bottomFaceColor: 'var(--split-flap-face-bottom, #25261e)',
  bottomFaceShadow:
    'var(--split-flap-bottom-face-shadow, 0 0.02cqw 0 rgba(224, 216, 177, 0.018) inset, 0 -0.09cqw 0.14cqw rgba(0, 0, 0, 0.19) inset, 0.05cqw 0.15cqw 0.22cqw rgba(0, 0, 0, 0.32))',
  bottomFaceSurface:
    'linear-gradient(180deg, rgba(0, 0, 0, 0.108) 0%, rgba(0, 0, 0, 0.026) 34%, transparent 70%, rgba(214, 207, 170, 0.02) 100%)',
  cassetteBackgroundColor: '#1e211d',
  cassetteBackgroundImage:
    'radial-gradient(ellipse 82% 46% at 28% 10%, rgba(213, 207, 172, 0.026), transparent 72%), linear-gradient(180deg, #22241f 0%, #191b17 100%)',
  cassetteRadius: '0.03cqw',
  cassetteShadow:
    '-0.025cqw 0 0 rgba(207, 202, 172, 0.045), 0.07cqw 0 0.12cqw rgba(0, 0, 0, 0.55), 0 0 0 0.035cqw rgba(5, 6, 4, 0.94) inset',
  cavityBottom: '7%',
  cavityColor: 'var(--split-flap-cavity, #11120e)',
  cavityLeft: '8%',
  cavityRight: '8%',
  cavityShadow:
    'var(--split-flap-cavity-shadow, 0 0.22cqw 0.38cqw rgba(0, 0, 0, 0.52) inset, 0.12cqw 0 0.22cqw rgba(0, 0, 0, 0.26) inset, 0 -0.05cqw 0.08cqw rgba(211, 204, 167, 0.02) inset)',
  cavityTop: '17%',
  cellHeight: 'var(--split-flap-cell-height, 34.733px)',
  cellTrack: '20.58px',
  compactCoverDetail:
    'linear-gradient(180deg, transparent 0%, transparent 16.45%, rgba(211, 206, 177, 0.035) 16.72%, rgba(0, 0, 0, 0.3) 17.18%, transparent 17.95%), linear-gradient(90deg, transparent 0%, transparent 7.28%, rgba(211, 206, 177, 0.025) 7.7%, rgba(0, 0, 0, 0.26) 8.3%, transparent 9.15%, transparent 90.85%, rgba(0, 0, 0, 0.28) 91.7%, transparent 92.7%), linear-gradient(0deg, transparent 0%, transparent 6.25%, rgba(0, 0, 0, 0.38) 7.15%, transparent 8.1%)',
  compactHalfCell: '5.83cqw',
  compactHardwareBackground:
    'radial-gradient(ellipse at 42% 31%, rgba(211, 204, 168, 0.1) 0 10%, rgba(60, 59, 48, 0.5) 20%, rgba(10, 11, 8, 0.98) 68%, rgba(2, 3, 1, 0.98) 100%), radial-gradient(ellipse at 42% 31%, rgba(211, 204, 168, 0.1) 0 10%, rgba(60, 59, 48, 0.5) 20%, rgba(10, 11, 8, 0.98) 68%, rgba(2, 3, 1, 0.98) 100%), linear-gradient(90deg, rgba(4 5 3 / calc(0.98 * var(--compact-seam-base-opacity) * var(--compact-seam-visibility))) 0%, rgba(9 10 7 / calc(0.94 * var(--compact-seam-base-opacity) * var(--compact-seam-visibility))) 38%, rgba(5 6 4 / calc(var(--compact-seam-base-opacity) * var(--compact-seam-visibility))) 78%, rgba(3 4 3 / calc(0.97 * var(--compact-seam-base-opacity) * var(--compact-seam-visibility))) 100%)',
  compactHardwarePosition: 'calc(8% + 0.3cqw) 55%, calc(92% - 0.3cqw) 55%, center 55%',
  compactHardwareSize:
    '0.56cqw 1.48cqw, 0.56cqw 1.48cqw, calc(84% - 0.2cqw) var(--compact-seam-height)',
  coverBottomBackground: 'linear-gradient(180deg, rgba(0, 0, 0, 0.22) 0, transparent 0.12cqw)',
  coverBottomShadow: '0 -0.04cqw 0.07cqw rgba(0, 0, 0, 0.3), 0 0.12cqw 0.2cqw rgba(0, 0, 0, 0.58)',
  coverLeftBackground:
    'linear-gradient(90deg, transparent calc(100% - 0.05cqw), rgba(211, 206, 177, 0.035) 100%)',
  coverLeftShadow: '-0.025cqw 0 0 rgba(207, 202, 172, 0.04), 0.04cqw 0 0.07cqw rgba(0, 0, 0, 0.26)',
  coverRightBackground: 'linear-gradient(90deg, rgba(0, 0, 0, 0.18) 0, transparent 0.1cqw)',
  coverRightShadow: '-0.04cqw 0 0.07cqw rgba(0, 0, 0, 0.28)',
  coverTopBackground:
    'linear-gradient(180deg, transparent calc(100% - 0.05cqw), rgba(211, 206, 177, 0.035) 100%)',
  coverTopShadow: '0 -0.025cqw 0 rgba(211, 206, 177, 0.035), 0 0.05cqw 0.07cqw rgba(0, 0, 0, 0.3)',
  faceInsetX: 'var(--split-flap-face-inset-x, 0.12cqw)',
  faceInsetY: 'var(--split-flap-face-inset-y, 0.18cqw)',
  faceRadius: '0.03cqw',
  frameBottom: '25.83px',
  frameLeft: '27.06px',
  frameRight: '25.83px',
  frameTop: '16.81px',
  glyphFontFamily: "GeistSans, 'Arial Narrow', Arial, sans-serif",
  glyphFontWeight: '600',
  glyphOrange: 'var(--split-flap-glyph-orange, #cf9138)',
  glyphOpacity: 'var(--split-flap-glyph-opacity, 0.94)',
  glyphYellow: 'var(--split-flap-glyph-yellow, #e4c22f)',
  glyphSize: 'var(--split-flap-glyph-size, 9.55cqw)',
  glyphTracking: 'var(--split-flap-glyph-tracking, 0.025em)',
  glyphWhite: 'var(--split-flap-glyph-white, #e8e5d7)',
  glyphWidth: 'var(--split-flap-glyph-width, 0.62)',
  glyphY: 'var(--split-flap-glyph-y, 0.15cqw)',
  gridBackgroundColor: '#0c0d0b',
  gridBackgroundImage:
    'linear-gradient(90deg, rgba(207, 202, 172, 0.012), transparent 22%, rgba(0, 0, 0, 0.08) 78%, rgba(0, 0, 0, 0.18))',
  gridShadow:
    '0.14cqw 0.16cqw 0.3cqw rgba(0, 0, 0, 0.38) inset, -0.06cqw -0.06cqw 0 rgba(214, 207, 170, 0.015) inset',
  headerHeight: '47.56px',
  highlightFace: 'var(--split-flap-highlight-face, #3b3d31)',
  highlightGlyph: 'var(--split-flap-highlight-glyph, #fff2c8)',
  labelFontFamily: "GeistSans, 'Arial Narrow', Arial, sans-serif",
  leafThickness: 'var(--split-flap-leaf-thickness, 0.24cqw)',
  rowBackgroundColor: '#151713',
  rowBackgroundImage:
    'linear-gradient(180deg, rgba(214, 208, 174, 0.018) 0, transparent 0.18cqw, rgba(0, 0, 0, 0.07) 100%)',
  rowShadow:
    '0 0.05cqw 0 rgba(214, 208, 174, 0.016) inset, 0 0.1cqw 0.18cqw rgba(0, 0, 0, 0.26) inset, 0 -0.06cqw 0.12cqw rgba(0, 0, 0, 0.18) inset, 0 0.16cqw 0.24cqw rgba(0, 0, 0, 0.34)',
  seamOpacity: 'var(--split-flap-seam-opacity, 0.78)',
  seamThickness: 'var(--split-flap-seam-thickness, 0.22cqw)',
  titleOnlyHeaderHeight: '25.5px',
  topFaceColor: 'var(--split-flap-face-top, #282921)',
  topFaceShadow:
    'var(--split-flap-top-face-shadow, 0 0.03cqw 0 rgba(224, 216, 177, 0.035) inset, 0 -0.07cqw 0.12cqw rgba(0, 0, 0, 0.18) inset, 0.05cqw 0.13cqw 0.2cqw rgba(0, 0, 0, 0.29))',
  topFaceSurface:
    'linear-gradient(180deg, rgba(224, 216, 177, 0.032) 0%, transparent 38%, rgba(0, 0, 0, 0.082) 100%)',
})
