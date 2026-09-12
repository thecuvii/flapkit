import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { build } from 'vite'

const repository = new URL('..', import.meta.url)
const temporary = await mkdtemp(join(tmpdir(), 'flapkit-package-'))

function run(command, args, cwd = repository) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`,
  )
  return result.stdout.trim()
}

try {
  // npm pack runs prepack, so everything below exercises a freshly built publish artifact.
  const tarballName = run('npm', ['pack', '--silent', '--pack-destination', temporary])
    .split('\n')
    .at(-1)
  assert.ok(tarballName?.endsWith('.tgz'), `npm pack did not report a tarball: ${tarballName}`)

  const packageRoot = join(temporary, 'node_modules', 'flapkit')
  await mkdir(packageRoot, { recursive: true })
  run('tar', ['-xzf', join(temporary, tarballName), '-C', packageRoot, '--strip-components=1'])

  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
  assert.equal(manifest.peerDependencies.react, '>=19.0.0')
  assert.equal(manifest.peerDependencies['react-dom'], '>=19.0.0')

  const packedFiles = run('tar', ['-tzf', join(temporary, tarballName)]).split('\n')
  assert.ok(
    !packedFiles.some((file) => file.includes('/node_modules/')),
    'packed dist contains node_modules',
  )

  const hookModules = [
    'compiler.js',
    'components.js',
    'motion/provider.js',
    'motion/reduced-motion.js',
    'render/board.js',
    'render/canvas.js',
    'render/cassette.js',
    'sound/adapter.js',
  ]
  for (const file of hookModules) {
    const code = await readFile(join(packageRoot, 'dist', file), 'utf8')
    assert.match(code, /^['"]use client['"];?/, `${file} lost its use client directive`)
  }

  const consumer = join(temporary, 'consumer.mjs')
  await writeFile(
    consumer,
    `export { Root, Board, Row, Cell } from 'flapkit'\nexport { cascade } from 'flapkit/motion/css/cascade'\n`,
  )
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root: temporary,
    build: {
      write: false,
      minify: false,
      rollupOptions: {
        input: consumer,
        external: (id) => id === 'react' || id === 'react-dom' || id.startsWith('react/'),
        preserveEntrySignatures: 'strict',
      },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const moduleIds = outputs.flatMap((output) =>
    'output' in output
      ? output.output.flatMap((chunk) => (chunk.type === 'chunk' ? Object.keys(chunk.modules) : []))
      : [],
  )
  assert.ok(moduleIds.length > 0)
  assert.ok(
    moduleIds.every((id) => !id.includes('/src/')),
    'consumer resolved development sources',
  )
  assert.ok(moduleIds.some((id) => id.endsWith('/dist/motion/css/cascade.js')))
  assert.ok(
    !moduleIds.some((id) => id.includes('/dist/motion/canvas/')),
    'CSS consumer includes canvas motion',
  )
  assert.ok(
    !moduleIds.some((id) => id.includes('/dist/render/canvas.js')),
    'CSS consumer includes canvas renderer',
  )
  assert.ok(!moduleIds.some((id) => id.includes('/dist/sound/')), 'CSS consumer includes sound')
  assert.equal(
    moduleIds.filter((id) => id.endsWith('/dist/motion/provider.js')).length,
    1,
    'motion provider context was duplicated',
  )
} finally {
  await rm(temporary, { recursive: true, force: true })
}
