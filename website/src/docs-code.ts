export const docsCode = {
  installation: {
    code: 'pnpm add @thecuvii/flapkit @stylexjs/stylex',
    language: 'shell',
  },
  usageRiffle: {
    code: `import { SplitFlapGrid } from '@thecuvii/flapkit'
import { SplitFlapRiffle } from '@thecuvii/flapkit/riffle'

<SplitFlapRiffle source={source}>
  <SplitFlapGrid aria-label="Package status" />
</SplitFlapRiffle>`,
    language: 'tsx',
  },
  usageCascade: {
    code: `import { SplitFlapGrid } from '@thecuvii/flapkit'
import { SplitFlapCascade } from '@thecuvii/flapkit/cascade'

<SplitFlapCascade source={source}>
  <SplitFlapGrid aria-label="Package status" />
</SplitFlapCascade>`,
    language: 'tsx',
  },
  usageUnicode: {
    code: `import { createSplitFlapDeck, SplitFlapGrid } from '@thecuvii/flapkit'
import { SplitFlapRiffle } from '@thecuvii/flapkit/riffle'

const localDeck = createSplitFlapDeck(' 東京大阪成田羽田出発到着搭乗')
const source = {
  columns: [{
    id: 'local',
    label: 'LOCAL',
    cells: 4,
    flapDeck: localDeck,
  }],
  rows: [{ id: 'service', values: { local: '東京出発' } }],
}

<SplitFlapRiffle source={source}>
  <SplitFlapGrid aria-label="Local service" />
</SplitFlapRiffle>`,
    language: 'tsx',
  },
  composition: {
    code: `import * as stylex from '@stylexjs/stylex'
import { SplitFlapBoard } from '@thecuvii/flapkit'
import { SplitFlapRiffle } from '@thecuvii/flapkit/riffle'
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'

export function Departures() {
  return (
    <section {...stylex.props(airportBoardLook)}>
      <SplitFlapRiffle source={source}>
        <SplitFlapBoard>Departures</SplitFlapBoard>
      </SplitFlapRiffle>
    </section>
  )
}`,
    language: 'tsx',
  },
  customization: {
    code: `import * as stylex from '@stylexjs/stylex'
import { splitFlapLook } from '@thecuvii/flapkit/look'

export const customLook = stylex.createTheme(splitFlapLook, {
  glyphWarm: '#f5efe0',
  topFaceColor: '#171918',
  bottomFaceColor: '#111312',
})`,
    language: 'tsx',
  },
  sound: {
    code: `import { SplitFlapSound } from '@thecuvii/flapkit/sound'

<SplitFlapRiffle source={source}>
  <SplitFlapBoard />
  <SplitFlapSound bank={soundBank} />
</SplitFlapRiffle>`,
    language: 'tsx',
  },
} as const

export type DocsCodeKey = keyof typeof docsCode
export type HighlightedDocsCode = Record<DocsCodeKey, string>
