import {
  docsCode,
  looksStaticCode,
  quickStartStaticCode,
  type HighlightedDocsCode,
  type QuickStartToken,
} from './docs-code'

function toLines(
  tokens: readonly { color?: string; content: string; offset: number }[][],
): QuickStartToken[][] {
  return tokens.map((line) =>
    line.map(({ color, content, offset }): QuickStartToken => ({
      color,
      content,
      offset,
    })),
  )
}

export async function highlightDocs(): Promise<{
  highlighted: HighlightedDocsCode
  looksLines: QuickStartToken[][]
  quickStartLines: QuickStartToken[][]
}> {
  const { codeToHtml, codeToTokens } = await import('shiki')
  const [entries, quickStartTokens, looksTokens] = await Promise.all([
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
  ])

  return {
    highlighted: Object.fromEntries(entries) as HighlightedDocsCode,
    looksLines: toLines(looksTokens.tokens),
    quickStartLines: toLines(quickStartTokens.tokens),
  }
}
