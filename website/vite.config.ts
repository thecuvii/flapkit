import { fileURLToPath } from 'node:url'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const flapkitSrc = fileURLToPath(new URL('../src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@thecuvii/flapkit/flapkit.css',
        replacement: `${flapkitSrc}/styles/flapkit.css`,
      },
      {
        find: '@thecuvii/flapkit/airport.css',
        replacement: `${flapkitSrc}/styles/airport.css`,
      },
      {
        find: '@thecuvii/flapkit/industrial.css',
        replacement: `${flapkitSrc}/styles/industrial.css`,
      },
      {
        find: '@thecuvii/flapkit/signal.css',
        replacement: `${flapkitSrc}/styles/signal.css`,
      },
      {
        find: '@thecuvii/flapkit/sound',
        replacement: `${flapkitSrc}/sound/index.ts`,
      },
      {
        find: '@thecuvii/flapkit',
        replacement: `${flapkitSrc}/index.ts`,
      },
    ],
  },
  server: {
    allowedHosts: ['.onamp.dev'],
  },
  plugins: [tanstackStart(), viteReact()],
})
