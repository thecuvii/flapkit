import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Board, Cell, Face, Glyph, Group, Retainer, Root, Row } from 'flapkit'
import { mechanicalSound, SoundEngine, type MechanicalEvent } from 'flapkit/sound'
import clickUrl from '../website/public/audio/click.wav?url'
import settleUrl from '../website/public/audio/settle.wav?url'
import { cascade } from 'flapkit/motion/css/cascade'
import {
  DURATION,
  PITCH_MS,
  columns,
  finalRows,
  finalVariants,
  initialRows,
  deck,
  START_AT,
} from './timeline'
import 'flapkit/flapkit.css'
import 'flapkit/airport.css'
import 'flapkit/industrial.css'
import './style.css'

const captureParams = new URLSearchParams(location.search)
const captureRate = captureParams.has('capture') ? Number(captureParams.get('rate') ?? 4) : 1
// Capture the public sound-engine events; mix native-speed samples after retiming.
if (captureRate > 1) {
  window.NativeSoundEngine = SoundEngine
  window.nativeSoundSchedule = SoundEngine.prototype.schedule
  SoundEngine.prototype.schedule = function (events: readonly MechanicalEvent[]) {
    window.filmAudioEvents?.push(...events)
  }
}
const soundBank = { clicks: [clickUrl], settles: [settleUrl] }
if (captureRate > 1) window.nativeSoundBank = soundBank
const preloadAdapter = cascade({
  pitchMs: 20,
  finalSettleMs: 20,
  rowDelayMs: 0,
  withinRowJitterMs: 0,
  cadenceVariationPct: 0,
})
const adapter = cascade({
  pitchMs: PITCH_MS * captureRate,
  rowDelayMs: 180 * captureRate,
  withinRowJitterMs: 35 * captureRate,
  cadenceVariationPct: 0,
  finalSettleMs: 280 * captureRate,
})
type FilmAPI = { play: () => void; duration: number }
declare global {
  interface Window {
    flapkitFilm?: FilmAPI
    filmAudioEvents?: MechanicalEvent[]
    nativeSoundSchedule?: SoundEngine['schedule']
    NativeSoundEngine?: typeof SoundEngine
    nativeSoundBank?: { clicks: string[]; settles: string[] }
  }
}

function Film() {
  const [started, setStarted] = useState(false)
  const rows = started ? finalRows : initialRows
  const theme = 'industrial'
  const prepareSound = useRef<(() => Promise<boolean>) | null>(null)
  const stageRef = useRef<HTMLElement>(null)
  useEffect(() => {
    let disposed = false
    let playing = false
    const stage = stageRef.current!
    let startTimer: ReturnType<typeof setTimeout> | undefined
    const play = () => {
      if (playing || disposed) return
      playing = true
      if (captureRate === 1) void prepareSound.current?.()
      // Updating ordinary React children is the only animation trigger.
      startTimer = setTimeout(() => setStarted(true), START_AT * 1000 * captureRate)
    }
    void (async () => {
      await document.fonts.ready
      for (let index = 0; index < 6; index++) await new Promise(requestAnimationFrame)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      if (disposed) return
      window.flapkitFilm = { play, duration: DURATION }
      stage.dataset.ready = 'true'
      if (!new URLSearchParams(location.search).has('capture')) play()
    })()
    return () => {
      disposed = true
      clearTimeout(startTimer)
      delete window.flapkitFilm
    }
  }, [])
  return (
    <main
      ref={stageRef}
      data-playing={started ? 'true' : 'false'}
      className="film-stage"
      aria-label="Flapkit product film"
    >
      <div className="film-object">
        <Root
          motion={started ? adapter : preloadAdapter}
          sound={mechanicalSound({
            bank: soundBank,
            prepareRef: prepareSound,
            volume: started ? 0.58 : 0,
          })}
        >
          <Board
            className="film-board"
            data-look={theme === 'industrial' ? 'industrial' : 'airport'}
            data-theme={theme}
            showColumnLabels={false}
            aria-label="Four-row customizable split-flap display"
          >
            {rows.map((row, rowIndex) => (
              <Row key={`row-${rowIndex}`} id={`row-${rowIndex}`}>
                {columns.map((column) => (
                  <Group
                    key={column.id}
                    id={column.id}
                    variant={started ? finalVariants[rowIndex]![column.index] : 'white'}
                  >
                    <Cell deck={deck} className="film-cell" style={{ width: 54, height: 78 }}>
                      <Face className="film-face" />
                      <Glyph className="film-glyph">{row[column.index]!}</Glyph>
                      <Retainer className="film-retainer" />
                    </Cell>
                  </Group>
                ))}
              </Row>
            ))}
          </Board>
        </Root>
        {!new URLSearchParams(location.search).has('capture') && (
          <a className="film-url" href="https://cuvii.dev/flapkit">
            cuvii.dev/flapkit
          </a>
        )}
      </div>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Film />)
