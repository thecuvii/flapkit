import path from 'node:path'
import type { NextConfig } from 'next'

const workspaceRoot = path.resolve(import.meta.dirname, '..')
const flapkitSrc = path.join(workspaceRoot, 'src')

const flapkitAlias = {
  '@thecuvii/flapkit/airport.css': './src/styles/airport.css',
  '@thecuvii/flapkit/flapkit.css': './src/styles/flapkit.css',
  '@thecuvii/flapkit/industrial.css': './src/styles/industrial.css',
  '@thecuvii/flapkit/signal.css': './src/styles/signal.css',
  '@thecuvii/flapkit/sound': './src/sound/index.ts',
  '@thecuvii/flapkit': './src/index.ts',
}

const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ['@thecuvii/flapkit'],
  turbopack: {
    resolveAlias: flapkitAlias,
    root: workspaceRoot,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@thecuvii/flapkit/airport.css': path.join(flapkitSrc, 'styles/airport.css'),
      '@thecuvii/flapkit/flapkit.css': path.join(flapkitSrc, 'styles/flapkit.css'),
      '@thecuvii/flapkit/industrial.css': path.join(flapkitSrc, 'styles/industrial.css'),
      '@thecuvii/flapkit/signal.css': path.join(flapkitSrc, 'styles/signal.css'),
      '@thecuvii/flapkit/sound': path.join(flapkitSrc, 'sound/index.ts'),
      '@thecuvii/flapkit': path.join(flapkitSrc, 'index.ts'),
    }
    return config
  },
}

export default nextConfig
