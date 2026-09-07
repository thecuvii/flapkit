import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { NextConfig } from 'next'
import type { Plugin } from 'esbuild'

const reactCdnVersion = '19.2.8'

function esmShReactUrl(specifier: string) {
  if (specifier === 'react' || specifier.startsWith('react/')) {
    return `https://esm.sh/react@${reactCdnVersion}${specifier.slice('react'.length)}`
  }
  if (specifier === 'react-dom' || specifier.startsWith('react-dom/')) {
    return `https://esm.sh/react-dom@${reactCdnVersion}${specifier.slice('react-dom'.length)}?deps=react@${reactCdnVersion}`
  }
  return specifier
}

const workspaceRoot = path.resolve(import.meta.dirname, '..')
const vendorDir = path.join(import.meta.dirname, 'public/vendor')
const stylesDir = path.join(workspaceRoot, 'src/styles')

function esmShReactPlugin(): Plugin {
  return {
    name: 'esm-sh-react',
    setup(build) {
      build.onResolve({ filter: /^(react|react-dom)(\/|$)/ }, (args) => ({
        path: esmShReactUrl(args.path),
        external: true,
      }))
    },
  }
}

async function bundleLooksPlayground() {
  const { build } = await import('esbuild')
  await mkdir(vendorDir, { recursive: true })
  await Promise.all([
    build({
      absWorkingDir: workspaceRoot,
      bundle: true,
      entryPoints: ['src/index.ts'],
      format: 'esm',
      jsx: 'automatic',
      logLevel: 'silent',
      outfile: path.join(vendorDir, 'flapkit.js'),
      plugins: [esmShReactPlugin()],
      target: 'es2022',
    }),
    copyFile(path.join(stylesDir, 'flapkit.css'), path.join(vendorDir, 'flapkit.css')),
    copyFile(path.join(stylesDir, 'airport.css'), path.join(vendorDir, 'airport.css')),
    copyFile(path.join(stylesDir, 'industrial.css'), path.join(vendorDir, 'industrial.css')),
  ])
}

// `@thecuvii/flapkit` resolves to `src/` through the package's `development`
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
  transpilePackages: ['@thecuvii/flapkit', 'devjar'],
  turbopack: {
    root: workspaceRoot,
  },
}

export default async function loadNextConfig() {
  await bundleLooksPlayground()
  return nextConfig
}
