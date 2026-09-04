import {
  docsCode,
  quickStartStaticCode,
  type HighlightedDocsCode,
  type QuickStartToken,
} from './docs-code'

export async function highlightDocs(): Promise<{
  highlighted: HighlightedDocsCode
  quickStartLines: QuickStartToken[][]
}> {
  const { codeToHtml, codeToTokens } = await import('shiki')
  const [entries, quickStartTokens] = await Promise.all([
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
  ])

  return {
    highlighted: Object.fromEntries(entries) as HighlightedDocsCode,
    quickStartLines: quickStartTokens.tokens.map((line) =>
      line.map(
        ({ color, content, offset }): QuickStartToken => ({
          color,
          content,
          offset,
        }),
      ),
    ),
  }
}
