# Flapkit

Composable React split-flap displays with two motion engines, mechanical sound,
independently importable looks, Unicode decks, and multi-cell cassettes.

## Install

```sh
pnpm add @cuvii/flapkit
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
import * as Flapkit from '@cuvii/flapkit'
import '@cuvii/flapkit/flapkit.css'
import '@cuvii/flapkit/airport.css'

const statusDeck = Flapkit.createDeck(' BOARDING', ['white', 'yellow'])

export function Departures() {
  return (
    <Flapkit.Root motion={Flapkit.riffle()}>
      <Flapkit.Board data-look="airport" className="departures-board">
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
boards. Use `Flapkit.cascade()` for the same canvas paint path with starts
staggered across rows. Both are factories over `Flapkit.motion()`; pass your
own start schedule when you need a third timing pattern. The paint path stays
the same. Root keeps an adapter by `id` and options, so an inline schedule
function does not remount motion on every render.

Changing cell values updates only cassettes whose resolved deck positions
changed. Every row must share the first row's Group, Cell, and WideCell
structure — that is the physical board. Use another `Root` or `Grid` for a
different layout. Stable optional row and group IDs keep cassette identity
when those aligned rows reorder.

## Unicode decks

Built-in decks cover Latin letters, numbers, and common punctuation. Provide a
physical custom deck for Chinese, Japanese, emoji, or any other grapheme. Text
is segmented with `Intl.Segmenter`, so combining marks and emoji sequences are
not split across cells.

```tsx
import * as Flapkit from '@cuvii/flapkit'

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

Built-in variants are `white`, `yellow`, and `orange`. `createDeck` accepts
any variant name; define the matching look tokens
`--flapkit-glyph-{name}`, `--flapkit-glyph-{name}-top`, and
`--flapkit-glyph-{name}-bottom` (the structural stylesheet already derives
top/bottom from `--flapkit-glyph-{name}` for the built-ins).

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

Looks are separate CSS subpaths. Select one with `data-look` on the `Board` or
`Grid` styling host; any `data-*` attribute and `className` are forwarded to
that host alongside Flapkit's structural classes. The legacy `flapkit-airport`
and `flapkit-industrial` classes still work.

```tsx
import * as Flapkit from '@cuvii/flapkit'
import '@cuvii/flapkit/flapkit.css'
import '@cuvii/flapkit/industrial.css'

export function Operations() {
  return (
    <Flapkit.Root motion={Flapkit.cascade()}>
      <Flapkit.Board data-look="industrial" className="operations-board">
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

### CSS customization contract

Flapkit renders settled cassettes in the DOM and animated cassettes on Canvas.
Customize both paths through the supported tokens and anatomy below rather than
depending on implementation classes or renderer state.

The stable consumer tokens are:

- Typography: `--flapkit-glyph-font-family`, `--flapkit-glyph-font-weight`,
  `--flapkit-glyph-size`, `--flapkit-glyph-tracking`, `--flapkit-glyph-width`,
  `--flapkit-glyph-scale-y`, `--flapkit-glyph-y`, and `--flapkit-glyph-opacity`.
- Glyph and face colors: `--flapkit-glyph-{variant}`,
  `--flapkit-glyph-{variant}-top`, `--flapkit-glyph-{variant}-bottom`,
  `--flapkit-top-face-color`, `--flapkit-bottom-face-color`,
  `--flapkit-highlight-face`, and `--flapkit-highlight-glyph`.
- Geometry: `--flapkit-board-unit`, `--flapkit-cell-track`,
  `--flapkit-cell-height`, `--flapkit-frame-top`, `--flapkit-frame-right`,
  `--flapkit-frame-bottom`, `--flapkit-frame-left`,
  `--flapkit-header-height`, and `--flapkit-title-only-header-height`.

Look authors may additionally define the `--flapkit-board-*`,
`--flapkit-grid-*`, `--flapkit-row-*`, `--flapkit-cassette-*`,
`--flapkit-cavity-*`, `--flapkit-cover-*`, `--flapkit-axle-*`,
`--flapkit-spare-leaf-*`, and face surface/shadow tokens used by the bundled
look files. These describe the DOM material around the animated leaves; they do
not imply that Canvas reproduces every CSS paint effect.

The stable rendered anatomy is intentionally small:

| Selector | Meaning |
| --- | --- |
| `[data-slot='split-flap-board']` | Framed styling host |
| `[data-slot='split-flap-grid']` | Frameless styling host |
| `[data-slot='row']` | One display row |
| `[data-slot='group']` | One adjacent cassette group |
| `[data-slot='cassette']` | One independently driven cassette |
| `[data-part='face']` | Upper, lower, or moving leaf face |
| `[data-part='retainer']` | Axle or wide-cassette retainer |

For example, a face color is measured and carried into Canvas animation:

```css
.operations-board {
  max-width: 100%;
}

