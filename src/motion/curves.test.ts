import { describe, expect, it } from 'vitest'
import { interpolateCurve, pitchProgress, stackShift, vaneAngle } from './curves'

describe('shared motion curves', () => {
  it('interpolates between keyframe offsets', () => {
    expect(interpolateCurve(0.25, [[0, 0], [0.5, 100]])).toBe(50)
    expect(interpolateCurve(-1, [[0, 10], [1, 20]])).toBe(10)
    expect(interpolateCurve(2, [[0, 10], [1, 20]])).toBe(20)
  })

  it('uses the settle vane table after the halfway fold', () => {
    expect(vaneAngle(0, false)).toBe(0)
    expect(vaneAngle(0.5, false)).toBe(-90)
    expect(vaneAngle(1, false)).toBe(-180)
    expect(vaneAngle(0.34, true)).toBe(-55)
    expect(vaneAngle(0.78, true)).toBe(-180)
  })

  it('keeps the stack still until the late pitch', () => {
    expect(stackShift(0.4, false)).toBe(0)
    expect(stackShift(0.82, false)).toBeCloseTo(0.18)
    expect(stackShift(0.78, true)).toBeCloseTo(0.2)
    expect(stackShift(1, true)).toBe(0)
  })

  it('returns zero progress before the pitch starts', () => {
    expect(pitchProgress(16, 100, 8)).toBe(0)
    expect(pitchProgress(16, 100, 66)).toBe(0.5)
    expect(pitchProgress(16, 100, 200)).toBe(1)
    expect(pitchProgress(16, 0, 20)).toBe(0)
  })
})
