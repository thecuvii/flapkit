import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    semi: false,
    singleQuote: true,
  },
  lint: {
    ignorePatterns: ['dist/**', 'website/dist/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ['typescript', 'react'],
  },
  pack: {
    deps: {
      neverBundle: ['react', 'react/jsx-runtime'],
    },
    dts: true,
    entry: [
      'src/index.ts',
      'src/riffle/index.ts',
      'src/cascade/index.ts',
      'src/sound/index.ts',
      'src/styles/flapkit.css',
      'src/styles/airport.css',
      'src/styles/industrial.css',
    ],
    format: ['esm'],
    platform: 'neutral',
    root: 'src',
    sourcemap: true,
    unbundle: true,
  },
  staged: {
    '*.{css,js,json,jsx,md,mjs,ts,tsx,yaml,yml}': 'vp check --fix',
  },
})
