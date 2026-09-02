import { createElement, type ReactElement } from 'react'
import { SplitFlapSound, type SplitFlapSoundProps } from '../split-flap.sound'

export { SplitFlapSound, type SplitFlapSoundProps } from '../split-flap.sound'
export {
  SplitFlapSoundEngine,
  defaultSplitFlapSoundTuning,
  type SplitFlapMechanicalEvent,
  type SplitFlapMechanicalEventSource,
  type SplitFlapSoundBank,
  type SplitFlapSoundEngineOptions,
  type SplitFlapSoundTuning,
} from '../split-flap.sound-engine'

/** Creates the optional mechanical sound element rendered inside Flapkit.Root. */
export function mechanicalSound(props: SplitFlapSoundProps): ReactElement {
  return createElement(SplitFlapSound, props)
}
