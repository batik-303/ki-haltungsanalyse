import { describe, expect, it } from 'vitest'
import { createTiltTrace } from '../../src/core/diagnostics/tilt-trace'

/**
 * #215: Die Nutzerin misst, wie weit ihr Tablet auf verschiedenen
 * Notenständer-Stellungen zurücklehnt. Jede ~1 s eine Neigung (1 Nachkommastelle),
 * alle ~5 s gebündelt ins Log.
 */
describe('createTiltTrace', () => {
  it('nimmt höchstens eine Probe je Sekunde und bündelt fünf', () => {
    const trace = createTiltTrace(1000, 5)
    const events = []
    for (let t = 0; t <= 4250; t += 250) {
      const e = trace.tick(t, 36.44 + t / 10_000)
      if (e) events.push(e)
    }
    expect(events).toEqual([{ kind: 'tilt-trace', tilts: [36.4, 36.5, 36.6, 36.7, 36.8] }])
  })

  it('ohne Messung kommt null in die Reihe', () => {
    const trace = createTiltTrace(1000, 2)
    expect(trace.tick(0, null)).toBeUndefined()
    expect(trace.tick(1000, 12.34)).toEqual({ kind: 'tilt-trace', tilts: [null, 12.3] })
  })

  it('reset beginnt eine neue Reihe', () => {
    const trace = createTiltTrace(1000, 2)
    trace.tick(0, 10)
    trace.reset()
    expect(trace.tick(100, 20)).toBeUndefined()
    expect(trace.tick(1100, 30)).toEqual({ kind: 'tilt-trace', tilts: [20, 30] })
  })
})
