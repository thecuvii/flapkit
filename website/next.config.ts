import path from 'node:path'
import type { NextConfig } from 'next'
import { workspaceAliases } from '../flapkit.workspace.ts'

const workspaceRoot = path.resolve(import.meta.dirname, '..')

// Develop against source locally; production exercises the published dist exports.
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
  transpilePackages: ['flapkit'],
  turbopack: {
    root: workspaceRoot,
    resolveAlias: process.env.NODE_ENV === 'development' ? workspaceAliases : {},
  },
}

export default nextConfig
