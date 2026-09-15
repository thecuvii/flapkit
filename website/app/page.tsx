export const metadata = { alternates: { canonical: 'https://cuvii.dev/flapkit/' } }

import { DocsPage } from '../modules/docs'
import { highlightDocs } from '../modules/docs/docs-highlight.server'

export default async function HomePage() {
  return <DocsPage {...await highlightDocs()} />
}