.operations-board [data-part='face'] {
  background-color: #20231f;
}
```

Canvas supports the following CSS subset during motion:

| Customization | Settled DOM | Canvas motion |
| --- | --- | --- |
| Font family, size, weight, style, stretch, tracking, opacity, and glyph scale | Yes | Yes |
| Variant glyph colors and face `background-color` | Yes | Yes |
| Cassette and face geometry | Yes | Yes |
| Board, frame, cavity, cover, and retainer materials | Yes | DOM remains responsible |
| `background-image`, `filter`, `box-shadow`, `text-shadow`, blend modes, and custom pseudo-elements on a face | Yes | No |

Canvas remeasures when Board/Grid props or ancestor attributes change, layout
resizes, presentation classes change, or fonts finish loading. Pure CSS state
changes such as `:hover` or a media query that neither changes geometry nor an
observed attribute are not guaranteed to trigger remeasurement.

Variables beginning with `--fk-`, `--flapkit-active-*`,
`--flapkit-rendered-*`, `--flapkit-moving-*`, `--flapkit-stack-*`,
`--flapkit-specular`, and undocumented `data-split-flap-*` attributes belong to
the renderer/controller protocol and are not public API. Do not target internal
`.flapkit-*` classes; use the stable anatomy above.

## Sound

Sound is optional and ships without audio assets. Supply URLs owned by the
consumer and pass the sound element to `Root`:

```tsx
import * as Flapkit from '@cuvii/flapkit'
import { mechanicalSound } from '@cuvii/flapkit/sound'

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

## API

Updates animate only cassettes whose resolved deck position changed. Motion
engines and looks tree-shake independently, and there is no runtime style
injection.

### Package subpaths

- `@cuvii/flapkit`
- `@cuvii/flapkit/sound`
- `@cuvii/flapkit/flapkit.css`
- `@cuvii/flapkit/airport.css`
- `@cuvii/flapkit/industrial.css`

### Root

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | Board or Grid |
| `motion` | `MotionAdapter` | — | `riffle()` or `cascade()` |
| `sound` | `ReactElement` | — | `mechanicalSound({ bank })` |

### Board

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `data-look` | `'airport' \| 'industrial'` | — | Selects an imported look |
| `data-*` | `string` | — | Forwarded to the styling host |
| `className` | `string` | — | Ordinary CSS and utilities |
| `aria-label` | `string` | Split-flap display board | Accessible name |
| `columnGap` | `number` | `0.28` | Gap inside a group, in board units |
| `groupGap` | `number` | `0.8` | Gap between groups |
| `rowGap` | `number` | `0.4` | Gap between rows |
| `grainOpacity` | `number` | `0.32` | Frame grain overlay |
| `showColumnLabels` | `boolean` | `true` | Column labels under the header |

### Grid

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `data-look` | `'airport' \| 'industrial'` | — | Selects an imported look |
| `data-*` | `string` | — | Forwarded to the styling host |
| `className` | `string` | — | Ordinary CSS and utilities |
| `aria-label` | `string` | Split-flap display grid | Accessible name |
| `columnGap` | `number` | `0.28` | Gap inside a group, in board units |
| `groupGap` | `number` | `0.8` | Gap between groups |
| `rowGap` | `number` | `0.4` | Gap between rows |

### Header

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | Board title. Board only |

### Row

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | generated | Stable identity when rows reorder |
| `label` | `string` | — | Column label when the row is one region |
| `deck` | `Deck` | — | Stops for every cassette in the row |
| `sequence` | `Sequence` | `alphanumeric` | Built-in deck if no custom deck |
| `variant` | `Variant` | `white` | `white`, `yellow`, or `orange` |
| `highlighted` | `boolean` | `false` | Lifted, brighter row |
| `className` | `string` | — | Inherits into glyphs |

### Group

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | generated | Stable identity when groups reorder |
| `label` | `string` | — | Column label for this region |
| `deck` | `Deck` | inherited | Overrides the row deck |
| `sequence` | `Sequence` | inherited | Overrides the row sequence |
| `variant` | `Variant` | inherited | Overrides the row variant |
| `className` | `string` | — | Inherits into glyphs |

### Cell / WideCell

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `children` | `string` or `number` | — | Displayed graphemes. WideCell uses two |
| `deck` | `Deck` | inherited | Overrides the group or row deck |
| `sequence` | `Sequence` | inherited | Overrides the group or row sequence |
| `className` | `string` | — | Size and other cell-level styles |

### createDeck

| Argument | Type | Default | Meaning |
| --- | --- | --- | --- |
| `characters` | `string` or `string[]` | — | Stops. Strings split by grapheme |
| `variants` | `Variant[]` | `['white']` | Repeats the stops per variant |

### riffle / cascade / motion

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `riffleMs` | `number` | `36` | Riffle pitch duration |
| `startSpreadMs` | `number` | `480` | Riffle start window across the board |
| `pitchMs` | `number` | `52` | Cascade or custom pitch duration |
| `rowDelayMs` | `number` | `150` | Cascade delay between rows |
| `withinRowJitterMs` | `number` | `16` | Cascade start jitter inside a row |
| `cadenceVariationPct` | `number` | `4` / `6` | Per-cassette timing noise |
| `finalSettleMs` | `number` | `260` | Settle after the last pitch |
| `finalReboundDeg` | `number` | `2` | Settle rebound angle |

`motion(schedule, options)` uses the shared option names above. `schedule`
receives the cassettes that need to start and must call `ctx.start(index, at)`.
`timingNoise(index, salt)` is the same deterministic noise riffle and cascade
use.

```tsx
<Flapkit.Root
  motion={Flapkit.motion((cassettes, ctx) => {
    cassettes.forEach((cassette) => ctx.start(cassette.index, ctx.now))
  }, { pitchMs: 40 })}
>
```

### mechanicalSound

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `bank` | `SoundBank` | — | clicks and settles URL lists |
| `enabled` | `boolean` | `true` | Connect or disconnect the engine |
| `volume` | `number` | `0.58` | Master level |

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
