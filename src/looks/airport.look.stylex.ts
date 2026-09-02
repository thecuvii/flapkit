import * as stylex from '@stylexjs/stylex'
import { splitFlapLook } from '../split-flap-look.stylex'

export const airportBoardLook = stylex.createTheme(splitFlapLook, {
  boardBackgroundColor: '#22231e',
  bottomFaceColor: 'var(--split-flap-face-bottom, #25261e)',
  cassetteBackgroundColor: '#1e211d',
  cavityColor: 'var(--split-flap-cavity, #11120e)',
  glyphOrange: 'var(--split-flap-glyph-orange, #cf9138)',
  glyphYellow: 'var(--split-flap-glyph-yellow, #e4c22f)',
  glyphWhite: 'var(--split-flap-glyph-white, #e8e5d7)',
  topFaceColor: 'var(--split-flap-face-top, #282921)',
})
