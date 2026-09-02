export const docsCode = {
  installation: {
    code: 'pnpm add @thecuvii/flapkit',
    language: 'shell',
  },
  usageRiffle: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

<Flapkit.Root motion={Flapkit.riffle()}>
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
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

<Flapkit.Root motion={Flapkit.cascade()}>
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
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

const localDeck = Flapkit.createDeck(' 東京大阪成田羽田出発到着搭乗')

<Flapkit.Root motion={Flapkit.riffle()}>
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
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

export function Departures() {
  return (
    <Flapkit.Root motion={Flapkit.riffle()}>
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
    code: `import * as Flapkit from '@thecuvii/flapkit'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/industrial.css'

<Flapkit.Root motion={Flapkit.cascade()}>
  <Flapkit.Board className="flapkit-industrial operations-board">
    <Flapkit.Row className="font-mono" label="STATUS">
      <Flapkit.Cell className="text-xl font-bold">A</Flapkit.Cell>
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`,
    language: 'tsx',
  },
  sound: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import { mechanicalSound } from '@thecuvii/flapkit/sound'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

const soundBank = {
  clicks: ['/audio/flap-1.mp3'],
  settles: ['/audio/flap-settle.mp3'],
}

<Flapkit.Root
  motion={Flapkit.riffle()}
  sound={mechanicalSound({ bank: soundBank })}
>
  <Flapkit.Board className="flapkit-airport">
    <Flapkit.Row><Flapkit.Cell>A</Flapkit.Cell></Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`,
    language: 'tsx',
  },
} as const

export type DocsCodeKey = keyof typeof docsCode
export type HighlightedDocsCode = Record<DocsCodeKey, string>
