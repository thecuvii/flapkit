import { describe, expect, it } from 'vitest'

import { defaultSplitFlapMaterial, splitFlapMaterialStyle } from './split-flap.material'

describe('split-flap material style', () => {
  it('maps the default material to CSS custom properties', () => {
    expect(splitFlapMaterialStyle(defaultSplitFlapMaterial)).toEqual({
      '--split-flap-bottom-face-shadow':
        '0 0.02cqw 0 rgba(224, 216, 177, 0.018) inset, 0 -0.09cqw 0.14cqw rgba(0, 0, 0, 0.19) inset, 0.05cqw 0.15cqw 0.22cqw rgba(0, 0, 0, 0.32)',
      '--split-flap-cavity': '#11120e',
      '--split-flap-cavity-shadow':
        '0 0.22cqw 0.38cqw rgba(0, 0, 0, 0.52) inset, 0.12cqw 0 0.22cqw rgba(0, 0, 0, 0.26) inset, 0 -0.05cqw 0.08cqw rgba(211, 204, 167, 0.02) inset',
      '--split-flap-face-inset-x': '0.12cqw',
      '--split-flap-face-inset-y': '0.18cqw',
      '--split-flap-face-bottom': '#25261e',
      '--split-flap-face-top': '#282921',
      '--split-flap-glyph-opacity': 0.94,
      '--split-flap-glyph-ochre': '#cf9138',
      '--split-flap-glyph-size': '9.55cqw',
      '--split-flap-glyph-signal': '#e4c22f',
      '--split-flap-glyph-tracking': '0.025em',
      '--split-flap-glyph-warm': '#e8e5d7',
      '--split-flap-glyph-width': 0.62,
      '--split-flap-glyph-y': '0.15cqw',
      '--split-flap-highlight-face': '#3b3d31',
      '--split-flap-highlight-glyph': '#fff2c8',
      '--split-flap-leaf-thickness': '0.24cqw',
      '--split-flap-seam-opacity': 0.78,
      '--split-flap-seam-thickness': '0.22cqw',
      '--split-flap-top-face-shadow':
        '0 0.03cqw 0 rgba(224, 216, 177, 0.035) inset, 0 -0.07cqw 0.12cqw rgba(0, 0, 0, 0.18) inset, 0.05cqw 0.13cqw 0.2cqw rgba(0, 0, 0, 0.29)',
    })
  })

  it('maps representative overrides and recalculates shadow formulas', () => {
    const style = splitFlapMaterialStyle({
      ...defaultSplitFlapMaterial,
      cavityDepth: 0.5,
      contactShadow: 2,
      faceInsetX: 1.25,
      glyphTracking: -0.1,
      seamOpacity: 0.4,
      topFaceColor: '#abcdef',
    })

    expect(style).toMatchObject({
      '--split-flap-cavity-shadow':
        '0 0.22cqw 0.38cqw rgba(0, 0, 0, 0.26) inset, 0.12cqw 0 0.22cqw rgba(0, 0, 0, 0.13) inset, 0 -0.05cqw 0.08cqw rgba(211, 204, 167, 0.01) inset',
      '--split-flap-face-inset-x': '1.25cqw',
      '--split-flap-face-top': '#abcdef',
      '--split-flap-glyph-tracking': '-0.1em',
      '--split-flap-seam-opacity': 0.4,
      '--split-flap-top-face-shadow':
        '0 0.03cqw 0 rgba(224, 216, 177, 0.035) inset, 0 -0.07cqw 0.12cqw rgba(0, 0, 0, 0.18) inset, 0.05cqw 0.13cqw 0.2cqw rgba(0, 0, 0, 0.58)',
    })
  })
})
