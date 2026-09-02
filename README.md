# Flapkit

Composable React split-flap displays with two motion engines, mechanical sound,
independently importable looks, Unicode decks, and multi-cell cassettes.

## Install

```sh
pnpm add @thecuvii/flapkit
```

React 19 is a peer dependency. Import the structural stylesheet and one look;
Flapkit does not inject styles at runtime.

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
import * as Flapkit from '@thecuvii/flapkit'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'

const statusDeck = Flapkit.createDeck(' BOARDING', ['white', 'yellow'])

export function Departures() {
  return (
    <Flapkit.Root motion={Flapkit.riffle()}>
      <Flapkit.Board className="flapkit-airport departures-board">
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
  )
}
```

Use a flat `Row` when the whole row shares one label, deck, sequence, and
variant. Add `Group` only when adjacent horizontal regions need different
settings. `Row` and `Group` IDs are optional; provide stable IDs when items can
reorder.

`Flapkit.riffle()` provides lightweight, randomized rapid flipping for dense
boards. Use `Flapkit.cascade()` for higher-fidelity CSS 3D motion that cascades
across rows.

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

const localDeck = Flapkit.createDeck(' 東京大阪成田羽田出発到着搭乗')

<Flapkit.Root motion={Flapkit.riffle()}>
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
const numberDeck = Flapkit.createDeck(['  ', '14', '05', '55', '30'])

<Flapkit.Row deck={numberDeck} label="NUMBER">
  <Flapkit.WideCell>14</Flapkit.WideCell>
  <Flapkit.WideCell>05</Flapkit.WideCell>
</Flapkit.Row>
```

This renders two double-width cassettes: `[14] [05]`. Each cassette has one
leaf stack, one deck position, one motion state, and one sound event. A Group
cannot mix `Cell` and `WideCell`; place different widths in adjacent Groups.

## Looks and CSS customization

Looks are separate CSS subpaths. Apply their scoped class directly to the
`Board` or `Grid` styling host; `className` is preserved alongside
Flapkit's structural classes.

```tsx
import * as Flapkit from '@thecuvii/flapkit'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/industrial.css'

export function Operations() {
  return (
    <Flapkit.Root motion={Flapkit.cascade()}>
      <Flapkit.Board className="flapkit-industrial operations-board">
        <Flapkit.Row className="font-mono" label="STATUS">
          <Flapkit.Cell className="text-xl font-bold">A</Flapkit.Cell>
        </Flapkit.Row>
      </Flapkit.Board>
    </Flapkit.Root>
  )
}
```

Font family, weight, and style inherit from `Board`, `Row`, and `Group`; size can
be set directly on `Cell`. Ordinary classes and Tailwind utilities work without
a Flapkit-specific API.
For non-inheritable surfaces, scope CSS to your class and the rendered
`data-slot` anatomy:

```css
.operations-board {
  max-width: 100%;
}

.operations-board [data-part='face'] {
  filter: saturate(0.9);
}
```

## Sound

Sound is optional and ships without audio assets. Supply URLs owned by the
consumer and pass the sound element to `Root`:

```tsx
import * as Flapkit from '@thecuvii/flapkit'
import { mechanicalSound } from '@thecuvii/flapkit/sound'

const soundBank = {
  clicks: ['/audio/flap-1.mp3', '/audio/flap-2.mp3'],
  settles: ['/audio/flap-settle.mp3'],
}

function BoardWithSound() {
  return (
    <Flapkit.Root motion={Flapkit.riffle()} sound={mechanicalSound({ bank: soundBank })}>
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
framework-independent `SoundEngine` is exported from the same subpath
for custom integrations.

## Package subpaths

- `@thecuvii/flapkit`
- `@thecuvii/flapkit/sound`
- `@thecuvii/flapkit/flapkit.css`
- `@thecuvii/flapkit/airport.css`
- `@thecuvii/flapkit/industrial.css`

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
