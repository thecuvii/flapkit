import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { NextConfig } from 'next'

const workspaceRoot = path.resolve(import.meta.dirname, '..')

async function bundleLooksPlayground() {
  const { build } = await import('esbuild')
  const outfile = path.join(import.meta.dirname, 'public/vendor/flapkit.js')
  await mkdir(path.dirname(outfile), { recursive: true })
  await build({
    absWorkingDir: workspaceRoot,
    bundle: true,
    entryPoints: ['src/index.ts'],
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    format: 'esm',
    jsx: 'automatic',
    logLevel: 'silent',
    outfile,
    target: 'es2022',
  })
}

// `@thecuvii/flapkit` resolves to `src/` through the package's `development`
// export condition in `next dev`, and to `dist/` in `next build`.
const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    unoptimized: true,
  },
  output: 'export',
  trailingSlash: true,
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ['@thecuvii/flapkit', 'devjar'],
  turbopack: {
    root: workspaceRoot,
  },
}

export default async function loadNextConfig() {
  await bundleLooksPlayground()
  return nextConfig
}
