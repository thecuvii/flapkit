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

The compound API keeps content, motion, sound, and visual treatment separate:

```text
Root ── motion adapter
 ├── Board
 │    ├── Header
 │    └── Row ── Group ── Cell / WideCell
 └── optional sound
```

```tsx
import * as stylex from '@stylexjs/stylex'
import * as Flapkit from '@thecuvii/flapkit'
import { riffle } from '@thecuvii/flapkit/riffle'
import { airportBoardLook } from '@thecuvii/flapkit/looks/airport'

const statusDeck = Flapkit.createSplitFlapDeck(' BOARDING', ['white', 'yellow'])

export function Departures() {
  return (
    <section {...stylex.props(airportBoardLook)}>
      <Flapkit.Root motion={riffle()}>
        <Flapkit.Board>
          <Flapkit.Header>Departures</Flapkit.Header>
          <Flapkit.Row highlighted>
            <Flapkit.Group label="TIME">
              {[...'08:20'].map((character, index) => (
                <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
              ))}
            </Flapkit.Group>
            <Flapkit.Group deck={statusDeck} label="STATUS" variant="yellow">
              {[...'BOARDING'].map((character, index) => (
                <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
              ))}
            </Flapkit.Group>
          </Flapkit.Row>
        </Flapkit.Board>
      </Flapkit.Root>
    </section>
  )
}
```

Use a flat `Row` when the whole row shares one label, deck, sequence, and
variant. Add `Group` only when adjacent horizontal regions need different
settings. `Row` and `Group` IDs are optional; provide stable IDs when items can
reorder.

Riffle provides lightweight, randomized rapid flipping for dense boards. Pass
`cascade()` from `@thecuvii/flapkit/cascade` for higher-fidelity CSS 3D motion
that cascades across rows.

Changing cell values updates only cassettes whose resolved deck positions
changed. Stable optional row and group IDs preserve mechanical identity when
their order changes.

## Unicode decks

Built-in decks cover Latin letters, numbers, and common punctuation. Provide a
physical custom deck for Chinese, Japanese, emoji, or any other grapheme. Text
is segmented with `Intl.Segmenter`, so combining marks and emoji sequences are
not split across cells.

```tsx
import * as Flapkit from '@thecuvii/flapkit'
import { riffle } from '@thecuvii/flapkit/riffle'

const localDeck = Flapkit.createSplitFlapDeck(' 東京大阪成田羽田出発到着搭乗')

<Flapkit.Root motion={riffle()}>
  <Flapkit.Board>
    <Flapkit.Row deck={localDeck} label="LOCAL">
      {[...'東京出発'].map((character, index) => (
        <Flapkit.Cell key={index}>{character}</Flapkit.Cell>
      ))}
    </Flapkit.Row>
  </Flapkit.Board>
</Flapkit.Root>
```

Each grapheme resolves to one independently driven character cell. Every cell
has its own upper and lower split-flap leaves.

## Double-width cassettes

Some displays use a single cassette whose leaves are wide enough to carry two
graphemes. Use `WideCell` with a custom deck of two-grapheme positions:

```tsx
const numberDeck = Flapkit.createSplitFlapDeck(['  ', '14', '05', '55', '30'])

<Flapkit.Row deck={numberDeck} label="NUMBER">
  <Flapkit.WideCell>14</Flapkit.WideCell>
  <Flapkit.WideCell>05</Flapkit.WideCell>
</Flapkit.Row>
```

This renders two double-width cassettes: `[14] [05]`. Each cassette has one
leaf stack, one deck position, one motion state, and one sound event. A Group
cannot mix `Cell` and `WideCell`; place different widths in adjacent Groups.

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
  glyphWhite: '#f5efe0',
  topFaceColor: '#171918',
  bottomFaceColor: '#111312',
})
```

Use the effect's `material` prop for per-instance wear, cavity, seam, stack,
highlight, and glyph tuning. Use a Look for reusable geometry, typography,
surface, and frame design.

## Sound

Sound is optional and ships without audio assets. Supply URLs owned by the
consumer and pass the sound element to `Root`:

```tsx
import { mechanicalSound } from '@thecuvii/flapkit/sound'

const soundBank = {
  clicks: ['/audio/flap-1.mp3', '/audio/flap-2.mp3'],
  settles: ['/audio/flap-settle.mp3'],
}

function BoardWithSound() {
  return (
    <Flapkit.Root motion={riffle()} sound={mechanicalSound({ bank: soundBank })}>
      <Flapkit.Board>
        <Flapkit.Row>
          <Flapkit.Cell>A</Flapkit.Cell>
        </Flapkit.Row>
      </Flapkit.Board>
    </Flapkit.Root>
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
