# Flapkit product film

Industrial dark-gray background (`#303234`), with the board occupying about 89%
of the frame width. Output remains 1920×1080.

A single transition from a complete four-row departure display to the product
message. There are no intermediate values, repeated updates, or deck replacements.
The same multilingual deck stays mounted for the entire shot.

- 0–0.6s: readable initial departure values.
- 0.6s: one React state update sets the final four lines.
- Flapkit traverses its normal deck and settles each character naturally.
- Industrial is used for the entire film; there are no theme cuts.
- Approximately 5.7–7s: all final copy is readable.

The source takes retain the original timing; the edit accelerates motion 1.65x
while preserving the first 0.6s and extending the final still to make a 7s film.

The default rows now use near-full-width routes: PARIS-LONDON, TOKYO 東京→大阪,
SEOUL 서울→부산, and TAIPEI 臺北→香港, each with a time and weather emoji.
The fixed deck includes French, German and Spanish accented Latin letters alongside
Japanese, Korean and Traditional Chinese. The default values are illustrative routes,
not a live timetable. The final
copy is FLAPKIT BY CUVII / ZERO DEPENDENCIES / FULLY CUSTOMIZABLE / NOW OPEN SOURCE.

## Preview and export

Run `pnpm video:dev` for localhost:5188. The theme is fixed to Industrial. The display preloads its initial values before playback begins.

Run `pnpm video:check`, then `pnpm exec vite build --config video/vite.config.ts`.
Start the production server with
`pnpm exec vite preview --config video/vite.config.ts --port 5189`.
Then run `pnpm video:render` (requires Playwright Chromium and ffmpeg).

The Industrial take uses public motion parameters at quarter speed. Recording
40 seconds gives more real compositor samples, compressed back to a 10-second
60fps output. Image concat uses a 1ms timebase. No interpolated poses, controller
seeking or fake clocks are used. Initial-value preloading happens outside capture.

`edit.mjs` retimes the single Industrial take and adds the centered Menlo website
caption below the board. It can run separately without re-recording.

Output: `video/output/flapkit-continuous.mp4`. All generated output is ignored by
Git. The board, row, cassette, face openings and glyph metrics are shared across
themes. The white theme customizes CSS materials. React/React DOM are peer dependencies.

## Sound

The capture logs public SoundEngine mechanical events from the actual animation.
`native-sound.mjs` replays their retimed timestamps through Flapkit's own SoundEngine,
using the same click/settle bank as the docs. AudioWorklet records the native
compressor output against the AudioContext sample clock, preserving initial silence; there is no custom mixer or replacement synthesis.
`edit.mjs` muxes that recording into the video. Rerun `video:render` if motion changes.

## 4K delivery

With the production preview running on port 5189, run:

```sh
FLAPKIT_VIDEO_4K=1 pnpm video:render
```

This captures a native 3840×2160 viewport at 12× slower motion and encodes a
120fps intermediate before the final 60fps edit. The URL caption scales with
the frame. The final 7-second H.264 MP4 includes 48kHz stereo native sound
encoded at 320kbps AAC. Output is `video/output/4k/flapkit-continuous.mp4`;
1080p outputs remain in their existing directory.
