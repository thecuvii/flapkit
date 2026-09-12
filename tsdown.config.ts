import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: {
    flatten: true,
    from: 'src/styles/*.css',
    to: 'dist/styles',
  },
  deps: {
    neverBundle: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  dts: true,
  entry: {
    index: 'src/index.ts',
    'sound/index': 'src/sound/index.ts',
    'motion/canvas/cascade': 'src/motion/canvas/cascade.ts',
    'motion/canvas/riffle': 'src/motion/canvas/riffle.ts',
    'motion/css/cascade': 'src/motion/css/cascade.ts',
  },
  format: ['esm'],
  platform: 'neutral',
  root: 'src',
  sourcemap: true,
  unbundle: true,
})
