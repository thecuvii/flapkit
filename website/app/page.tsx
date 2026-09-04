import { DocsPage } from '../src/docs-page'
import { highlightDocs } from '../src/highlight'

export default async function HomePage() {
  return <DocsPage {...await highlightDocs()} />
}
