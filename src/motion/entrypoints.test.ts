import { build } from 'vite'
import { expect, it } from 'vitest'

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
            export { Root, Board, Row, Cell } from '@cuvii/flapkit'
            export { ${factory} } from '@cuvii/flapkit/motion/${entry}'
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
