export type QuickStartSnippetOptions = {
  look: 'airport' | 'industrial'
  motion: 'riffle' | 'cascade' | 'css'
  board: boolean
  header: boolean
}

function motionImport(motion: QuickStartSnippetOptions['motion']) {
  const name = motion === 'css' ? 'cascade' : motion
  return `import { ${name} } from '@cuvii/flapkit/motion/${motion === 'css' ? 'css' : 'canvas'}/${name}'`
}

export function quickStartCode({ look, motion, board, header }: QuickStartSnippetOptions) {
  const frame = board ? 'Board' : 'Grid'
  const motionCall = `${motion === 'css' ? 'cascade' : motion}()`
  const headerLine = board && header ? '    <Flapkit.Header>Departures</Flapkit.Header>\n' : ''

  return `import * as Flapkit from '@cuvii/flapkit'
${motionImport(motion)}
import '@cuvii/flapkit/flapkit.css'
import '@cuvii/flapkit/${look}.css'

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
  | 'motion-import'
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

function rangeInside(
  source: string,
  haystack: string,
  value: string,
): { end: number; start: number } {
  const at = source.indexOf(haystack)
  if (at === -1) {
    throw new Error(`Quick start snippet is missing ${JSON.stringify(haystack)}`)
  }
  const inner = haystack.indexOf(value)
  if (inner === -1) {
    throw new Error(
      `Quick start snippet haystack ${JSON.stringify(haystack)} is missing ${JSON.stringify(value)}`,
    )
  }
  return { end: at + inner + value.length, start: at + inner }
}

export const quickStartRanges: readonly QuickStartRange[] = [
  // Offsets are measured against the static default snippet.
  {
    id: 'look-import',
    ...rangeInside(quickStartStaticCode, "import '@cuvii/flapkit/airport.css'", 'airport'),
  },
  { id: 'motion-import', ...rangeInside(quickStartStaticCode, motionImport('cascade'), motionImport('cascade')) },
  { id: 'motion', ...rangeInside(quickStartStaticCode, 'motion={cascade()}', 'cascade()') },
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

export function quickStartLiveValue(id: QuickStartRangeId, options: QuickStartSnippetOptions) {
  switch (id) {
    case 'look-import':
    case 'look-class':
      return options.look
    case 'motion':
      return `${options.motion === 'css' ? 'cascade' : options.motion}()`
    case 'motion-import':
      return motionImport(options.motion)
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
export const looksSampleLines = ['FLAPKIT', 'BY     ', 'CUVII  '] as const

export function looksCode(tab: LooksTab) {
  const look = tab === 'airport' ? 'airport' : 'industrial'
  const boardClass =
    tab === 'custom' ? `flapkit-${look} p-5 bg-[#512c86] bg-none` : `flapkit-${look}`
  const rowClass = tab === 'custom' ? ' className="font-mono"' : ''
  const cellName = tab === 'custom' ? 'EvaCell' : 'Flapkit.Cell'

  return `import * as Flapkit from '@cuvii/flapkit'
import { cascade } from '@cuvii/flapkit/motion/canvas/cascade'
import '@cuvii/flapkit/flapkit.css'
import '@cuvii/flapkit/${look}.css'

<Flapkit.Root motion={cascade()}>
  <Flapkit.Board className="${boardClass}">
    {['FLAPKIT', 'BY     ', 'CUVII  '].map((line, row) => (
      <Flapkit.Row key={row}${rowClass}>
        {[...line].map((character, column) => (
          <${cellName} key={column}>{character}</${cellName}>
        ))}
      </Flapkit.Row>
    ))}
  </Flapkit.Board>
</Flapkit.Root>`
}

export const looksStaticCode = looksCode('custom')
export const looksCssCode = `function EvaCell({ children }: { children: string }) {
  return (
    <Flapkit.Cell className="h-9 w-5 bg-[#34194f] bg-none">
      <Flapkit.Face className="bg-[#7846bb] bg-none" />
      <Flapkit.Glyph className="font-mono text-xl font-bold text-[#b6ff36]">
        {children}
      </Flapkit.Glyph>
      <Flapkit.Retainer className="bg-neutral-950 bg-none" />
    </Flapkit.Cell>
  )
}`

export type LooksRangeId = 'look-import' | 'board-class' | 'row-class' | 'cell-open' | 'cell-close'

export const looksRanges: readonly { end: number; id: LooksRangeId; start: number }[] = [
  {
    id: 'look-import',
    ...rangeInside(looksStaticCode, "import '@cuvii/flapkit/industrial.css'", 'industrial'),
  },
  {
    id: 'board-class',
    ...rangeInside(
      looksStaticCode,
      'className="flapkit-industrial p-5 bg-[#512c86] bg-none"',
      'flapkit-industrial p-5 bg-[#512c86] bg-none',
    ),
  },
  {
    id: 'row-class',
    ...rangeInside(looksStaticCode, ' className="font-mono"', ' className="font-mono"'),
  },
  { id: 'cell-open', ...rangeInside(looksStaticCode, '<EvaCell key={column}>', 'EvaCell') },
  { id: 'cell-close', ...rangeInside(looksStaticCode, '</EvaCell>', 'EvaCell') },
]

export function looksLiveValue(id: LooksRangeId, tab: LooksTab) {
  const look = tab === 'airport' ? 'airport' : 'industrial'
  switch (id) {
    case 'look-import':
      return look
    case 'board-class':
      return tab === 'custom' ? `flapkit-${look} p-5 bg-[#512c86] bg-none` : `flapkit-${look}`
    case 'row-class':
      return tab === 'custom' ? ' className="font-mono"' : ''
    case 'cell-open':
    case 'cell-close':
      return tab === 'custom' ? 'EvaCell' : 'Flapkit.Cell'
  }
}

function motionCode(motion: 'cascade' | 'riffle' | 'css') {
  const motionCall = `${motion === 'css' ? 'cascade' : motion}()`
  return `import * as Flapkit from '@cuvii/flapkit'
${motionImport(motion)}

<Flapkit.Root motion={${motionCall}}>
  <Flapkit.Board className="flapkit-airport">
    <Flapkit.Row label="STATUS">
      {[...'FLAPKIT'].map((character, index) => (
        <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
      ))}
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>`
}

export const docsCode = {
  quickStart: {
    code: quickStartCode(defaultQuickStartOptions),
    language: 'tsx',
  },
  composition: {
    code: `import * as Flapkit from '@cuvii/flapkit'
import { riffle } from '@cuvii/flapkit/motion/canvas/riffle'
import '@cuvii/flapkit/flapkit.css'
import '@cuvii/flapkit/airport.css'

<Flapkit.Root motion={riffle()}>
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
    code: `// Outside the component — each entry is a complete grapheme.
const phrases = [
  ['안', '녕', '👋', '🌏'],
  ['東', '京', '🚀', '✨'],
  ['你', '好', '☕', '💚'],
  // Add more characters and phrases here.
]
const deck = Flapkit.createDeck([' ', ...new Set(phrases.flat())])

// Within your Grid or Board.
<Flapkit.Row deck={deck}>
  {['안', '녕', '👋', '🌏'].map((character, index) => (
    <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
  ))}
</Flapkit.Row>`,
    language: 'tsx',
  },
  motionRiffle: {
    code: motionCode('riffle'),
    language: 'tsx',
  },
  motionCascade: {
    code: motionCode('cascade'),
    language: 'tsx',
  },
  motionCss: {
    code: motionCode('css'),
    language: 'tsx',
  },
  looks: {
    code: looksStaticCode,
    language: 'tsx',
  },
  looksCss: {
    code: looksCssCode,
    language: 'tsx',
  },
  sound: {
    code: `import * as Flapkit from '@cuvii/flapkit'
import { riffle } from '@cuvii/flapkit/motion/canvas/riffle'
import { mechanicalSound } from '@cuvii/flapkit/sound'
import '@cuvii/flapkit/flapkit.css'
import '@cuvii/flapkit/airport.css'

const soundBank = {
  clicks: ['/audio/click.wav'],
  settles: ['/audio/settle.wav'],
}

<Flapkit.Root
  motion={riffle()}
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
