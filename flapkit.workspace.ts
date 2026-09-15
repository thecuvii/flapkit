import { fileURLToPath } from 'node:url'

// Local source resolution belongs to the workspace, never the published manifest.
const entries = {
  flapkit: './src/index.ts',
  'flapkit/sound': './src/sound/index.ts',
  'flapkit/motion/canvas/cascade': './src/motion/canvas/cascade.ts',
  'flapkit/motion/canvas/riffle': './src/motion/canvas/riffle.ts',
  'flapkit/motion/css/cascade': './src/motion/css/cascade.ts',
  'flapkit/flapkit.css': './src/styles/flapkit.css',
  'flapkit/airport.css': './src/styles/airport.css',
  'flapkit/industrial.css': './src/styles/industrial.css',
}

export const workspaceAliases = Object.fromEntries(
  Object.entries(entries).map(([name, path]) => [
    name,
    fileURLToPath(new URL(path, import.meta.url)),
  ]),
)

export const viteWorkspaceAliases = Object.entries(workspaceAliases).map(([name, replacement]) => ({
  find: new RegExp(`^${name.replaceAll('.', '\\.')}$`),
  replacement,
}))
