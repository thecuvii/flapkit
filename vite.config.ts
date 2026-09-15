import { defineConfig } from 'vite-plus'
import { viteWorkspaceAliases } from './flapkit.workspace.ts'

export default defineConfig({
  resolve: { alias: viteWorkspaceAliases },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
  fmt: {
    ignorePatterns: ['website/next-env.d.ts'],
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
