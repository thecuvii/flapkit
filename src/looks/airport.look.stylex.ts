import * as stylex from '@stylexjs/stylex'
import { splitFlapLook } from '../split-flap-look.stylex'

export const airportBoardLook = stylex.createTheme(splitFlapLook, {
  boardBackgroundColor: '#22231e',
  bottomFaceColor: 'var(--split-flap-face-bottom, #25261e)',
  cassetteBackgroundColor: '#1e211d',
  cavityColor: 'var(--split-flap-cavity, #11120e)',
  glyphOchre: 'var(--split-flap-glyph-ochre, #cf9138)',
  glyphSignal: 'var(--split-flap-glyph-signal, #e4c22f)',
  glyphWarm: 'var(--split-flap-glyph-warm, #e8e5d7)',
  topFaceColor: 'var(--split-flap-face-top, #282921)',
})
