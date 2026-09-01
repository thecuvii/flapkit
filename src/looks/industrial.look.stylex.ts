import * as stylex from '@stylexjs/stylex'
import { splitFlapLook } from '../split-flap-look.stylex'

export const industrialWallLook = stylex.createTheme(splitFlapLook, {
  axleBackground:
    'linear-gradient(90deg, #020303 0%, #303131 38%, #090a0a 72%, #010202 100%), radial-gradient(ellipse at 39% 28%, rgba(255, 255, 255, 0.1) 0 10%, transparent 31%)',
  axleHeight: '1.62cqw',
  axleOpacity: '0.96',
  axleShadow:
    '0 0 0 0.025cqw rgba(255, 255, 255, 0.055), -0.07cqw 0 0.13cqw rgba(0, 0, 0, 0.86) inset, 0 0.04cqw 0.1cqw rgba(0, 0, 0, 0.78)',
  axleWidth: '0.58cqw',
  bottomFaceColor: '#111313',
  bottomFaceShadow:
    '0 0.02cqw 0 rgba(255, 255, 255, 0.018) inset, 0 -0.12cqw 0.2cqw rgba(0, 0, 0, 0.34) inset, 0.04cqw 0.18cqw 0.28cqw rgba(0, 0, 0, 0.54)',
  bottomFaceSurface:
    'linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0.035) 37%, transparent 72%, rgba(255, 255, 255, 0.018) 100%)',
  cassetteBackgroundColor: '#151717',
  cassetteBackgroundImage:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.026) 0%, transparent 24%), linear-gradient(112deg, #1a1c1c 0%, #111313 58%, #0b0c0c 100%)',
  cassetteRadius: '0.02cqw',
  cassetteShadow:
    '-0.02cqw 0 0 rgba(255, 255, 255, 0.035), 0.045cqw 0.06cqw 0.11cqw rgba(0, 0, 0, 0.78), 0 0 0 0.04cqw rgba(0, 0, 0, 0.96) inset',
  cavityBottom: '6.5%',
  cavityColor: '#050606',
  cavityLeft: '7%',
  cavityRight: '7%',
  cavityShadow:
    '0 0.3cqw 0.48cqw rgba(0, 0, 0, 0.76) inset, 0.18cqw 0 0.28cqw rgba(0, 0, 0, 0.48) inset, -0.14cqw 0 0.24cqw rgba(0, 0, 0, 0.48) inset',
  cavityTop: '13.5%',
  cellHeight: '60px',
  cellTrack: '30px',
  compactCoverDetail:
    'linear-gradient(180deg, transparent 0%, transparent 12.9%, rgba(255, 255, 255, 0.025) 13.18%, rgba(0, 0, 0, 0.62) 13.62%, transparent 14.3%), linear-gradient(90deg, transparent 0%, transparent 6.2%, rgba(255, 255, 255, 0.018) 6.65%, rgba(0, 0, 0, 0.5) 7.25%, transparent 8.2%, transparent 91.8%, rgba(0, 0, 0, 0.54) 92.75%, transparent 93.8%), linear-gradient(0deg, transparent 0%, transparent 5.7%, rgba(0, 0, 0, 0.66) 6.55%, transparent 7.45%)',
  compactHalfCell: '7.27cqw',
  compactHardwareBackground:
    'radial-gradient(ellipse at 39% 28%, rgba(255, 255, 255, 0.09) 0 9%, rgba(47, 49, 49, 0.72) 19%, rgba(6, 7, 7, 0.99) 67%, #010202 100%), radial-gradient(ellipse at 39% 28%, rgba(255, 255, 255, 0.09) 0 9%, rgba(47, 49, 49, 0.72) 19%, rgba(6, 7, 7, 0.99) 67%, #010202 100%), linear-gradient(90deg, rgba(1 2 2 / calc(0.98 * var(--compact-seam-base-opacity) * var(--compact-seam-visibility))) 0%, rgba(10 11 11 / calc(0.94 * var(--compact-seam-base-opacity) * var(--compact-seam-visibility))) 38%, rgba(3 4 4 / calc(var(--compact-seam-base-opacity) * var(--compact-seam-visibility))) 78%, rgba(1 2 2 / calc(0.97 * var(--compact-seam-base-opacity) * var(--compact-seam-visibility))) 100%)',
  compactHardwarePosition: 'calc(7% + 0.3cqw) 55%, calc(93% - 0.3cqw) 55%, center 55%',
  compactHardwareSize:
    '0.58cqw 1.62cqw, 0.58cqw 1.62cqw, calc(86% - 0.2cqw) var(--compact-seam-height)',
  coverBottomBackground: 'linear-gradient(180deg, rgba(0, 0, 0, 0.42) 0, transparent 0.16cqw)',
  coverBottomShadow:
    '0 -0.05cqw 0.09cqw rgba(0, 0, 0, 0.54), 0 0.14cqw 0.24cqw rgba(0, 0, 0, 0.72)',
  coverLeftBackground:
    'linear-gradient(90deg, rgba(255, 255, 255, 0.012), transparent 42%, rgba(0, 0, 0, 0.2) 100%)',
  coverLeftShadow: '0.055cqw 0 0.1cqw rgba(0, 0, 0, 0.5)',
  coverRightBackground:
    'linear-gradient(90deg, rgba(0, 0, 0, 0.32) 0%, transparent 72%, rgba(255, 255, 255, 0.01) 100%)',
  coverRightShadow: '-0.055cqw 0 0.1cqw rgba(0, 0, 0, 0.5)',
  coverTopBackground:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.018), transparent 48%, rgba(0, 0, 0, 0.28) 100%)',
  coverTopShadow: '0 0.09cqw 0.14cqw rgba(0, 0, 0, 0.56)',
  faceInsetX: '0.1cqw',
  faceInsetY: '0.15cqw',
  faceRadius: '0.018cqw',
  glyphFontFamily: "'D-DIN Condensed', 'Arial Narrow', sans-serif",
  glyphFontWeight: '700',
  glyphOchre: '#f1f1ed',
  glyphOpacity: '0.98',
  glyphSignal: '#f1f1ed',
  glyphSize: '12.45cqw',
  glyphTracking: '-0.018em',
  glyphWarm: '#f1f1ed',
  glyphWidth: '0.88',
  glyphY: '0.42cqw',
  gridBackgroundColor: '#070808',
  gridBackgroundImage:
    'linear-gradient(108deg, rgba(255, 255, 255, 0.012), transparent 28%, rgba(0, 0, 0, 0.26) 100%)',
  gridShadow: '0 0 0 1px rgba(0, 0, 0, 0.94), 0.16cqw 0.2cqw 0.34cqw rgba(0, 0, 0, 0.58) inset',
  labelFontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
  leafThickness: '0.2cqw',
  rowBackgroundColor: '#0c0d0d',
  rowBackgroundImage:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.014) 0%, transparent 16%, rgba(0, 0, 0, 0.14) 100%)',
  rowShadow:
    '0 0.05cqw 0 rgba(255, 255, 255, 0.012) inset, 0 0.14cqw 0.24cqw rgba(0, 0, 0, 0.34) inset, 0 0.1cqw 0.16cqw rgba(0, 0, 0, 0.54)',
  seamOpacity: '0.94',
  seamThickness: '0.18cqw',
  topFaceColor: '#171919',
  topFaceShadow:
    '0 0.025cqw 0 rgba(255, 255, 255, 0.025) inset, 0 -0.1cqw 0.18cqw rgba(0, 0, 0, 0.32) inset, 0.04cqw 0.16cqw 0.26cqw rgba(0, 0, 0, 0.5)',
  topFaceSurface:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.026) 0%, transparent 34%, rgba(0, 0, 0, 0.15) 100%)',
})
