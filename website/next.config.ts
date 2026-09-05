import path from 'node:path'
import type { NextConfig } from 'next'

const workspaceRoot = path.resolve(import.meta.dirname, '..')

// `@thecuvii/flapkit` resolves to `src/` through the package's `development`
// export condition in `next dev`, and to `dist/` in `next build`.
const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ['@thecuvii/flapkit'],
  turbopack: {
    root: workspaceRoot,
  },
}

export default nextConfig
