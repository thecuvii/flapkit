import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  docsCode,
  looksStaticCode,
  quickStartStaticCode,
  type HighlightedDocsCode,
  type QuickStartToken,
} from './docs-code'
import type { LooksPlaygroundStyles } from './looks-playground'

function resolveStylesDir() {
  const candidates = [path.join(process.cwd(), '../src/styles'), path.join(process.cwd(), 'src/styles')]
  return candidates.find((dir) => existsSync(path.join(dir, 'flapkit.css'))) ?? candidates[0]
}

function toLines(
  tokens: readonly { color?: string; content: string; offset: number }[][],
): QuickStartToken[][] {
  return tokens.map((line) =>
    line.map(
      ({ color, content, offset }): QuickStartToken => ({
        color,
        content,
        offset,
      }),
    ),
  )
}

export async function highlightDocs(): Promise<{
  highlighted: HighlightedDocsCode
  looksLines: QuickStartToken[][]
  looksStyles: LooksPlaygroundStyles
  quickStartLines: QuickStartToken[][]
}> {
  const { codeToHtml, codeToTokens } = await import('shiki')
  const stylesDir = resolveStylesDir()
  const [entries, quickStartTokens, looksTokens, flapkit, airport, industrial] = await Promise.all([
    Promise.all(
      Object.entries(docsCode).map(async ([key, snippet]) => [
        key,
        await codeToHtml(snippet.code, {
          lang: snippet.language,
          theme: 'vesper',
        }),
      ]),
    ),
    codeToTokens(quickStartStaticCode, {
      lang: 'tsx',
      theme: 'vesper',
    }),
    codeToTokens(looksStaticCode, {
      lang: 'tsx',
      theme: 'vesper',
    }),
    readFile(path.join(stylesDir, 'flapkit.css'), 'utf8'),
    readFile(path.join(stylesDir, 'airport.css'), 'utf8'),
    readFile(path.join(stylesDir, 'industrial.css'), 'utf8'),
  ])

  return {
    highlighted: Object.fromEntries(entries) as HighlightedDocsCode,
    looksLines: toLines(looksTokens.tokens),
    looksStyles: { airport, flapkit, industrial },
    quickStartLines: toLines(quickStartTokens.tokens),
  }
}
