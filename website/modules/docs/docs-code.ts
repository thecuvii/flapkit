export type QuickStartSnippetOptions = {
  look: 'airport' | 'industrial'
  motion: 'riffle' | 'cascade'
  board: boolean
  header: boolean
}

export function quickStartCode({ look, motion, board, header }: QuickStartSnippetOptions) {
  const frame = board ? 'Board' : 'Grid'
  const motionCall = motion === 'cascade' ? 'Flapkit.cascade()' : 'Flapkit.riffle()'
  const headerLine = board && header ? '    <Flapkit.Header>Departures</Flapkit.Header>\n' : ''

  return `import * as Flapkit from '@thecuvii/flapkit'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/${look}.css'

<Flapkit.Root motion={${motionCall}}>
  <Flapkit.${frame} aria-label="Package status" className="flapkit-${look}">
${headerLine}    <Flapkit.Row label="STATUS">
      {[...'FLAPKIT'].map((character, index) => (
        <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
      ))}
    </Flapkit.Row>
  </Flapkit.${frame}>
</Flapkit.Root>`
}

export const defaultQuickStartOptions = {
  look: 'airport',
  motion: 'cascade',
  board: true,
  header: true,
} as const satisfies QuickStartSnippetOptions

export const quickStartStaticCode = quickStartCode(defaultQuickStartOptions)
export const quickStartHeaderLine = '    <Flapkit.Header>Departures</Flapkit.Header>'
export const quickStartHeaderTag = '<Flapkit.Header>Departures</Flapkit.Header>'

export type QuickStartToken = {
  color?: string
  content: string
  offset: number
}

export type QuickStartRangeId =
  | 'look-import'
  | 'motion'
  | 'frame-open'
  | 'look-class'
  | 'header'
  | 'frame-close'

type QuickStartRange = {
  end: number
  id: QuickStartRangeId
  start: number
}

function rangeInside(source: string, haystack: string, value: string): { end: number; start: number } {
  const at = source.indexOf(haystack)
  if (at === -1) {
    throw new Error(`Quick start snippet is missing ${JSON.stringify(haystack)}`)
  }
  const inner = haystack.indexOf(value)
  if (inner === -1) {
    throw new Error(`Quick start snippet haystack ${JSON.stringify(haystack)} is missing ${JSON.stringify(value)}`)
  }
  return { end: at + inner + value.length, start: at + inner }
}

export const quickStartRanges: readonly QuickStartRange[] = [
  // Offsets are measured against the static default snippet.
  {
    id: 'look-import',
    ...rangeInside(quickStartStaticCode, "import '@thecuvii/flapkit/airport.css'", 'airport'),
  },
  { id: 'motion', ...rangeInside(quickStartStaticCode, 'motion={Flapkit.cascade()}', 'cascade') },
  {
    id: 'frame-open',
    ...rangeInside(quickStartStaticCode, '<Flapkit.Board aria-label', 'Board'),
  },
  {
    id: 'look-class',
    ...rangeInside(quickStartStaticCode, 'className="flapkit-airport"', 'airport'),
  },
  { id: 'header', ...rangeInside(quickStartStaticCode, quickStartHeaderLine, quickStartHeaderTag) },
  { id: 'frame-close', ...rangeInside(quickStartStaticCode, '</Flapkit.Board>', 'Board') },
]

export function quickStartLiveValue(
  id: QuickStartRangeId,
  options: QuickStartSnippetOptions,
) {
  switch (id) {
    case 'look-import':
    case 'look-class':
      return options.look
    case 'motion':
      return options.motion
    case 'frame-open':
    case 'frame-close':
      return options.board ? 'Board' : 'Grid'
    case 'header':
      return options.board && options.header ? quickStartHeaderTag : ''
  }
}

export const looksTabs = [
  { id: 'airport', label: 'airport' },
  { id: 'industrial', label: 'industrial' },
  { id: 'custom', label: 'custom' },
] as const

export type LooksTab = (typeof looksTabs)[number]['id']

export function looksCode(tab: LooksTab) {
  const look = tab === 'airport' ? 'airport' : 'industrial'
  const boardClass = tab === 'custom' ? `flapkit-${look} operations-board` : `flapkit-${look}`
  const rowClass = tab === 'custom' ? ' className="font-mono"' : ''
  const cellClass = tab === 'custom' ? ' className="text-xl font-bold"' : ''

  return `import * as Flapkit from '@thecuvii/flapkit'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/${look}.css'

<Flapkit.Root motion={Flapkit.cascade()}>
  <Flapkit.Board className="${boardClass}">
    <Flapkit.Row${rowClass} label="STATUS">
      <Flapkit.Cell${cellClass}>A</Flapkit.Cell>
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`
}

export const looksStaticCode = looksCode('custom')
export const looksCssCode = `.operations-board [data-part='face'] {
  background-color: #20231f;
}`

export type LooksRangeId = 'look-import' | 'board-class' | 'row-class' | 'cell-class'

export const looksRanges: readonly { end: number; id: LooksRangeId; start: number }[] = [
  { id: 'look-import', ...rangeInside(looksStaticCode, "import '@thecuvii/flapkit/industrial.css'", 'industrial') },
  {
    id: 'board-class',
    ...rangeInside(looksStaticCode, 'className="flapkit-industrial operations-board"', 'flapkit-industrial operations-board'),
  },
  { id: 'row-class', ...rangeInside(looksStaticCode, ' className="font-mono"', ' className="font-mono"') },
  { id: 'cell-class', ...rangeInside(looksStaticCode, ' className="text-xl font-bold"', ' className="text-xl font-bold"') },
]

export function looksLiveValue(id: LooksRangeId, tab: LooksTab) {
  const look = tab === 'airport' ? 'airport' : 'industrial'
  switch (id) {
    case 'look-import':
      return look
    case 'board-class':
      return tab === 'custom' ? `flapkit-${look} operations-board` : `flapkit-${look}`
    case 'row-class':
      return tab === 'custom' ? ' className="font-mono"' : ''
    case 'cell-class':
      return tab === 'custom' ? ' className="text-xl font-bold"' : ''
  }
}

export const docsCode = {
  quickStart: {
    code: quickStartCode(defaultQuickStartOptions),
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
    code: looksStaticCode,
    language: 'tsx',
  },
  looksCss: {
    code: looksCssCode,
    language: 'css',
  },
  sound: {
    code: `import * as Flapkit from '@thecuvii/flapkit'
import { mechanicalSound } from '@thecuvii/flapkit/sound'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

const soundBank = {
  clicks: ['/audio/click.wav'],
  settles: ['/audio/settle.wav'],
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
