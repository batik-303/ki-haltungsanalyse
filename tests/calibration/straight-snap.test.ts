import { describe, expect, it } from 'vitest'
import { createMasterPrint } from '../../src/core/calibration/master-print'
import type { Landmark, WristMasterPrint } from '../../src/core/types'

/**
 * Ticket #189 (Entscheidung in #144): Gerade-Fang. Ist die gespeicherte Haltung
 * nur leicht schief (Median-Knick unter 10°, beide Richtungen gleich; Entscheidung 15.11.), gilt sie
 * als gerade (0°, ohne Seite). Ab 10° bleibt der echte Wert mit Seite.
 * Der gemessene Wert bleibt für die Entwickler-Ansicht erhalten.
 */

function lm(x: number, y: number): Landmark {
  return { x, y, z: 0, visibility: 1 }
}

const pose = Array.from({ length: 33 }, () => lm(0.5, 0.5))
pose[13] = lm(0.3, 0.6)
pose[15] = lm(0.45, 0.45)
pose[17] = lm(0.5, 0.43)
pose[19] = lm(0.52, 0.4)
const hand = Array.from({ length: 21 }, () => lm(0.5, 0.5))
hand[0] = lm(0.46, 0.46)
hand[9] = lm(0.53, 0.42)

function calibrate(knickSamples: number[]): WristMasterPrint {
  const mp = createMasterPrint('wrist', pose, { handLandmarks: hand, aspect: 1, knickSamples })
  if (mp?.mode !== 'wrist') throw new Error('erwartet WristMasterPrint')
  return mp
}

describe('Gerade-Fang beim Speichern (#189)', () => {
  it('Median 5°: gilt als gerade (0°, Seite 0)', () => {
    const mp = calibrate([4, 5, 6])
    expect(mp.calibKnick).toBe(0)
    expect(mp.calibKnickSide).toBe(0)
  })

  it('Median −9,9° (andere Richtung): gilt ebenfalls als gerade', () => {
    const mp = calibrate([-10.2, -9.9, -9.5])
    expect(mp.calibKnick).toBe(0)
    expect(mp.calibKnickSide).toBe(0)
  })

  it('Median genau 10°: echter Wert mit Seite', () => {
    const mp = calibrate([9.5, 10, 11])
    expect(mp.calibKnick).toBe(10)
    expect(mp.calibKnickSide).toBe(1)
  })

  it('Median −12°: echter Wert mit Seite', () => {
    const mp = calibrate([-12])
    expect(mp.calibKnick).toBe(12)
    expect(mp.calibKnickSide).toBe(-1)
  })

  it('der gemessene Wert (mit Seite) bleibt für die Entwickler-Ansicht erhalten', () => {
    expect(calibrate([4, 5, 6]).calibKnickMeasured).toBe(5)
    expect(calibrate([-9.9]).calibKnickMeasured).toBe(-9.9)
    expect(calibrate([-12]).calibKnickMeasured).toBe(-12)
  })
})
