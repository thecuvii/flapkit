import { createDeck, type Variant } from 'flapkit'

export const DURATION = 10
export const COLUMNS = 20
export const MESSAGE_AT = 6.1
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const split = (value: string) => Array.from(segmenter.segment(value), (part) => part.segment)
const padded = (value: string, size: number) => {
  const characters = split(value)
  if (characters.length > size) throw new Error(`Field too long: ${value}`)
  return [...characters, ...Array<string>(size - characters.length).fill(' ')]
}
export const finalRows = [
  'FLAPKIT BY CUVII',
  'ZERO DEPENDENCIES',
  'FULLY CUSTOMIZABLE',
  'NOW OPEN SOURCE',
].map((line) => [' ', ...padded(line, COLUMNS - 2), ' '])

// One multilingual drum: Latin with French/German/Spanish accents, Japanese,
// Korean, Traditional Chinese, numbers and weather emoji. No repeated stops.
const characters = [...new Set(split(' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-./:→ÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸÄÖẞÑÁÍÓÚ東京大阪서울부산臺北香港☀️🌤️☁️🌧️'))]
// Colored positions are physical stops in the same drum, not a CSS tint.
export const deck = characters.flatMap((character) => createDeck([character], [
  'white',
  ...('FLAPKIT'.includes(character) ? ['orange'] : []),
  ...('ZEROOPEN'.includes(character) ? ['yellow'] : []),
]))
export const finalVariants: Variant[][] = finalRows.map((row, rowIndex) =>
  row.map((_, column) => {
    if (rowIndex === 0 && column >= 1 && column <= 7) return 'orange'
    if (rowIndex === 1 && column >= 1 && column <= 4) return 'yellow'
    if (rowIndex === 3 && column >= 5 && column <= 8) return 'yellow'
    return 'white'
  }),
)
export const initialRows = [
  'PARIS-LONDON 10:15 ☁️',
  'TOKYO 東京→大阪 11:20 ☀️',
  'SEOUL 서울→부산 12:30 🌤️',
  'TAIPEI 臺北→香港 14:20 🌧️',
].map((line) => padded(line, COLUMNS))
export const START_AT = 0.6
const distances = initialRows.flat().map((glyph, i) => {
  const start = deck.findIndex((p) => p.character === glyph && p.variant === 'white')
  const end = deck.findIndex((p) => p.character === finalRows.flat()[i] && p.variant === finalVariants.flat()[i])
  if (start < 0 || end < 0) throw new Error(`Missing deck glyph at cell ${i}`)
  return (end - start + deck.length) % deck.length
})
// Longest traversal finishes around 9s, leaving a readable final hold.
export const PITCH_MS = (9000 - START_AT * 1000 - 540 - 280) / (Math.max(...distances) - 1)
export const columns = Array.from({ length: COLUMNS }, (_, index) => ({ id: `column-${index}`, index }))
