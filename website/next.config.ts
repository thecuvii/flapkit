import path from 'node:path'
import type { NextConfig } from 'next'

const workspaceRoot = path.resolve(import.meta.dirname, '..')

// `@cuvii/flapkit` resolves to `src/` through the package's `development`
// export condition in `next dev`, and to `dist/` in `next build`.
const nextConfig: NextConfig = {
  agentRules: false,
  // Trust only the configured preview host, not every origin on a shared portal domain.
  allowedDevOrigins: process.env.FLAPKIT_DEV_ORIGIN ? [process.env.FLAPKIT_DEV_ORIGIN] : [],
  images: {
    unoptimized: true,
  },
  output: 'export',
  trailingSlash: true,
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ['@cuvii/flapkit'],
  turbopack: {
    root: workspaceRoot,
  },
}

export default nextConfig
