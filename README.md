# Flapkit

Composable React split-flap displays with two motion engines, mechanical sound,
independently importable looks, Unicode decks, and multi-cell cassettes.

[Documentation and demos](https://cuvii.dev/flapkit/)

## Install

```sh
pnpm add flapkit
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
import * as Flapkit from 'flapkit'
import { riffle } from 'flapkit/motion/canvas/riffle'
import 'flapkit/flapkit.css'
import 'flapkit/airport.css'

const statusDeck = Flapkit.createDeck(' BOARDING', ['white', 'yellow'])

export function Departures() {
  return (
    <Flapkit.Root motion={riffle()}>
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

Use a flat `Row` when the whole row shares one label, deck, and
variant. Add `Group` only when adjacent horizontal regions need different
settings. `Row` and `Group` IDs are optional; provide stable IDs when items can
reorder.

`riffle()` randomizes rapid starts; `cascade()` staggers starts across rows.
Choose the renderer through its import path:

```tsx
import { cascade } from 'flapkit/motion/css/cascade'
// Or: 'flapkit/motion/canvas/cascade'
// Or: import { riffle } from 'flapkit/motion/canvas/riffle'

;<Flapkit.Root motion={cascade()}>{/* Board or Grid */}</Flapkit.Root>
```

The CSS entry does not depend on the Canvas renderer. The Canvas entries supply
their renderer to Root, so CSS-only consumers can tree-shake it out. These
entry points do not take a `renderer` option. Root exports remain for compatibility;
prefer the explicit subpaths, especially over the legacy runtime renderer switch.
`Flapkit.motion()` still supports custom Canvas start schedules. Root keeps an
adapter by `id` and options, so an inline schedule does not remount motion.

Changing cell values updates only cassettes whose resolved deck positions
changed. Every row must share the first row's Group, Cell, and WideCell
structure — that is the physical board. Use another `Root` or `Grid` for a
different layout. Stable optional row and group IDs identify logical rows and
regions. Reordering rows or groups rebuilds the cassettes and restarts animation
toward the current targets; IDs do not preserve in-flight animation state.

## Built-in decks

Import `alphanumericDeck`, `numericDeck`, or `punctuationDeck` and pass it through
`deck`, just like a custom deck. Without a deck, single cells use `alphanumericDeck`.

| Export             | Characters, in flip order |
| ------------------ | ------------------------- |
| `alphanumericDeck` | Space, A–Z, 0–9, `-./:`   |
| `numericDeck`      | Space, 0–9                |
| `punctuationDeck`  | Space, `:./-`             |

```tsx
import { Cell, numericDeck } from 'flapkit'

// Inside a Row or Group:
;<Cell deck={numericDeck}>8</Cell>
```

Set `deck` on a flat `Row` or a `Group` to share it with their cells; a cell's
own `deck` overrides that default. These decks contain white positions; use
`createDeck()` when you need additional variants or custom characters.

The `sequence` prop and `Sequence` type have been removed. Migrate
`sequence="numeric"` to `deck={numericDeck}` (and likewise for the other decks).

## Unicode decks

Built-in decks cover Latin letters, numbers, and common punctuation. Provide a
physical custom deck for Chinese, Japanese, emoji, or any other grapheme. Text
is segmented with `Intl.Segmenter`, so combining marks and emoji sequences are
not split across cells.

```tsx
import * as Flapkit from 'flapkit'
import { riffle } from 'flapkit/motion/canvas/riffle'

const localDeck = Flapkit.createDeck(' 東京大阪成田羽田出発到着搭乗')

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

Built-in variants are `white`, `yellow`, and `orange`, using the bundled look's
palette. `createDeck` also accepts custom variant names. Style `Glyph` with
ordinary `color` or a Tailwind text-color class for a custom color; the default
`white` variant inherits text color from its ancestors.

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
import * as Flapkit from 'flapkit'
import 'flapkit/flapkit.css'
import 'flapkit/industrial.css'
import { cascade } from 'flapkit/motion/css/cascade'

function EvaCell({ children }: { children: string }) {
  return (
    <Flapkit.Cell className="h-12 w-6">
      <Flapkit.Face className="bg-purple-600" />
      <Flapkit.Glyph className="text-lime-300">{children}</Flapkit.Glyph>
      <Flapkit.Retainer className="bg-neutral-950" />
    </Flapkit.Cell>
  )
}

export function Operations() {
  return (
    <Flapkit.Root motion={cascade()}>
      <Flapkit.Board data-look="industrial" className="p-5 bg-purple-950">
        <Flapkit.Header className="font-mono text-lime-300">Operations</Flapkit.Header>
        <Flapkit.Row className="gap-2 font-mono" label="STATUS">
          <EvaCell>A</EvaCell>
          <EvaCell>B</EvaCell>
        </Flapkit.Row>
      </Flapkit.Board>
    </Flapkit.Root>
  )
}
```

Keep `<Cell>A</Cell>` for the default appearance. Alternatively, declare any of
`Face`, `Glyph`, and `Retainer` once inside a cell, in any order. Undeclared parts
use the look's defaults. `Glyph` supplies the text; omitting it displays a blank.
Do not mix bare text with part declarations or repeat a part. The same API works
inside `WideCell`, with two-grapheme content and a matching deck.

Ordinary React wrappers such as `EvaCell` work inside rows and groups, including
hooks and context. React mounts each wrapper normally; Flapkit never calls a
component function to inspect its return value. Declarations are collected after
the client commit, so the visible display requires JavaScript. Structural
wrappers are declarations, not a way to insert arbitrary visible HTML into a row.

`Header` children keep their original React context, keys, and error boundaries.
Place Suspense or Activity around the entire `Root`, not around structural
declarations inside Board, Row, or Group. Partial structural trees are unsupported
and still undergo normal layout validation. Header content can use its own boundaries.

Use `padding` on `Board`, `row-gap` on `Board` or `Grid`, `gap` on `Row` or
`Group`, and `width`/`height` on `Cell`. A flat Row's gap separates cells; a grouped
Row's gap separates groups. Typography and text color inherit; override size on
`Cell` or `Glyph`. All primitives accept `className` and `style`. There is no
`parts` object, public geometry-token configuration, or numeric gap prop.

Multiple rows still require matching group IDs, labels, cassette counts, spans,
and decks. Styling can differ per row; CSS determines the rendered dimensions.
Use consistent cell widths and group gaps when columns should align.

### CSS customization contract

The Canvas entries use Canvas during motion and DOM for settled leaves.
Import `cascade` from `flapkit/motion/css/cascade` to keep
leaves in CSS 3D throughout the animation. Both consume the same primitives.
Classes on `Face` apply to every stationary and moving face; classes on `Glyph`
apply to its glyph carriers, and `Retainer` styles each axle/retainer.

The stable rendered anatomy is intentionally small:

| Selector                         | Meaning                           |
| -------------------------------- | --------------------------------- |
| `[data-slot='split-flap-board']` | Framed styling host               |
| `[data-slot='split-flap-grid']`  | Frameless styling host            |
| `[data-slot='row']`              | One display row                   |
| `[data-slot='group']`            | One adjacent cassette group       |
| `[data-slot='cassette']`         | One independently driven cassette |
| `[data-part='face']`             | Upper, lower, or moving leaf face |
| `[data-part='retainer']`         | Axle or wide-cassette retainer    |

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

| Customization                                                                                                | Settled DOM | Canvas motion           |
| ------------------------------------------------------------------------------------------------------------ | ----------- | ----------------------- |
| Font family, size, weight, style, stretch, tracking, opacity, and glyph scale                                | Yes         | Yes                     |
| Variant glyph colors and face `background-color`                                                             | Yes         | Yes                     |
| Cassette and face geometry                                                                                   | Yes         | Yes                     |
| Board, frame, cavity, cover, and retainer materials                                                          | Yes         | DOM remains responsible |
| `background-image`, `filter`, `box-shadow`, `text-shadow`, blend modes, and custom pseudo-elements on a face | Yes         | No                      |

Canvas remeasures when Board/Grid props or ancestor attributes change, layout
resizes, presentation classes change, or fonts finish loading. Pure CSS state
changes such as `:hover` or a media query that neither changes geometry nor an
observed attribute are not guaranteed to trigger remeasurement.

All `--flapkit-*` and `--fk-*` custom properties, undocumented
`data-split-flap-*` attributes, and internal `.flapkit-*` classes are private
renderer details. Use the primitives and ordinary CSS instead.

## Sound

Sound is optional and ships without audio assets. Supply URLs owned by the
consumer and pass the sound element to `Root`:

```tsx
import * as Flapkit from 'flapkit'
import { mechanicalSound } from 'flapkit/sound'
import { riffle } from 'flapkit/motion/canvas/riffle'

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
framework-independent `SoundEngine` is exported from the same subpath
for custom integrations.

## API

Updates animate only cassettes whose resolved deck position changed. Motion
engines and looks tree-shake independently, and there is no runtime style
injection.

### Package subpaths

- `flapkit`
- `flapkit/sound`
- `flapkit/motion/css/cascade`
- `flapkit/motion/canvas/cascade`
- `flapkit/motion/canvas/riffle`
- `flapkit/flapkit.css`
- `flapkit/airport.css`
- `flapkit/industrial.css`

### Root

| Prop       | Type            | Default | Meaning                     |
| ---------- | --------------- | ------- | --------------------------- |
| `children` | `ReactNode`     | —       | Board or Grid               |
| `motion`   | `MotionAdapter` | —       | `riffle()` or `cascade()`   |
| `sound`    | `ReactElement`  | —       | `mechanicalSound({ bank })` |

### Board

| Prop               | Type                        | Default                  | Meaning                                   |
| ------------------ | --------------------------- | ------------------------ | ----------------------------------------- |
| `data-look`        | `'airport' \| 'industrial'` | —                        | Selects an imported look                  |
| `data-*`           | `string`                    | —                        | Forwarded to the styling host             |
| `className`        | `string`                    | —                        | Ordinary CSS and utilities                |
| `aria-label`       | `string`                    | Split-flap display board | Accessible name                           |
| `style`            | `CSSProperties`             | —                        | Native padding, row gap, and other styles |
| `grainOpacity`     | `number`                    | `0.32`                   | Frame grain overlay                       |
| `showColumnLabels` | `boolean`                   | `true`                   | Column labels under the header            |

### Grid

| Prop         | Type                        | Default                 | Meaning                         |
| ------------ | --------------------------- | ----------------------- | ------------------------------- |
| `data-look`  | `'airport' \| 'industrial'` | —                       | Selects an imported look        |
| `data-*`     | `string`                    | —                       | Forwarded to the styling host   |
| `className`  | `string`                    | —                       | Ordinary CSS and utilities      |
| `aria-label` | `string`                    | Split-flap display grid | Accessible name                 |
| `style`      | `CSSProperties`             | —                       | Native row gap and other styles |

### Header

| Prop                  | Type                       | Default | Meaning                 |
| --------------------- | -------------------------- | ------- | ----------------------- |
| `children`            | `ReactNode`                | —       | Board title. Board only |
| `className` / `style` | `string` / `CSSProperties` | —       | Title styling           |

### Row

| Prop          | Type      | Default            | Meaning                                 |
| ------------- | --------- | ------------------ | --------------------------------------- |
| `id`          | `string`  | generated          | Logical row ID; not animation identity  |
| `label`       | `string`  | —                  | Column label when the row is one region |
| `deck`        | `Deck`    | `alphanumericDeck` | Stops for every cassette in a flat row  |
| `variant`     | `Variant` | `white`            | `white`, `yellow`, or `orange`          |
| `highlighted` | `boolean` | `false`            | Lifted, brighter row                    |
| `className`   | `string`  | —                  | Inherits into glyphs                    |

### Group

| Prop        | Type      | Default            | Meaning                                   |
| ----------- | --------- | ------------------ | ----------------------------------------- |
| `id`        | `string`  | generated          | Logical region ID; not animation identity |
| `label`     | `string`  | —                  | Column label for this region              |
| `deck`      | `Deck`    | `alphanumericDeck` | Stops for every cassette in this group    |
| `variant`   | `Variant` | inherited          | Overrides the row variant                 |
| `className` | `string`  | —                  | Inherits into glyphs                      |

### Cell / WideCell

| Prop        | Type                      | Default   | Meaning                                                        |
| ----------- | ------------------------- | --------- | -------------------------------------------------------------- |
| `children`  | text or part declarations | —         | Displayed graphemes, or Face/Glyph/Retainer. WideCell uses two |
| `deck`      | `Deck`                    | inherited | Overrides the group or row deck                                |
| `className` | `string`                  | —         | Size and other cell-level styles                               |
| `style`     | `CSSProperties`           | —         | Native cell styles                                             |

### Face / Glyph / Retainer

All three accept `className` and `style`. `Glyph` additionally requires a string
or number as `children`. Parts are optional declarations inside Cell/WideCell,
not standalone rendered components. A part may appear at most once.

### createDeck

| Argument     | Type                   | Default     | Meaning                          |
| ------------ | ---------------------- | ----------- | -------------------------------- |
| `characters` | `string` or `string[]` | —           | Stops. Strings split by grapheme |
| `variants`   | `Variant[]`            | `['white']` | Repeats the stops per variant    |

### riffle / cascade / motion

| Option                | Type     | Default   | Meaning                                            |
| --------------------- | -------- | --------- | -------------------------------------------------- |
| `riffleMs`            | `number` | `36`      | Riffle pitch duration                              |
| `startSpreadMs`       | `number` | `480`     | Riffle start window across the board               |
| `pitchMs`             | `number` | `52`      | Cascade or custom pitch duration                   |
| `rowDelayMs`          | `number` | `150`     | Cascade delay between rows                         |
| `withinRowJitterMs`   | `number` | `16`      | Cascade start jitter inside a row                  |
| `cadenceVariationPct` | `number` | `4` / `6` | Per-cassette timing noise                          |
| `finalSettleMs`       | `number` | `260`     | Settle after the last pitch                        |
| `finalReboundDeg`     | `number` | `2`       | Deprecated compatibility no-op; fixed settle curve |

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

| Option    | Type        | Default | Meaning                          |
| --------- | ----------- | ------- | -------------------------------- |
| `bank`    | `SoundBank` | —       | clicks and settles URL lists     |
| `enabled` | `boolean`   | `true`  | Connect or disconnect the engine |
| `volume`  | `number`    | `0.58`  | Master level                     |

## Development

The root is the publishable package. `website/` is a private workspace that
consumes the public package subpaths. Its static composition and look previews
also use internal renderer APIs; those are not application-facing exports.

```sh
pnpm install
pnpm test
pnpm test:browser
pnpm check
pnpm build
pnpm build:website
pnpm dev
```

`pnpm test` covers the compiler, decks, motion, sound, and renderer entry-point
tree-shaking. `pnpm test:browser` exercises the public motion subpaths in Chromium,
including CSS/Canvas switching, composed cells, updates, geometry, and screenshots.

With the documentation server running, run the page-level regression checks:

```sh
pnpm test:docs
```

These check fixed navigation, static Composition/Looks previews, independent
Decks playback, code snippets, and mobile controls. The test runner defaults to
`http://localhost:5173`; set `FLAPKIT_DOCS_URL` for a different local server port.
The checks do not start a server.

## Release checks and compatibility

The current release is `0.1.0`, under the MIT license. It is not published
by the verification commands below.

- Runtime peers: React and React DOM 19.0 or later. The packaged consumer test
  exercises the workspace version and React 19.0.0 separately.
- Browser functional tests run in Chromium, Firefox and WebKit using the locked
  Playwright version. This is a current-engine test matrix, not a claim of support
  for every historical browser version or real iOS device.
- Node.js 22.18 or later is required for tooling. The package is ESM.
- Visible displays require JavaScript. Canvas styling limitations are described
  above; use CSS cascade when the face needs arbitrary CSS effects.

```sh
pnpm exec playwright install chromium firefox webkit
pnpm check:release
```

`test:browser` runs functional checks in all three engines. `test:visual` runs
Chromium screenshots separately, with platform-specific baselines. Linux CI is
fixed to Ubuntu 24.04. To intentionally update local baselines, run
`pnpm test:visual --update`, inspect every changed image, then rerun without
`--update`. Do not accept a new baseline merely because it makes a test green.
For Linux baselines, manually run the Release checks workflow with
`update_visuals` enabled and download its `visual-baselines` artifact. Review the
images before committing them, then require a normal Release checks run to pass;
the baseline-generation run does not validate a release.

`test:package` checks npm/pnpm export parity and the exact packed artifact's
export targets, development rendering and updates, TypeScript consumer, CSS
imports and production tree-shaking. `test:react-min` repeats that consumer test
with React 19.0.0 in a temporary installation.

Published exports always point to `dist`. Workspace aliases provide source hot
reload locally and never affect consumers. Build and verify before preparing a
release tarball with `pnpm pack`. Publication is a separate, explicit step;
prereleases use the `beta` dist-tag.

## Documentation deployment

The documentation is hosted at `https://cuvii.dev/flapkit/`. `pnpm deploy`
builds the package and Next.js static site, mounts its export under `/flapkit/`,
and deploys the dedicated Cloudflare Worker. The legacy `flapkit.cuvii.dev`
host redirects permanently, preserving paths and query parameters.

To verify a deployment, run:

```sh
FLAPKIT_SITE_ORIGIN=https://cuvii.dev pnpm test:subpath
```
