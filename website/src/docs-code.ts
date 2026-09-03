export const docsCode = {
  quickStart: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

<Flapkit.Root motion={Flapkit.riffle()}>
  <Flapkit.Board aria-label="Package status" className="flapkit-airport">
    <Flapkit.Row label="STATUS">
      {[...'FLAPKIT'].map((character, index) => (
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

<Flapkit.Root motion={Flapkit.riffle()}>
  <Flapkit.Board className="flapkit-airport">
    <Flapkit.Header>Departures</Flapkit.Header>
    <Flapkit.Row id="LH401">
      <Flapkit.Group label="STATUS">
        {[...'BOARDING'].map((character, index) => (
          <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
        ))}
      </Flapkit.Group>
      <Flapkit.Group label="GATE">
        {[...'A12'].map((character, index) => (
          <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
        ))}
      </Flapkit.Group>
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`,
    language: 'tsx',
  },
  decks: {
    code: `import * as Flapkit from '@thecuvii/flapkit'

const localDeck = Flapkit.createDeck(' 東京大阪成田羽田出発到着搭乗')
const numberDeck = Flapkit.createDeck(['  ', '14', '05', '55', '30'])

<Flapkit.Root motion={Flapkit.riffle()}>
  <Flapkit.Grid className="flapkit-airport">
    <Flapkit.Row deck={localDeck} label="LOCAL">
      {[...'東京'].map((character, index) => (
        <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
      ))}
    </Flapkit.Row>
  </Flapkit.Grid>
</Flapkit.Root>

<Flapkit.Root motion={Flapkit.riffle()}>
  <Flapkit.Grid className="flapkit-airport">
    <Flapkit.Row>
      <Flapkit.Group deck={numberDeck} label="FLIGHT">
        <Flapkit.WideCell>14</Flapkit.WideCell>
      </Flapkit.Group>
      <Flapkit.Group sequence="numeric" label="GATE">
        <Flapkit.Cell>1</Flapkit.Cell>
        <Flapkit.Cell>2</Flapkit.Cell>
      </Flapkit.Group>
    </Flapkit.Row>
  </Flapkit.Grid>
</Flapkit.Root>`,
    language: 'tsx',
  },
  motion: {
    code: `const motion = dense ? Flapkit.riffle() : Flapkit.cascade({ rowDelayMs: 120 })

<Flapkit.Root motion={motion}>
  <Flapkit.Board className="flapkit-airport">
    <Flapkit.Row label="STATUS">
      {[...'FLAPKIT'].map((character, index) => (
        <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
      ))}
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`,
    language: 'tsx',
  },
  looks: {
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
  looksCss: {
    code: `.operations-board [data-part='face'] {
  filter: saturate(0.9);
}`,
    language: 'css',
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
    <Flapkit.Row>
      <Flapkit.Cell>A</Flapkit.Cell>
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`,
    language: 'tsx',
  },
} as const

export type DocsCodeKey = keyof typeof docsCode
export type HighlightedDocsCode = Record<DocsCodeKey, string>
