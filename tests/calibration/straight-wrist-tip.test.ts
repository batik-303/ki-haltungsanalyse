import { describe, expect, it } from 'vitest'
import { computeStraightWristTip } from '../../src/core/calibration/straight-wrist-tip'
import type { WristMasterPrint } from '../../src/core/types'

/**
 * Ticket #101: Wurde das Handgelenk beim Speichern deutlich geknickt (> 10°),
 * zeigt die App kurz einen freundlichen Tipp am Rand — die Analyse läuft
 * weiter (Weg A, kein Modal). Grund: gemessen wird die Abweichung von der
 * gespeicherten Haltung; schief gespeichert → eine Seite reagiert träger.
 */
function wristPrint(calibKnick: number): WristMasterPrint {
  return {
    mode: 'wrist',
    flexAngle: 0,
    flexBendDir: 1,
    calibArmLength2D: 0.3,
    calibKnick,
    calibKnickSide: calibKnick < 2 ? 0 : 1,
    calibKnickFallback: 0,
  }
}

describe('computeStraightWristTip', () => {
  it('deutlich geknickt gespeichert (15,3°): zeigt den Tipp direkt nach dem Speichern', () => {
    const tip = computeStraightWristTip({ masterPrint: wristPrint(15.3), calibratedAt: 1000, now: 1000 })
    expect(tip).toMatch(/Handgelenk/)
    expect(tip).toMatch(/gerade/)
    expect(tip).toMatch(/neu/)
  })

  it('bis einschließlich 10° gespeichert: kein Tipp', () => {
    expect(computeStraightWristTip({ masterPrint: wristPrint(10), calibratedAt: 1000, now: 1000 })).toBeNull()
    expect(computeStraightWristTip({ masterPrint: wristPrint(3), calibratedAt: 1000, now: 1000 })).toBeNull()
  })

  it('knapp über 10°: Tipp', () => {
    expect(computeStraightWristTip({ masterPrint: wristPrint(10.5), calibratedAt: 1000, now: 1000 })).not.toBeNull()
  })

  it('verschwindet nach ein paar Sekunden von selbst (8 s)', () => {
    const mp = wristPrint(15.3)
    expect(computeStraightWristTip({ masterPrint: mp, calibratedAt: 1000, now: 8999 })).not.toBeNull()
    expect(computeStraightWristTip({ masterPrint: mp, calibratedAt: 1000, now: 9000 })).toBeNull()
  })

  it('ohne Speicher-Zeitpunkt, ohne Kalibrierung oder in anderen Modi: kein Tipp', () => {
    expect(computeStraightWristTip({ masterPrint: wristPrint(15.3), calibratedAt: null, now: 1000 })).toBeNull()
    expect(computeStraightWristTip({ masterPrint: null, calibratedAt: 1000, now: 1000 })).toBeNull()
    expect(
      computeStraightWristTip({ masterPrint: { mode: 'violin', calibWristX: 0, calibWristY: 0 }, calibratedAt: 1000, now: 1000 }),
    ).toBeNull()
  })
})
