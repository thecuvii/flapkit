import { readFileSync } from 'node:fs'
import { build } from 'vite'
import { expect, it } from 'vitest'

it('documents every published subpath under the actual package name', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')
  expect(manifest.name).toBe('flapkit')
  expect(Object.keys(manifest.publishConfig.exports)).toEqual(Object.keys(manifest.exports))
  const subpaths = readme.split('### Package subpaths\n')[1]!.split('\n### ')[0]!
  for (const path of Object.keys(manifest.exports)) {
    expect(subpaths).toContain(`- \`${manifest.name}${path.slice(1)}\``)
  }
})

it('keeps legacy root factories compatible with the renderer-specific factories', async () => {
  const legacy = await import('./index')
  const css = await import('./css/cascade')
  const canvas = await import('./canvas/cascade')
  const riffle = await import('./canvas/riffle')
  const options = { pitchMs: 79, rowDelayMs: 123, withinRowJitterMs: 31 }
  expect(legacy.cascade({ ...options, renderer: 'css' })).toEqual(css.cascade(options))
  expect(legacy.cascade(options)).toEqual(canvas.cascade(options))
  expect(legacy.riffle({ riffleMs: 47 })).toEqual(riffle.riffle({ riffleMs: 47 }))
})

it.each(['css/cascade', 'canvas/cascade', 'canvas/riffle'])(
  'includes only the selected renderer through the %s package entry',
  async (entry) => {
    const factory = entry.endsWith('riffle') ? 'riffle' : 'cascade'
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      resolve: { conditions: ['development'] },
      plugins: [
        {
          name: 'motion-consumer',
          resolveId(id) {
            if (id === 'virtual:consumer') return '\0consumer'
          },
          load(id) {
            if (id === '\0consumer')
              return `
            export { Root, Board, Row, Cell } from 'flapkit'
            export { ${factory} } from 'flapkit/motion/${entry}'
          `
          },
        },
      ],
      build: {
        write: false,
        minify: false,
        rollupOptions: {
          input: 'virtual:consumer',
          external: ['react', 'react/jsx-runtime'],
          preserveEntrySignatures: 'strict',
        },
      },
    })
    const bundles = Array.isArray(result) ? result : [result]
    const modules = bundles.flatMap((bundle) =>
      'output' in bundle
        ? bundle.output.flatMap((chunk) =>
            chunk.type === 'chunk' ? Object.keys(chunk.modules) : [],
          )
        : [],
    )
    expect(modules.some((path) => path.endsWith('/components.tsx'))).toBe(true)
    expect(modules.some((path) => path.endsWith('/render/canvas.tsx'))).toBe(
      entry.startsWith('canvas/'),
    )
    expect(modules.some((path) => path.endsWith('/sound/engine.ts'))).toBe(false)
  },
)
