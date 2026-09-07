// React bridge between Root and the framework-independent sound engine.
import { useEffect, useRef, type RefObject } from 'react'
import { useSplitFlapController } from '../motion/provider'
import { SplitFlapSoundEngine, type SplitFlapSoundBank, type SplitFlapSoundTuning } from './engine'

export type SplitFlapSoundProps = Partial<SplitFlapSoundTuning> & {
  bank: SplitFlapSoundBank
  enabled?: boolean
  prepareRef?: RefObject<(() => Promise<boolean>) | null>
}

export function SplitFlapSound({
  bank,
  clickLevel,
  enabled = true,
  pitchVariation,
  prepareRef,
  settleLevel,
  stereoWidth,
  volume,
}: SplitFlapSoundProps) {
  const controller = useSplitFlapController()
  const engineRef = useRef<SplitFlapSoundEngine | null>(null)
  const bankKey = `${bank.clicks.join('\u0000')}\u0001${bank.settles.join('\u0000')}`

  useEffect(() => {
    if (!enabled) return
    const engine = new SplitFlapSoundEngine({ bank })
    engineRef.current = engine
    if (prepareRef) prepareRef.current = () => engine.prepare()
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
      if (prepareRef) prepareRef.current = null
    }
    // bankKey is the stable identity of the URL lists; inline bank objects must not remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankKey, controller, enabled, prepareRef])

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
