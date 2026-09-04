import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: {
    flatten: true,
    from: 'src/styles/*.css',
    to: 'dist/styles',
  },
  deps: {
    neverBundle: ['react', 'react/jsx-runtime'],
  },
  dts: true,
  entry: {
    index: 'src/index.ts',
    'sound/index': 'src/sound/index.ts',
  },
  format: ['esm'],
  platform: 'neutral',
  root: 'src',
  sourcemap: true,
  unbundle: true,
})
