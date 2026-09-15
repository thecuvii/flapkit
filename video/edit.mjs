import { spawnSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { START_AT } from './timeline.ts'

const output = fileURLToPath(new URL('./output/', import.meta.url))
const PLAYBACK_SPEED = 1.65
const OUTPUT_DURATION = 7
const themes = ['industrial']
const cuts = [[0, OUTPUT_DURATION, 'industrial']]
const filters = [
  `[0:v]setpts='if(lt(T,${START_AT}),PTS,(${START_AT}+(T-${START_AT})/${PLAYBACK_SPEED})/TB)',fps=60,tpad=stop_mode=clone:stop_duration=4,trim=duration=${OUTPUT_DURATION}[film]`,
]
const website = 'cuvii.dev/flapkit'
const tracking = 22
const websiteWidth = (website.length - 1) * tracking + 18
const websiteType = [...website].map((letter, index) =>
  `drawtext=fontfile='/System/Library/Fonts/Menlo.ttc':text='${letter}':fontcolor=0xc4c8c1:fontsize=30:x=(w-${websiteWidth})/2+${index * tracking}:y=923:y_align=baseline`,
).join(',')
filters.push(`[film]${websiteType}[out]`)
const file = `${output}/flapkit-continuous.mp4`
await import('./native-sound.mjs')
const result = spawnSync('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  ...themes.flatMap((theme) => ['-i', `${output}/flapkit-${theme}.mp4`]),
  '-i', `${output}/native-sound.wav`,
  '-filter_complex', filters.join(';'), '-map', '[out]', '-map', '1:a:0',
  '-c:a', 'aac', '-b:a', '192k', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file,
], { encoding: 'utf8' })
assert.equal(result.status, 0, result.stderr)
await writeFile(`${output}/edit-timeline.json`, JSON.stringify({ duration: OUTPUT_DURATION, playbackSpeed: PLAYBACK_SPEED, cuts }, null, 2))
console.log(`Edited film: ${file}`)
