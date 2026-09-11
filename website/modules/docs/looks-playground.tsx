'use client'

import * as Flapkit from '@cuvii/flapkit'
import { looksSampleLines, type LooksTab } from './docs-code'

function EvaCell({ children }: { children: string }) {
  return (
    <Flapkit.Cell className="h-9 w-5 bg-[#34194f] bg-none">
      <Flapkit.Face className="bg-[#7846bb] bg-none" />
      <Flapkit.Glyph className="font-mono text-xl font-bold text-[#b6ff36]">
        {children}
      </Flapkit.Glyph>
      <Flapkit.Retainer className="bg-neutral-950 bg-none" />
    </Flapkit.Cell>
  )
}

export function LooksPlayground({ tab }: { tab: LooksTab }) {
  const look = tab === 'airport' ? 'airport' : 'industrial'
  const custom = tab === 'custom'
  const boardClass = custom ? `flapkit-${look} p-5 bg-[#512c86] bg-none` : `flapkit-${look}`

  return (
    <div className="grid size-full place-items-center">
      <Flapkit.Root motion={Flapkit.cascade()}>
        <Flapkit.Board aria-label="Flapkit by Cuvii" className={boardClass}>
          {looksSampleLines.map((line, row) => (
            <Flapkit.Row key={row} className={custom ? 'font-mono' : undefined}>
              {[...line].map((character, column) =>
                custom ? (
                  <EvaCell key={column}>{character}</EvaCell>
                ) : (
                  <Flapkit.Cell key={column}>{character}</Flapkit.Cell>
                ),
              )}
            </Flapkit.Row>
          ))}
        </Flapkit.Board>
      </Flapkit.Root>
    </div>
  )
}
