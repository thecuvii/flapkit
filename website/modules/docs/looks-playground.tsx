'use client'

import * as Flapkit from '@cuvii/flapkit'
import { looksSampleLines, type LooksTab } from './docs-code'

export function LooksPlayground({ tab }: { tab: LooksTab }) {
  const look = tab === 'airport' ? 'airport' : 'industrial'
  const custom = tab === 'custom'
  const boardClass = custom ? `flapkit-${look} operations-board` : `flapkit-${look}`

  return (
    <div className="grid size-full place-items-center">
      <Flapkit.Root motion={Flapkit.cascade()}>
        <Flapkit.Board aria-label="Flapkit by Cuvii" className={boardClass}>
          {looksSampleLines.map((line, row) => (
            <Flapkit.Row key={row} className={custom ? 'font-mono' : undefined}>
              {[...line].map((character, column) => (
                <Flapkit.Cell key={column} className={custom ? 'text-xl font-bold' : undefined}>
                  {character}
                </Flapkit.Cell>
              ))}
            </Flapkit.Row>
          ))}
        </Flapkit.Board>
      </Flapkit.Root>
    </div>
  )
}
