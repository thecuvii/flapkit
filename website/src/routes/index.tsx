import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { docsCode, type HighlightedDocsCode } from '../docs-code'
import { DocsPage } from '../docs-page'

const getHighlightedDocsCode = createServerFn({ method: 'GET' }).handler(async () => {
  const { codeToHtml } = await import('shiki')
  const entries = await Promise.all(
    Object.entries(docsCode).map(async ([key, snippet]) => [
      key,
      await codeToHtml(snippet.code, {
        lang: snippet.language,
        theme: 'vesper',
      }),
    ]),
  )

  return Object.fromEntries(entries) as HighlightedDocsCode
})

export const Route = createFileRoute('/')({
  loader: () => getHighlightedDocsCode(),
  component: DocsRoute,
})

function DocsRoute() {
  return <DocsPage highlightedCode={Route.useLoaderData()} />
}
