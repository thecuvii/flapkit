import { defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
  fmt: {
    semi: false,
    singleQuote: true,
  },
  lint: {
    ignorePatterns: ['dist/**', 'website/.next/**', 'website/out/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ['typescript', 'react'],
  },
  staged: {
    '*.{css,js,json,jsx,md,mjs,ts,tsx,yaml,yml}': 'vp check --fix',
  },
})
