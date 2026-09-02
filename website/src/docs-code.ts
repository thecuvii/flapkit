export const docsCode = {
  installation: {
    code: 'pnpm add @thecuvii/flapkit',
    language: 'shell',
  },
  usageRiffle: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import { riffle } from '@thecuvii/flapkit/riffle'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

<Flapkit.Root motion={riffle()}>
  <Flapkit.Board aria-label="Package status" className="flapkit-airport">
    <Flapkit.Row label="STATUS">
      {[...'IN TRANSIT'].map((character, index) => (
        <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
      ))}
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`,
    language: 'tsx',
  },
  usageCascade: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import { cascade } from '@thecuvii/flapkit/cascade'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

<Flapkit.Root motion={cascade()}>
  <Flapkit.Board aria-label="Package status" className="flapkit-airport">
    <Flapkit.Row label="STATUS">
      {[...'IN TRANSIT'].map((character, index) => (
        <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
      ))}
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`,
    language: 'tsx',
  },
  usageUnicode: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import { riffle } from '@thecuvii/flapkit/riffle'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

const localDeck = Flapkit.createDeck(' 東京大阪成田羽田出発到着搭乗')

<Flapkit.Root motion={riffle()}>
  <Flapkit.Board aria-label="Local service" className="flapkit-airport">
    <Flapkit.Row deck={localDeck} label="LOCAL">
      {[...'東京出発'].map((character, index) => (
        <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
      ))}
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`,
    language: 'tsx',
  },
  composition: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import { riffle } from '@thecuvii/flapkit/riffle'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

export function Departures() {
  return (
    <Flapkit.Root motion={riffle()}>
      <Flapkit.Board className="flapkit-airport departures-board">
        <Flapkit.Header>Departures</Flapkit.Header>
        <Flapkit.Row label="STATUS">
          <Flapkit.Cell>O</Flapkit.Cell>
          <Flapkit.Cell>N</Flapkit.Cell>
        </Flapkit.Row>
      </Flapkit.Board>
    </Flapkit.Root>
  )
}`,
    language: 'tsx',
  },
  customization: {
    code: `<Flapkit.Row className="font-mono">
  <Flapkit.Cell className="text-xl font-bold">A</Flapkit.Cell>
</Flapkit.Row>
`,
    language: 'tsx',
  },
  sound: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import { riffle } from '@thecuvii/flapkit/riffle'
import { mechanicalSound } from '@thecuvii/flapkit/sound'

<Flapkit.Root motion={riffle()} sound={mechanicalSound({ bank: soundBank })}>
  <Flapkit.Board>
    <Flapkit.Row><Flapkit.Cell>A</Flapkit.Cell></Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`,
    language: 'tsx',
  },
} as const

export type DocsCodeKey = keyof typeof docsCode
export type HighlightedDocsCode = Record<DocsCodeKey, string>
