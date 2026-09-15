import { cp, mkdir, rm } from 'node:fs/promises'
const root = new URL('../deploy-assets/', import.meta.url)
await rm(root, { recursive: true, force: true })
await mkdir(root, { recursive: true })
await cp(new URL('../out/', import.meta.url), new URL('flapkit/', root), { recursive: true })
