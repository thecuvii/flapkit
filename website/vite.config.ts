import stylex from '@stylexjs/unplugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: ['.onamp.dev'],
  },
  plugins: [
    tanstackStart(),
    stylex.vite({
      dev: process.env.NODE_ENV === 'development',
      externalPackages: ['@thecuvii/flapkit'],
      runtimeInjection: false,
      useCSSLayers: true,
    } as Parameters<typeof stylex.vite>[0] & { externalPackages: string[] }),
    viteReact(),
  ],
})
