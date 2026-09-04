'use client'

import * as Flapkit from '@thecuvii/flapkit'
import { useState, type CSSProperties } from 'react'
import { CassettePreview } from '../../src/render/cassette-preview'
import { SiteFrame } from './site-chrome'

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

export function LabPage() {
  const [progress, setProgress] = useState(0.28)
  const degrees = Math.round(vaneAngle(progress))

  return (
    <SiteFrame>
      <main className="lab-page">
        <header className="lab-header">
          <a href="/">← Docs</a>
          <span>One cassette · one pitch</span>
        </header>
        <div className="lab-stage">
          <CassettePreview
            className="flapkit-airport lab-cassette"
            deck={labDeck}
            fromIndex={0}
            mode="cascade"
            progress={progress}
            final
          />
        </div>
        <div className="lab-scrubber">
          <label htmlFor="lab-pitch-progress">Pitch</label>
          <output>
            {degrees}° / {progress.toFixed(2)}
          </output>
          <input
            id="lab-pitch-progress"
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
