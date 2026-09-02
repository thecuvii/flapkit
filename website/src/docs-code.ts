export const docsCode = {
  installation: {
    code: 'pnpm add @thecuvii/flapkit @stylexjs/stylex',
    language: 'shell',
  },
  usageRiffle: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import { riffle } from '@thecuvii/flapkit/riffle'

<Flapkit.Root motion={riffle()}>
  <Flapkit.Board aria-label="Package status">
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

<Flapkit.Root motion={cascade()}>
  <Flapkit.Board aria-label="Package status">
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

const localDeck = Flapkit.createSplitFlapDeck(' 東京大阪成田羽田出発到着搭乗')

<Flapkit.Root motion={riffle()}>
  <Flapkit.Board aria-label="Local service">
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
    code: `import * as stylex from '@stylexjs/stylex'
import * as Flapkit from '@thecuvii/flapkit'
import { riffle } from '@thecuvii/flapkit/riffle'
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'

export function Departures() {
  return (
    <section {...stylex.props(airportBoardLook)}>
      <Flapkit.Root motion={riffle()}>
        <Flapkit.Board>
          <Flapkit.Header>Departures</Flapkit.Header>
          <Flapkit.Row label="STATUS">
            <Flapkit.Cell>O</Flapkit.Cell>
            <Flapkit.Cell>N</Flapkit.Cell>
          </Flapkit.Row>
        </Flapkit.Board>
      </Flapkit.Root>
    </section>
  )
}`,
    language: 'tsx',
  },
  customization: {
    code: `import * as stylex from '@stylexjs/stylex'
import { splitFlapLook } from '@thecuvii/flapkit/look'

export const customLook = stylex.createTheme(splitFlapLook, {
  glyphWhite: '#f5efe0',
  topFaceColor: '#171918',
  bottomFaceColor: '#111312',
})`,
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
