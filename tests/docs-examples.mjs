import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { transformWithOxc } from 'vite'
import {
  docsCode,
  quickStartCode,
  looksCode,
  looksCssCode,
} from '../website/modules/docs/docs-code.ts'

const root = resolve(import.meta.dirname, '..')
const cache = resolve(root, 'node_modules/.cache')
await mkdir(cache, { recursive: true })
const temporary = await mkdtemp(resolve(cache, 'flapkit-docs-'))
try {
  const readme = await readFile(resolve(root, 'README.md'), 'utf8')
  const examples = [...readme.matchAll(/```tsx\n([\s\S]*?)```/g)].map((match, index) => ({
    name: `readme-${index + 1}`,
    code: match[1],
  }))
  for (const [name, { code }] of Object.entries(docsCode)) {
    examples.push({ name, code: name === 'looks' ? `${code}\n${looksCssCode}` : code })
  }
  for (const look of ['airport', 'industrial']) {
    for (const motion of ['riffle', 'cascade', 'css']) {
      for (const board of [true, false]) {
        for (const header of [true, false]) {
          examples.push({
            name: `quick-${look}-${motion}-${board}-${header}`,
            code: quickStartCode({ look, motion, board, header }),
          })
        }
      }
    }
  }
  for (const tab of ['airport', 'industrial', 'custom']) {
    examples.push({
      name: `looks-${tab}`,
      code: `${looksCode(tab)}\n${tab === 'custom' ? looksCssCode : ''}`,
    })
  }
  for (const { name, code } of examples) {
    // Parse the literal snippet first. Do not hide syntax errors by wrapping it.
    await transformWithOxc(code, `${name}.tsx`)
    // API fragments share the namespace import introduced in the preceding examples.
    const context = code.includes("import * as Flapkit from 'flapkit'")
      ? ''
      : "import * as Flapkit from 'flapkit'\n"
    await writeFile(resolve(temporary, `${name}.tsx`), `${context}${code}\n`)
  }
  await writeFile(
    resolve(temporary, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        jsx: 'react-jsx',
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        paths: {
          flapkit: [resolve(root, 'dist/index.d.ts')],
          'flapkit/*': [resolve(root, 'dist/*')],
        },
      },
      include: ['*.tsx'],
    }),
  )
  const result = spawnSync('pnpm', ['exec', 'tsc', '-p', resolve(temporary, 'tsconfig.json')], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stdout + result.stderr)
  console.log(
    `Documentation examples: ${examples.length} parsed and type-checked against package exports.`,
  )
} finally {
  await rm(temporary, { recursive: true, force: true })
}
