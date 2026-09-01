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
      // StyleX calls must remain in the package for the consumer's compiler.
      neverBundle: ['@stylexjs/stylex', 'react', 'react/jsx-runtime'],
    },
    dts: true,
    entry: [
      'src/index.ts',
      'src/riffle-settle/index.ts',
      'src/css-3d-cascade/index.ts',
      'src/sound/index.ts',
      'src/split-flap-look.stylex.ts',
      'src/looks/airport.look.stylex.ts',
      'src/looks/industrial.look.stylex.ts',
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
