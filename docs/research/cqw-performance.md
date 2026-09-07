# `cqw` performance in flapkit

Research date: 2026-09-02. The accompanying production change removes redundant canvas geometry measurement; it intentionally keeps the existing `cqw` model.

## Executive conclusion

`cqw` is a **container-relative length unit**, not a container-query selector. flapkit does not use `@container`; it uses `container-type: inline-size` to create size-query containers and then uses many `cqw` values to scale geometry. A stable-size board does not continuously re-evaluate those values merely because declarations exist. When a relevant container's **layout content-box width changes**, dependent computed values must change; engines track that dependency and may recalculate descendant style, followed by layout and/or paint according to the affected properties. A `transform` animation changes visual rendering, not the container's layout size, so it does not by itself change `cqw` or trigger container-size invalidation.

The declaration count is therefore not a useful standalone risk metric. The useful variables are the number of **rendered elements whose computed styles depend on container units**, how many relevant containers resize, resize frequency, and whether each dependent property affects layout, paint, or only compositing. flapkit's normal pitch animation keeps its query containers fixed and mainly animates transforms. A pathological resize benchmark confirms that `cqw` becomes costly when the query container really changes size, but that is not the package's normal update path.

## Confirmed facts

### Selectors/conditions and units are different mechanisms

- An `@container` rule is a conditional group rule: declarations inside it are filtered according to a selected ancestor container and a boolean condition ([CSS Conditional 5 §5.4](https://drafts.csswg.org/css-conditional-5/#container-rule)). Crossing a condition threshold can change which rules apply.
- `cqw` is simply a `<length>` equal to 1% of a selected query container's width ([CSS Conditional 5 §7](https://drafts.csswg.org/css-conditional-5/#container-lengths)). It can occur in ordinary declarations without any `@container` rule. For each axis the nearest eligible ancestor is selected; without one, the small viewport size is used.
- The distinction matters here: a repository search finds no `@container` rule in package source. There are no breakpoint selectors to re-match. There are many ordinary property values containing `cqw`, whose used/computed values depend on an ancestor width.

### What `container-type: inline-size` establishes

`container-type: inline-size` establishes a size-query container on the element's inline axis, applies **style containment** and **inline-size containment**, and establishes an independent formatting context ([CSS Conditional 5 §5.1](https://drafts.csswg.org/css-conditional-5/#container-type)). It does **not**, in the current specification, apply full layout containment. The spec change log explicitly records that dimensional query containers no longer apply layout containment ([change for CSSWG issue 10544](https://github.com/w3c/csswg-drafts/pull/10544)).

Inline-size containment means inline-axis intrinsic sizes are calculated as if the element had no content, while its content can still affect block-axis intrinsic size and can indirectly affect inline size in documented edge cases ([CSS Containment 3 §3.1](https://drafts.csswg.org/css-contain-3/#inline-size-containment)). Style containment scopes effects such as counters and quotes; it is not a blanket promise that all descendant style recalculation stops at the boundary ([CSS Containment 2 §3.4](https://drafts.csswg.org/css-contain-2/#style-containment)).

### What invalidates when size changes

The standard requires computed-value changes caused by container query units to participate in a style change event ([CSS Conditional 5 §5.5](https://drafts.csswg.org/css-conditional-5/#animated-containers)). The Web Platform Tests directly exercise unit invalidation after changing a container size, including ordinary lengths and gradients ([`container-units-invalidation.html`](https://github.com/web-platform-tests/wpt/blob/master/css/css-conditional/container-queries/container-units-invalidation.html), [`container-units-gradient-invalidation.html`](https://github.com/web-platform-tests/wpt/blob/master/css/css-conditional/container-queries/container-units-gradient-invalidation.html)). These are correctness tests, not performance benchmarks.

Blink's implementation makes the dependency explicit. During container-size processing, `StyleEngine` calls `ContainerQueryEvaluator::ContainerChanged`; depending on the returned dependency scope it forces recalculation for the nearest-container subtree or descendant containers, then rebuilds affected layout-tree portions if required ([Blink `style_engine.cc`, container recalc path](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/core/css/style_engine.cc)). Blink's general invalidation documentation explains that invalidation marks the subset needing recalculation and recalculation is deferred until style is needed ([Blink style invalidation overview](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/css/style-invalidation.md)).

After style values are refreshed, downstream cost depends on the property:

- `width`, `font-size`, margins, gaps, insets, line height, and similar geometry can require layout.
- backgrounds, shadows, clipping, filters, and text shadows commonly require paint/raster work.
- a changed transform normally avoids layout, but if its numeric transform depends on a resized container it still needs the new value and may need property-tree/compositor synchronization.

The specifications define results, not an exact invalidation algorithm or complexity bound. Browser implementation strategies can differ.

### Does the number of `cqw` declarations matter?

**Confirmed:** neither CSS specification assigns cost proportional to the textual count of `cqw` tokens. Blink invalidates by tracked element/container dependencies, not by repeatedly scanning every stylesheet declaration on each frame (the source paths above and the dependency-oriented WPTs are evidence of that architecture).

**Qualified inference:** more distinct `cqw` declarations can increase initial parsing/style construction and the work required to recompute one affected element, especially for complex gradients/shadow lists. But duplicating one declaration across a stylesheet is not equivalent to multiplying runtime resize work; the dominant multiplier is how many element styles instantiate it and what those properties cause next. There is no vendor-published constant-cost model, so “N declarations cost X ms” is unsupported.

### Container resize versus transform-only animation

CSS transforms affect visual rendering but do not affect CSS layout (apart from overflow and containing-block effects) ([CSS Transforms 1 §3](https://drafts.csswg.org/css-transforms/#transform-rendering)). Therefore:

- Animating the container's `width`, changing grid/flex allocation, resizing the viewport/host, or otherwise changing its layout content-box width changes `1cqw`; dependent descendants become candidates for style update and then layout/paint as appropriate.
- Animating only `transform: scale(...)`, `translate(...)`, or `rotate(...)` does not change the layout content-box width used by `cqw`. It should not cause container-unit invalidation. The already-resolved geometry is transformed visually.
- A descendant animation whose transform keyframes themselves contain `cqw` (as flapkit has) resolves those lengths against a stable container. That is distinct from resizing the container. Whether a particular animation runs fully on the compositor is an engine decision and must be traced; “transform” is not by itself proof of compositor execution when custom properties, 3D content, filters, raster invalidations, or main-thread lifecycle work are involved.

## How this maps to flapkit

### Containers and CSS geometry

In `src/split-flap.styles.ts`, `boardContent` and `standaloneGrid` have `containerType: 'inline-size'`. Each `departureGroupScaleContext` also has it. Descendant geometry uses `cqw` broadly for gaps, perspective, fonts/line-height, widths, insets, radii, transforms, gradients, shadows, clipping and filters. `src/split-flap.cassette.tsx` additionally builds per-cell inline styles and custom properties containing `cqw` (glyph width, material geometry, shadows, backgrounds and transforms).

The nearest-container rule means group descendants generally resolve against `departureGroupScaleContext`, not necessarily the board container. Board-level descendants outside a group use the board/standalone container.

The current built-in looks give every group scale context an explicit fixed reference width of `11 × cellTrack`: 226.38 px for both Airport and Industrial (`cellTrack: 20.58px`). The board itself is `max-content`. In a live 500-cassette Airport board, each measured group context was 226.375 px before and after changing the viewport from its default width to 800 px. Therefore ordinary host/viewport resizing does **not currently resize the nearest container used by cassette `cqw` values**; the board overflows or is externally transformed instead. Changing the look's track geometry would resize it.

### Motion architecture

`src/split-flap.runtime.ts` has two materially different render paths:

- Cascade mounts a capped set of CSS 3D cassettes (`maximumConcurrentCassettes`, default 32) and drives Web Animations transform keyframes. Several translation values use `cqw`; the vane rotation is transform-only. With fixed container widths this does not constitute container resize.
- Riffle uses a canvas renderer. `src/split-flap.canvas.tsx` measures each scale context with `getBoundingClientRect()`, derives `unit = scaleRectangle.width / 100`, caches cassette geometry, observes resize via `ResizeObserver`, and draws frames to canvas. It therefore emulates the same container-width unit numerically for animated drawing while static DOM still carries the CSS appearance.

On resize, the canvas path performs DOM geometry reads for cassettes and rebuilds canvases/geometry in addition to the browser's CSS `cqw` response. That measurement loop is likely more important than declaration count and should be isolated in traces. On normal target updates at fixed size, the runtime's own `requestAnimationFrame` loop, canvas operations, glyph atlas/raster work, active CSS cassette count, and React changes are the likely costs.

### Existing performance page and captured traces

`website/src/performance-page.tsx` tests 96–1,000 cassettes and compares riffle/canvas with cascade/CSS 3D. It records React Profiler duration, input-to-commit, requestAnimationFrame intervals, and rendered cassette count. It does **not** resize a query container or vary/remove container units, so its FPS result cannot by itself attribute cost to `cqw`.

One warm production run was captured in Headless Chrome 152 on the orb for each 500-cassette renderer, plus a 1.8 s idle control. These are diagnostic traces, not statistically sufficient release benchmarks:

| Case                | Style recalculation |       Layout |            Paint | Result                                                                                                   |
| ------------------- | ------------------: | -----------: | ---------------: | -------------------------------------------------------------------------------------------------------- |
| Idle, 500 cassettes |     0 events / 0 ms |     0 / 0 ms |         0 / 0 ms | Stable `cqw` declarations caused no recurring lifecycle work                                             |
| Riffle update       |       17 / 232.6 ms | 16 / 50.2 ms |    995 / 55.0 ms | Large update/measurement cost exists, but the trace does not attribute it to container-unit invalidation |
| Cascade update      |       26 / 215.8 ms | 24 / 91.1 ms | 1,557 / 158.0 ms | Animation lifecycle and rendering are expensive at this scale; container widths stayed fixed             |

Riffle also made 6,030 forced style/layout update calls (186.7 ms nested total) while its canvas geometry path reads computed styles and rectangles. This is a stronger optimization lead than the textual `cqw` count. The durations above are trace-event totals and can include nested work, so they must not be added together as wall-clock time.

### Optimization outcome

Instrumentation around `Element.prototype.getBoundingClientRect()` confirmed that one ordinary 500-cassette Riffle target update performed exactly 4,002 geometry reads. Each full measurement reads the canvas once and four rectangles per cassette, so the update was running two complete passes: `2 × (1 + 500 × 4)`.

The measurement effect previously depended on fresh `layout.cells` and `layout.rows` arrays. Target changes recreate those arrays even though they do not change cassette topology, dimensions, decks, highlighting, or material. The fix gives static cell visuals a semantic key and keeps the measurement effect stable while only target characters change. The current layout remains available through a ref when a legitimate measurement occurs.

In the rebuilt production site, the same 500-cassette target update now performs **zero geometry reads**. Controls confirm that invalidation still works:

- switching topology to 200 cassettes performs 1,602 reads, two complete initialization passes;
- changing the measured canvas parent's actual width performs 801 reads, one complete 200-cassette pass;
- resizing only the viewport performs zero reads because the fixed-width group container and canvas parent do not change layout size.

These counts verify removal of redundant measurement, not a statistically stable FPS improvement. A post-change visual check confirmed that the 200-cassette Riffle result remained populated, legible, aligned, and free of blank/displaced faces after an update.

### Synthetic resize control

A controlled DOM probe instantiated 500 descendants with ten representative geometry/paint declarations. Nine alternating runs compared `cqw` with equivalent starting-width `px` values:

| Operation                                  | `cqw` median | `px` median |
| ------------------------------------------ | -----------: | ----------: |
| Initial mount + forced layout              |       4.5 ms |      3.3 ms |
| 30 container-width changes + forced layout |     121.0 ms |     10.0 ms |
| 30 transform changes, stable layout width  |       0.3 ms |      0.2 ms |

This establishes the expected boundary: frequent **layout width** changes with many dependent descendants can make `cqw` roughly an order of magnitude more expensive in this deliberately forced scenario; stable-width transforms do not show a meaningful difference. It does not predict Flapkit update FPS because the production board does not perform those width changes.

## Hypotheses to test (not established facts)

1. The pre-fix target traces contained substantial style/layout work at 500 cassettes. Geometry instrumentation identified one concrete cause and removed it; fresh post-fix traces are still needed to quantify the remaining runtime and CSS 3D costs.
2. Continuous group layout-width animation would be expensive because many cassette descendants use layout- and paint-affecting `cqw` values, and because canvas mode also remeasures geometry through `ResizeObserver`.
3. Transform-scaling the board will be substantially cheaper than width animation, but raster quality/memory and layer promotion may change, especially for large boards.
4. Reducing complex `cqw`-bearing gradient/shadow declarations may reduce paint/style work during resize, but replacing all `cqw` tokens with one inherited custom property may not help: inherited custom-property changes can themselves broaden style invalidation. Measure rather than assume.

## Recommendations

1. **Keep `cqw` in the current implementation.** There is direct idle evidence that the token count alone creates no recurring lifecycle work while the fixed group containers are stable. Replacing it wholesale would add complexity without addressing the measured update bottlenecks.
2. **Do not animate board/group layout width for pitch motion.** Keep pitch motion transform-based. If a product needs zoom, prefer a transform on a stable-sized wrapper when visual scaling (rather than responsive reflow) is acceptable.
3. **Do not remove `container-type: inline-size` as a speculative optimization.** It defines flapkit's scaling reference and prevents direct content-to-inline-size feedback. Any replacement needs visual, sizing and performance comparison.
4. **Keep Riffle geometry invalidation semantic.** Ordinary target changes now avoid all geometry reads. Preserve measurement for topology, material/highlight, font, observed style, and actual size changes; add a regression benchmark if this path is changed again.
5. **Benchmark true resize separately from target updates.** If a future responsive API makes group reference widths fluid, add resize traces before shipping it.
6. **Use traces before changing CSS.** Optimize the stage that is measured: style/layout dependency fan-out, paint/raster effects, canvas measurement/drawing, or React—not the raw count of declarations.

## Reproducible measurement plan

Use a production website build in a fresh browser profile, fixed DPR/window, no DevTools screenshots, and at least 20 recorded runs per case after warm-up. Test 96, 500 and 1,000 cassettes in both renderer modes.

Create benchmark-only variants (not package production changes):

1. **Stable baseline:** target update, no container resize.
2. **Layout resize:** animate/set stage width through the same pixel range for 1.5 s.
3. **Transform-only:** keep layout width fixed and animate a wrapper's `transform: scaleX(...)` through visually equivalent endpoints.
4. **Unit control:** benchmark-only generated style with representative `cqw` values replaced by resolved `px` at the starting width; do not use it to judge visual responsiveness.
5. **Declaration-density control:** preserve the same element count and resized containers, but progressively remove complex paint-only `cqw` effects, then layout-affecting ones. This distinguishes token/declaration complexity from dependent-element and pipeline-stage cost.

Record Chrome Perfetto/DevTools Performance traces with `blink`, `devtools.timeline`, compositor and rendering categories. Report medians and p95 for `UpdateLayoutTree`/style recalculation, layout, pre-paint, paint/raster, scripting, frame intervals, and long frames. Inspect invalidation tracking for the resized container and layer/compositor status for transform-only runs. Add `performance.mark()` at resize/animation start and end. Save raw trace files with browser version, OS, DPR, board size and mode so results are reproducible. Repeat representative cases in Safari Web Inspector and Firefox Profiler because invalidation/compositing policy is implementation-specific.

For the canvas case, additionally count `ResizeObserver` callbacks, geometry-measure duration, calls to `getBoundingClientRect()`, canvas frame count and draw operations (the controller already exposes canvas counters). For the CSS case, record active CSS cassettes and whether transform animations remain compositor-driven.

## Uncertainty and evidence limits

Only one measured trace per production update case and nine synthetic runs were captured, all in Headless Chrome 152 on one Linux orb. They identify mechanisms and optimization leads, not cross-browser rankings or stable release numbers. WPT establishes correctness on invalidation, not cost. Blink source confirms a current dependency/invalidation strategy but does not guarantee identical behavior in WebKit/Gecko or future Chromium. Compositor eligibility of flapkit's exact 3D/custom-property animation still needs a layer-focused trace. The current CSS Conditional Level 5 text is a Working Draft and notably changed in 2024–2026 regarding implied layout containment; older articles and browser versions may describe the former model.

## Primary references

- [CSS Conditional Rules Level 5: container queries, `container-type`, animated containers, and container-relative units](https://drafts.csswg.org/css-conditional-5/)
- [CSS Containment Level 3: inline-size containment](https://drafts.csswg.org/css-contain-3/#inline-size-containment)
- [CSS Containment Level 2: containment semantics and optimization boundaries](https://drafts.csswg.org/css-contain-2/)
- [CSS Transforms Level 1: transforms and layout](https://drafts.csswg.org/css-transforms/#transform-rendering)
- [Blink style invalidation design note](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/css/style-invalidation.md)
- [Blink `StyleEngine` source](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/core/css/style_engine.cc)
- [WPT container-query tests](https://github.com/web-platform-tests/wpt/tree/master/css/css-conditional/container-queries)
