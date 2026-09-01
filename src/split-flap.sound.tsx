import { useEffect, useRef } from 'react'
import { useSplitFlapController } from './split-flap.context'
import {
  SplitFlapSoundEngine,
  type SplitFlapSoundBank,
  type SplitFlapSoundTuning,
} from './split-flap.sound-engine'

export type SplitFlapSoundProps = Partial<SplitFlapSoundTuning> & {
  bank: SplitFlapSoundBank
  enabled?: boolean
}

export function SplitFlapSound({
  bank,
  clickLevel,
  enabled = true,
  pitchVariation,
  settleLevel,
  stereoWidth,
  volume,
}: SplitFlapSoundProps) {
  const controller = useSplitFlapController()
  const engineRef = useRef<SplitFlapSoundEngine | null>(null)

  useEffect(() => {
    if (!enabled) return
    const engine = new SplitFlapSoundEngine({ bank })
    engineRef.current = engine
    engine.preload()
    const unlock = () => void engine.prepare()
    document.addEventListener('pointerdown', unlock, true)
    document.addEventListener('keydown', unlock, true)
    engine.connect(controller)
    return () => {
      document.removeEventListener('pointerdown', unlock, true)
      document.removeEventListener('keydown', unlock, true)
      engine.destroy()
      engineRef.current = null
    }
  }, [bank, controller, enabled])

  useEffect(
    () =>
      engineRef.current?.setTuning({
        clickLevel,
        pitchVariation,
        settleLevel,
        stereoWidth,
        volume,
      }),
    [clickLevel, pitchVariation, settleLevel, stereoWidth, volume],
  )
  return null
}
