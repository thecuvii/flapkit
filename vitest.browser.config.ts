import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { viteWorkspaceAliases } from './flapkit.workspace.ts'

export default defineConfig({
  resolve: { alias: viteWorkspaceAliases },
  define: {
    'import.meta.env.FLAPKIT_VISUAL_TESTS': JSON.stringify(
      process.env.FLAPKIT_VISUAL_TESTS === '1',
    ),
  },
  test: {
    include: ['tests/**/*.browser.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: (['chromium', 'firefox', 'webkit'] as const)
        .filter(
          (browser) => !process.env.FLAPKIT_BROWSER || process.env.FLAPKIT_BROWSER === browser,
        )
        .map((browser) => ({ browser })),
      viewport: { width: 1000, height: 700 },
    },
  },
})
