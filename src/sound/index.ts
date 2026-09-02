import { createElement, type ReactElement } from 'react'
import { SplitFlapSound, type SplitFlapSoundProps } from './adapter'

export {
  SplitFlapSoundEngine as SoundEngine,
  defaultSplitFlapSoundTuning as defaultSoundOptions,
  type SplitFlapMechanicalEvent as MechanicalEvent,
  type SplitFlapMechanicalEventSource as MechanicalEventSource,
  type SplitFlapSoundBank as SoundBank,
  type SplitFlapSoundEngineOptions as SoundEngineOptions,
  type SplitFlapSoundTuning as SoundTuning,
} from './engine'

export type SoundOptions = SplitFlapSoundProps

/** Creates the optional mechanical sound element rendered inside Flapkit.Root. */
export function mechanicalSound(props: SoundOptions): ReactElement {
  return createElement(SplitFlapSound, props)
}
