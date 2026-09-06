'use client'

import { DevJar } from 'devjar'
import { useEffect, useMemo, useState } from 'react'
import { looksCssCode, type LooksTab } from './docs-code'

export type LooksPlaygroundStyles = {
  airport: string
  flapkit: string
  industrial: string
}

const playgroundBaseCss = `html, body, #__reactRoot {
  height: 100%;
  margin: 0;
  background: transparent;
}
body {
  display: grid;
  place-items: center;
}`

function resolveLooksModule(specifier: string) {
  if (specifier === 'react' || specifier.startsWith('react/')) {
    return `https://esm.sh/${specifier}@19.2.8`
  }
  if (specifier === 'react-dom' || specifier.startsWith('react-dom/')) {
    return `https://esm.sh/${specifier}@19.2.8`
  }
  return `https://esm.sh/${specifier}`
}

function looksPlaygroundEntry(tab: LooksTab) {
  const look = tab === 'airport' ? 'airport' : 'industrial'
  const custom = tab === 'custom'
  const boardClass = custom ? `flapkit-${look} operations-board` : `flapkit-${look}`
  const rowClass = custom ? ' className="font-mono"' : ''
  const cellClass = custom ? ' className="text-xl font-bold"' : ''

  return `import * as Flapkit from './flapkit.js'
import './base.css'
import './flapkit.css'
import './look.css'
import './custom.css'

export default function App() {
  return (
    <Flapkit.Root motion={Flapkit.cascade()}>
      <Flapkit.Board className="${boardClass}">
        <Flapkit.Row${rowClass} label="STATUS">
          <Flapkit.Cell${cellClass}>A</Flapkit.Cell>
        </Flapkit.Row>
      </Flapkit.Board>
    </Flapkit.Root>
  )
}
`
}

export function LooksPlayground({
  styles,
  tab,
}: {
  styles: LooksPlaygroundStyles
  tab: LooksTab
}) {
  const [flapkitJs, setFlapkitJs] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/vendor/flapkit.js')
      .then((response) => {
        if (!response.ok) throw new Error('Looks playground bundle is missing')
        return response.text()
      })
      .then((code) => {
        if (!cancelled) setFlapkitJs(code)
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const files = useMemo(() => {
    if (!flapkitJs) return null
    return {
      'index.js': looksPlaygroundEntry(tab),
      'flapkit.js': flapkitJs,
      'base.css': playgroundBaseCss,
      'flapkit.css': styles.flapkit,
      'look.css': tab === 'airport' ? styles.airport : styles.industrial,
      'custom.css': tab === 'custom' ? looksCssCode : '',
    }
  }, [flapkitJs, styles, tab])

  if (error) {
    return (
      <p className="m-0 text-center text-base text-black">Playground failed to load.</p>
    )
  }

  if (!files) return null

  return (
    <DevJar
      className="size-full border-0 bg-transparent"
      files={files}
      resolveModule={resolveLooksModule}
      title="Looks playground"
      onError={setError}
    />
  )
}
