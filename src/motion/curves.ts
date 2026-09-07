/** Shared vane and stack curves for the CSS 3D path and the canvas renderer. */

export type CurveKeyframe = readonly [offset: number, value: number]

export const riffleVaneAngles = [
  [0, 0],
  [0.28, -55],
  [0.5, -90],
  [0.68, -125],
  [0.82, -180],
  [1, -180],
] as const satisfies readonly CurveKeyframe[]

export const settleVaneAngles = [
  [0, 0],
  [0.34, -55],
  [0.5, -90],
  [0.62, -125],
  [0.78, -180],
  [1, -180],
] as const satisfies readonly CurveKeyframe[]

export const riffleStackShifts = [
  [0, 0],
  [0.45, 0],
  [0.72, 0.08],
  [0.82, 0.18],
  [0.9, -0.03],
  [1, 0],
] as const satisfies readonly CurveKeyframe[]

export const settleStackShifts = [
  [0, 0],
  [0.42, 0],
  [0.65, 0.08],
  [0.78, 0.2],
  [1, 0],
] as const satisfies readonly CurveKeyframe[]

export function interpolateCurve(progress: number, keyframes: readonly CurveKeyframe[]) {
  const clampedProgress = Math.max(0, Math.min(1, progress))

  for (let index = 1; index < keyframes.length; index += 1) {
    const [endOffset, endValue] = keyframes[index]!
    if (clampedProgress > endOffset) continue

    const [startOffset, startValue] = keyframes[index - 1]!
    const segmentProgress =
      endOffset === startOffset ? 1 : (clampedProgress - startOffset) / (endOffset - startOffset)
    return startValue + (endValue - startValue) * segmentProgress
  }

  return keyframes[keyframes.length - 1]![1]
}

export function vaneAngle(progress: number, settle: boolean) {
  return interpolateCurve(progress, settle ? settleVaneAngles : riffleVaneAngles)
}

export function stackShift(progress: number, settle: boolean) {
  return interpolateCurve(progress, settle ? settleStackShifts : riffleStackShifts)
}

export function pitchProgress(pitchStart: number, duration: number, now: number) {
  if (now <= pitchStart || duration <= 0) return 0
  return Math.min(1, (now - pitchStart) / duration)
}
