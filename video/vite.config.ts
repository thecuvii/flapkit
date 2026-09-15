import { defineConfig } from 'vite'
import { viteWorkspaceAliases } from '../flapkit.workspace.ts'

export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  resolve: { alias: viteWorkspaceAliases },
  server: { host: '127.0.0.1', port: 5188, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
})
