export type CascadeMotion = {
  cadenceVariationPct: number
  finalReboundDeg: number
  finalSettleMs: number
  pitchMs: number
  rowDelayMs: number
  withinRowJitterMs: number
}

export type RiffleMotion = {
  cadenceVariationPct: number
  finalReboundDeg: number
  finalSettleMs: number
  riffleMs: number
  startSpreadMs: number
}

export const defaultCascadeMotion: CascadeMotion = {
  cadenceVariationPct: 6,
  finalReboundDeg: 2,
  finalSettleMs: 260,
  pitchMs: 52,
  rowDelayMs: 150,
  withinRowJitterMs: 16,
}

export const defaultRiffleMotion: RiffleMotion = {
  cadenceVariationPct: 4,
  finalReboundDeg: 2,
  finalSettleMs: 260,
  riffleMs: 36,
  startSpreadMs: 480,
}
