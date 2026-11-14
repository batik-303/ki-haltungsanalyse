import { describe, expect, it } from 'vitest'
import { createFrameRateMeter } from '../../src/core/diagnostics/frame-rate-meter'

describe('createFrameRateMeter – Bildrate fürs Diagnose-Log', () => {
  it('meldet nach 10 s die mittlere Bildrate und beginnt dann neu', () => {
    const meter = createFrameRateMeter(10_000)
    const reports: (number | undefined)[] = []
    // 30 Bilder pro Sekunde über gut 10 s, danach 15 Bilder pro Sekunde
    for (let t = 0; t <= 10_000; t += 1000 / 30) reports.push(meter.tick(t))
    for (let t = 10_000 + 1000 / 15; t <= 20_100; t += 1000 / 15) reports.push(meter.tick(t))
    expect(reports.filter((r) => r !== undefined).map((r) => Math.round(r!))).toEqual([30, 15])
  })

  it('meldet nichts, solange 10 s noch nicht um sind', () => {
    const meter = createFrameRateMeter(10_000)
    expect(meter.tick(0)).toBeUndefined()
    expect(meter.tick(5000)).toBeUndefined()
  })
})
