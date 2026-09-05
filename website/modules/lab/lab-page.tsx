'use client'

import * as Flapkit from '@thecuvii/flapkit'
import { useState, type CSSProperties } from 'react'
import { cn } from 'cn'
import { CassettePreview } from '../../../src/render/cassette-preview'
import { SiteFrame } from '../site'

const labDeck = Flapkit.createDeck('IJ')

function vaneAngle(progress: number) {
  const stops = [
    [0, 0],
    [0.34, 55],
    [0.5, 90],
    [0.62, 125],
    [0.78, 180],
    [1, 180],
  ] as const
  const next = stops.findIndex((stop) => progress <= stop[0])
  const end = stops[next === -1 ? stops.length - 1 : next]!
  const start = stops[Math.max(0, (next === -1 ? stops.length : next) - 1)]!
  if (end[0] === start[0]) return end[1]
  const t = (progress - start[0]) / (end[0] - start[0])
  return start[1] + (end[1] - start[1]) * t
}

const metaType = 'text-[10px] font-[650] tracking-[0.08em] text-muted uppercase'
const headerType = 'font-sans text-[13px] font-[650] leading-[1.2]'

export function LabPage() {
  const [progress, setProgress] = useState(0.28)
  const degrees = Math.round(vaneAngle(progress))

  return (
    <SiteFrame>
      <main className="grid min-h-dvh justify-items-center gap-7 px-[var(--gutter)] pt-u pb-[calc(var(--spacing-u)*1.25)]">
        <header className="flex w-[min(100%,36rem)] items-baseline justify-between gap-6">
          <a className={cn(headerType, 'hover:text-muted')} href="/">
            ← Docs
          </a>
          <span className={cn(headerType, 'text-faint')}>One cassette · one pitch</span>
        </header>
        <div className="grid min-h-88 w-[min(100%,22rem)] place-items-center">
          <CassettePreview
            className="flapkit-airport lab-cassette"
            deck={labDeck}
            fromIndex={0}
            mode="cascade"
            progress={progress}
            final
          />
        </div>
        <div className="lab-scrubber grid w-[min(100%,36rem)] grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5">
          <label className={metaType} htmlFor="lab-pitch-progress">
            Pitch
          </label>
          <output className={cn(metaType, 'justify-self-end')}>
            {degrees}° / {progress.toFixed(2)}
          </output>
          <input
            id="lab-pitch-progress"
            className="col-span-full"
            type="range"
            min="0"
            max="1000"
            value={Math.round(progress * 1000)}
            style={{ '--fill': `${progress * 100}%` } as CSSProperties}
            onChange={(event) => setProgress(Number(event.currentTarget.value) / 1000)}
          />
        </div>
      </main>
    </SiteFrame>
  )
}
