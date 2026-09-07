'use client'

import { DevJar } from 'devjar'
import { useMemo, useState } from 'react'
import { looksCssCode, type LooksTab } from './docs-code'
import { looksPlaygroundCdnUrl, looksPlaygroundReactVersion } from './looks-cdn'

const playgroundBaseCss = `html, body, #__reactRoot {
  height: 100%;
  margin: 0;
  background: transparent;
  color-scheme: dark;
}
body {
  display: grid;
  place-items: center;
}`

const looksPlaygroundDependencies = {
  react: looksPlaygroundReactVersion,
  'react-dom': looksPlaygroundReactVersion,
}

function resolveLooksModule(specifier: string) {
  if (specifier === '@thecuvii/flapkit') {
    return `${window.location.origin}/vendor/flapkit.js`
  }
  return looksPlaygroundCdnUrl(specifier)
}

function looksPlaygroundEntry(tab: LooksTab) {
  const origin = window.location.origin
  const look = tab === 'airport' ? 'airport' : 'industrial'
  const custom = tab === 'custom'
  const boardClass = custom ? `flapkit-${look} operations-board` : `flapkit-${look}`
  const rowClass = custom ? ' className="font-mono"' : ''
  const cellClass = custom ? ' className="text-xl font-bold"' : ''
  const customStyle = custom ? `\n      <style>{\`${looksCssCode}\`}</style>` : ''

  return `import * as Flapkit from '@thecuvii/flapkit'

export default function App() {
  return (
    <>
      <style>{\`${playgroundBaseCss}\`}</style>
      <link rel="stylesheet" href="${origin}/vendor/flapkit.css" />
      <link rel="stylesheet" href="${origin}/vendor/${look}.css" />${customStyle}
      <Flapkit.Root motion={Flapkit.cascade()}>
        <Flapkit.Board className="${boardClass}">
          <Flapkit.Row${rowClass} label="STATUS">
            <Flapkit.Cell${cellClass}>A</Flapkit.Cell>
          </Flapkit.Row>
        </Flapkit.Board>
      </Flapkit.Root>
    </>
  )
}
`
}

export function LooksPlayground({ tab }: { tab: LooksTab }) {
  const [error, setError] = useState<unknown>(null)
  const files = useMemo(
    () => ({
      'pages/index.tsx': looksPlaygroundEntry(tab),
    }),
    [tab],
  )

  return (
    <div className="relative size-full">
      <DevJar
        className="size-full border-0 bg-transparent [color-scheme:dark]"
        dependencies={looksPlaygroundDependencies}
        files={files}
        resolveModule={resolveLooksModule}
        tailwind={false}
        title="Looks playground"
        onError={setError}
      />
      {error ? (
        <p className="absolute inset-x-0 bottom-2 m-0 px-u4 text-center font-mono text-[11px] text-muted">
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : null}
    </div>
  )
}
