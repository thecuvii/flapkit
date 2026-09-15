import assert from 'node:assert/strict'
import { access, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { build, createServer } from 'vite'
import { chromium } from 'playwright'

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

  // Compare both packers: consumers must receive the same public export contract.
  const pnpmDirectory = join(temporary, 'pnpm')
  await mkdir(pnpmDirectory)
  run('pnpm', ['pack', '--pack-destination', pnpmDirectory])
  run('tar', ['-xzf', join(pnpmDirectory, tarballName), '-C', pnpmDirectory])
  const pnpmManifest = JSON.parse(
    await readFile(join(pnpmDirectory, 'package/package.json'), 'utf8'),
  )
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
  assert.equal(manifest.peerDependencies.react, '>=19.0.0')
  assert.equal(manifest.peerDependencies['react-dom'], '>=19.0.0')

  assert.deepEqual(manifest.exports, pnpmManifest.exports, 'npm and pnpm exports differ')
  assert.equal(manifest.license, 'MIT')
  await access(join(packageRoot, 'LICENSE'))
  const targets = Object.values(manifest.exports).flatMap((entry) =>
    typeof entry === 'string' ? [entry] : Object.values(entry),
  )
  for (const target of targets) {
    assert.ok(target.startsWith('./dist/'), `non-dist published target: ${target}`)
    await access(join(packageRoot, target))
  }
  // Resolve without importing CSS, under the same conditions used by dev tooling.
  const specifiers = Object.keys(manifest.exports).map((key) =>
    key === '.' ? 'flapkit' : `flapkit${key.slice(1)}`,
  )
  const resolver = join(temporary, 'resolve.mjs')
  await writeFile(
    resolver,
    `import { accessSync } from 'node:fs';
for (const name of ${JSON.stringify(specifiers)}) accessSync(new URL(import.meta.resolve(name)));`,
  )
  run('node', ['--conditions=development', resolver], temporary)
  run('node', ['--conditions=production', resolver], temporary)

  if (process.env.FLAPKIT_REACT_VERSION) {
    run('npm', [
      'install',
      '--prefix',
      temporary,
      '--ignore-scripts',
      '--no-package-lock',
      '--no-audit',
      '--no-fund',
      `react@${process.env.FLAPKIT_REACT_VERSION}`,
      `react-dom@${process.env.FLAPKIT_REACT_VERSION}`,
    ])
    // npm may remove the extracted package as extraneous; restore the exact tarball.
    await mkdir(packageRoot, { recursive: true })
    run('tar', ['-xzf', join(temporary, tarballName), '-C', packageRoot, '--strip-components=1'])
  } else {
    for (const name of ['react', 'react-dom']) {
      await symlink(
        fileURLToPath(new URL(`../node_modules/${name}`, import.meta.url)),
        join(temporary, 'node_modules', name),
        'dir',
      )
    }
  }
  await symlink(
    fileURLToPath(new URL('../node_modules/@types', import.meta.url)),
    join(temporary, 'node_modules/@types'),
    'dir',
  )
  await writeFile(
    join(temporary, 'consumer.tsx'),
    `import { Root, Board, Row, Cell, Face, Glyph, createDeck } from 'flapkit';
import { cascade } from 'flapkit/motion/css/cascade';
import { riffle } from 'flapkit/motion/canvas/riffle';
import { mechanicalSound } from 'flapkit/sound';
import 'flapkit/flapkit.css'; import 'flapkit/airport.css';
const deck = createDeck(' AB');
export const example = <Root motion={cascade()} sound={mechanicalSound({bank:{clicks:[],settles:[]}})}><Board><Row><Cell deck={deck}><Face/><Glyph>A</Glyph></Cell></Row></Board></Root>;
export const alternate = riffle();`,
  )
  await writeFile(
    join(temporary, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        jsx: 'react-jsx',
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        skipLibCheck: false,
      },
      files: ['consumer.tsx'],
    }),
  )
  run('pnpm', ['exec', 'tsc', '-p', join(temporary, 'tsconfig.json')])

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
  await writeFile(
    join(temporary, 'index.html'),
    '<div id="root"></div><script type="module" src="/app.mjs"></script>',
  )
  await writeFile(
    join(temporary, 'app.mjs'),
    `import React from 'react';import {createRoot} from 'react-dom/client';
import {Root,Board,Row,Cell} from 'flapkit';import {cascade} from 'flapkit/motion/css/cascade';
import 'flapkit/flapkit.css';import 'flapkit/airport.css';
const h=React.createElement;const root=createRoot(document.getElementById('root'));
window.update=(text)=>root.render(h(Root,{motion:cascade()},h(Board,{'data-look':'airport'},h(Row,null,h(Cell,null,text)))));
window.update('A');`,
  )
  const server = await createServer({
    configFile: false,
    root: temporary,
    logLevel: 'silent',
    server: { port: 0, fs: { allow: [temporary, fileURLToPath(repository)] } },
  })
  let browser
  try {
    await server.listen()
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(server.resolvedUrls.local[0])
    await page.locator('[data-slot="cassette"]').waitFor()
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-part="glyph"]')].every(
          (glyph) => glyph.textContent === 'A',
        ) &&
        document
          .querySelector('[data-slot="moving-leaf"]')
          ?.getAttribute('style')
          ?.includes('opacity: 0'),
    )
    await page.evaluate(() => window.update('B'))
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-part="glyph"]')].every(
          (glyph) => glyph.textContent === 'B',
        ) &&
        document
          .querySelector('[data-slot="moving-leaf"]')
          ?.getAttribute('style')
          ?.includes('opacity: 0'),
    )
    assert.deepEqual(errors, [], 'packed development consumer raised browser errors')
  } finally {
    await browser?.close()
    await server.close()
  }
  console.log(
    `Package checks passed: npm/pnpm parity, export targets, development, types, production tree-shaking, React ${process.env.FLAPKIT_REACT_VERSION ?? 'workspace'}.`,
  )
} finally {
  await rm(temporary, { recursive: true, force: true })
}
