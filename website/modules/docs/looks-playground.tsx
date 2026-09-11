'use client'

import * as Flapkit from '@cuvii/flapkit'
import { cascade } from '@cuvii/flapkit/motion/css/cascade'
import { compileFlapkitBoard } from '../../../src/compiler'
import { MotionProvider } from '../../../src/motion/provider'
import { BoardView } from '../../../src/render/board'
import { looksSampleLines, type LooksTab } from './docs-code'

export function LooksPlayground({ tab }: { tab: LooksTab }) {
  const look = tab === 'airport' ? 'airport' : 'industrial'
  const custom = tab === 'custom'
  const boardClass = custom ? `flapkit-${look} p-5 bg-[#512c86] bg-none` : `flapkit-${look}`

  const compiled = compileFlapkitBoard(
    <Flapkit.Board aria-label="Flapkit by Cuvii" className={boardClass}>
      {looksSampleLines.map((line, row) => (
        <Flapkit.Row key={row} className={custom ? 'font-mono' : undefined}>
          {[...line].map((character, column) =>
            custom ? (
              <Flapkit.Cell key={column} className="h-9 w-5 bg-[#34194f] bg-none">
                <Flapkit.Face className="bg-[#7846bb] bg-none" />
                <Flapkit.Glyph className="font-mono text-xl font-bold text-[#b6ff36]">
                  {character}
                </Flapkit.Glyph>
                <Flapkit.Retainer className="bg-neutral-950 bg-none" />
              </Flapkit.Cell>
            ) : (
              <Flapkit.Cell key={column}>{character}</Flapkit.Cell>
            ),
          )}
        </Flapkit.Row>
      ))}
    </Flapkit.Board>,
  )

  return (
    <div className="grid size-full place-items-center">
      <MotionProvider
        adapter={cascade()}
        source={compiled.source}
        presentation={compiled.presentation}
        reduceMotion
      >
        <BoardView {...compiled.boardProps} />
      </MotionProvider>
    </div>
  )
}
