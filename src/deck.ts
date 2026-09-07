export const splitFlapVariants = ['white', 'yellow', 'orange'] as const

export type Variant = (typeof splitFlapVariants)[number] | (string & {})
export type Sequence = 'alphanumeric' | 'numeric' | 'punctuation'
export type Position = {
  character: string
  variant: Variant
}
export type Deck = readonly Position[]

export const splitFlapCharacters = Array.from(' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-./:')
export const splitFlapNumericCharacters = Array.from(' 0123456789')
export const splitFlapPunctuationCharacters = Array.from(' :./-')

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** Splits text into displayable characters without breaking emoji or combining marks. */
export function splitFlapGraphemes(value: string) {
  return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment)
}

export function normalizeDeckCharacter(text: string) {
  const graphemes = splitFlapGraphemes(text)
  if (graphemes.length === 0) return ' '
  return graphemes
    .map((grapheme) => (/^[a-z]$/.test(grapheme) ? grapheme.toUpperCase() : grapheme))
    .join('')
}

export function createDeck(
  characters: string | readonly string[],
  variants: readonly Variant[] = ['white'],
): Deck {
  const normalizedCharacters = (
    typeof characters === 'string' ? splitFlapGraphemes(characters) : characters
  ).map(normalizeDeckCharacter)

  return variants.flatMap((variant, variantIndex) =>
    normalizedCharacters
      .filter((character) => variantIndex === 0 || character.trim() !== '')
      .map((character) => ({ character, variant })),
  )
}
