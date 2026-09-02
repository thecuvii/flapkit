import { createElement } from 'react'
import type { SoundAdapter } from '../flapkit'
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

/** Creates an optional mechanical sound adapter for Flapkit.Root. */
export function mechanicalSound(props: SplitFlapSoundProps): SoundAdapter {
  return { render: () => createElement(SplitFlapSound, props) }
}
