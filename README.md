# Flapkit

Composable React split-flap displays with two motion engines, mechanical sound,
independently importable looks, Unicode decks, and multi-cell cassettes.

## Install

```sh
pnpm add @thecuvii/flapkit @stylexjs/stylex
```

React 19 and StyleX 0.19 are peer dependencies. Flapkit publishes ESM with
StyleX authoring calls intact, so the consuming application must compile the
package and extract its CSS. Flapkit does not inject styles at runtime.

For Vite, configure `@stylexjs/unplugin` to compile Flapkit with the application:

```ts
// vite.config.ts
import stylex from '@stylexjs/unplugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    stylex.vite({
      externalPackages: ['@thecuvii/flapkit'],
      runtimeInjection: false,
      useCSSLayers: true,
    } as Parameters<typeof stylex.vite>[0] & { externalPackages: string[] }),
    react(),
  ],
})
```

The intersection only fills a missing `externalPackages` declaration in
`@stylexjs/unplugin@0.19`; it is a documented runtime option. Remove the cast
once the plugin's exported type includes it.

The application must import at least one CSS file so Vite has a CSS asset for
the extracted StyleX rules. This can be the app's normal global stylesheet; it
does not need to contain Flapkit-specific CSS.

## Composition

The package keeps content, motion, composition, and visual treatment separate:

```text
Source → Motion Effect → Board or Grid
                    ├→ optional Sound
                    └→ independently imported Look on an ancestor
```

```tsx
import * as stylex from '@stylexjs/stylex'
import { SplitFlapBoard, type SplitFlapSource } from '@thecuvii/flapkit'
import { SplitFlapRiffle } from '@thecuvii/flapkit/riffle'
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'

const source: SplitFlapSource = {
  columns: [
    { id: 'time', label: 'TIME', cells: 5 },
    { id: 'status', label: 'STATUS', cells: 11 },
  ],
  rows: [
    { id: 'cx251', values: { time: '06:45', status: 'ON TIME' } },
    {
      id: 'jl708',
      highlighted: true,
      values: {
        time: '08:20',
        status: { text: 'BOARDING', tone: 'signalYellow' },
      },
    },
  ],
}

export function Departures() {
  return (
    <section {...stylex.props(airportBoardLook)}>
      <SplitFlapRiffle source={source}>
        <SplitFlapBoard>
          <span>Departures</span>
        </SplitFlapBoard>
      </SplitFlapRiffle>
    </section>
  )
}
```

Riffle provides lightweight, randomized rapid flipping for dense boards. Import
`SplitFlapCascade` from `@thecuvii/flapkit/cascade` for higher-fidelity CSS 3D
motion that cascades across rows. Import
`SplitFlapGrid` from the root when the composition should contain only the
cassette grid without the board frame or header.

Changing `source` values updates only cassettes whose resolved deck positions
changed. Keeping row IDs, column IDs, and column structure stable preserves the
mechanical state between updates.

## Unicode decks

Built-in decks cover Latin letters, numbers, and common punctuation. Provide a
physical custom deck for Chinese, Japanese, emoji, or any other grapheme. Text
is segmented with `Intl.Segmenter`, so combining marks and emoji sequences are
not split across cells.

```tsx
import { createSplitFlapDeck, type SplitFlapSource } from '@thecuvii/flapkit'

const localDeck = createSplitFlapDeck(' 東京大阪成田羽田出発到着搭乗')

const source: SplitFlapSource = {
  columns: [
    {
      id: 'local',
      label: 'LOCAL',
      cells: 4,
      flapDeck: localDeck,
    },
  ],
  rows: [{ id: 'one', values: { local: '東京出発' } }],
}
```

Each grapheme resolves to one independently driven character cell. Every cell
has its own upper and lower split-flap leaves.

## Double-width cassettes

Some displays use a single cassette whose leaves are wide enough to carry two
graphemes. Use `cassetteSpan: 2` with a custom deck of two-grapheme positions:

```tsx
const source: SplitFlapSource = {
  columns: [
    {
      id: 'number',
      label: 'NUMBER',
      cells: 2,
      cassetteSpan: 2,
      flapDeck: createSplitFlapDeck(['  ', '14', '05', '55', '30']),
    },
  ],
  rows: [{ id: 'one', values: { number: '1405' } }],
}
```

This renders two double-width cassettes: `[14] [05]`. Each cassette has one
leaf stack, one deck position, one motion state, and one sound event. The
column's `cells` count remains the number of independently driven cassettes;
`cassetteSpan` only changes each cassette's width and graphemes per deck position.

## Looks and CSS customization

Looks are separate tree-shakeable subpaths and are never re-exported from the
root:

```tsx
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'
import { industrialWallLook } from '@thecuvii/flapkit/looks/industrial'
```

Create a custom StyleX theme from the public variable contract when a product
needs a different visual system:

```tsx
import * as stylex from '@stylexjs/stylex'
import { splitFlapLook } from '@thecuvii/flapkit/look'

export const customLook = stylex.createTheme(splitFlapLook, {
  glyphFontFamily: "'Arial Narrow', sans-serif",
  glyphWarm: '#f5efe0',
  topFaceColor: '#171918',
  bottomFaceColor: '#111312',
})
```

Use the effect's `material` prop for per-instance wear, cavity, seam, stack,
highlight, and glyph tuning. Use a Look for reusable geometry, typography,
surface, and frame design.

## Sound

Sound is optional and ships without audio assets. Supply URLs owned by the
consumer and render `SplitFlapSound` inside the motion effect:

```tsx
import { SplitFlapSound } from '@thecuvii/flapkit/sound'

const soundBank = {
  clicks: ['/audio/flap-1.mp3', '/audio/flap-2.mp3'],
  settles: ['/audio/flap-settle.mp3'],
}

function BoardWithSound() {
  return (
    <SplitFlapRiffle source={source}>
      <SplitFlapBoard />
      <SplitFlapSound bank={soundBank} />
    </SplitFlapRiffle>
  )
}
```

The React adapter unlocks audio on the first pointer or keyboard gesture. The
framework-independent `SplitFlapSoundEngine` is exported from the same subpath
for custom integrations.

## Package subpaths

- `@thecuvii/flapkit`
- `@thecuvii/flapkit/riffle`
- `@thecuvii/flapkit/cascade`
- `@thecuvii/flapkit/sound`
- `@thecuvii/flapkit/look`
- `@thecuvii/flapkit/looks/airport`
- `@thecuvii/flapkit/looks/industrial`

## Development

The root is the publishable package. `website/` is a private workspace that
consumes only public package subpaths.

```sh
pnpm install
pnpm test
pnpm check
pnpm build
pnpm build:website
pnpm dev
```
