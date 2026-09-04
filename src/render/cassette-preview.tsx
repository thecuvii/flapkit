'use client'

import { useMemo, type ReactElement } from 'react'
import type { Deck } from '../deck'
import type { SplitFlapSource } from '../layout'
import { ScrubProvider } from '../motion/provider'
import { GridView } from './board'

export function CassettePreview({
  className,
  deck,
  final,
  fromIndex,
  mode,
  progress,
  sound,
}: {
  className?: string
  deck: Deck
  final?: boolean
  fromIndex: number
  mode: 'cascade' | 'riffle'
  progress: number
  sound?: ReactElement
}) {
  const source = useMemo<SplitFlapSource>(() => {
    const firstPosition = deck[0]
    if (!firstPosition) throw new Error('CassettePreview requires at least one deck position')

    return {
      columns: [{ cells: 1, flapDeck: deck, id: 'deck', label: '' }],
      rows: [
        {
          id: 'preview',
          values: {
            deck: { text: firstPosition.character, variant: firstPosition.variant },
          },
        },
      ],
    }
  }, [deck])

  return (
    <ScrubProvider
      final={final}
      fromIndex={fromIndex}
      mode={mode}
      progress={progress}
      source={source}
    >
      <GridView aria-label="Scrubbable split-flap cassette" className={className} />
      {sound}
    </ScrubProvider>
  )
}
