import { describe, expect, it } from 'vitest'
import { computeSavedKnickLabel, computeStraightWristTip } from '../../src/core/calibration/straight-wrist-tip'
import type { KnickSide, WristMasterPrint } from '../../src/core/types'

/**
 * Ticket #101: Wurde das Handgelenk beim Speichern deutlich geknickt, zeigt
 * die App kurz einen freundlichen Tipp am Rand — die Analyse läuft weiter
 * (Weg A, kein Modal). Grund: gemessen wird die Abweichung von der
 * gespeicherten Haltung; schief gespeichert → eine Seite reagiert träger.
 *
 * Grenze je Richtung (Messung der Nutzerin, 25.10.): gerade 0–7°, leicht zum
 * Hals (erlaubt) 15–22°, zu viel zum Hals ≈ 35°, zu viel zur Schnecke 21–28°.
 * → Schnecke > 10°, Hals > 28°. Hals = links auf dem Bildschirm (Seite +1),
 * wie die Hand in der Leiste (#94).
 */
const NECK: KnickSide = 1
const SCROLL: KnickSide = -1

function wristPrint(
  calibKnick: number,
  calibKnickSide: KnickSide = SCROLL,
  calibKnickMeasured: number = calibKnickSide === 0 ? calibKnick : calibKnickSide * calibKnick,
): WristMasterPrint {
  return {
    mode: 'wrist',
    flexAngle: 0,
    flexBendDir: 1,
    calibArmLength2D: 0.3,
    calibKnick,
    calibKnickSide,
    calibKnickMeasured,
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

  // #111: beide Wege nennen — Sprache „neu" oder über das Hauptmenü (Knopf-Wort).
  it('nennt beide Wege zum neu Speichern', () => {
    const tip = computeStraightWristTip({ masterPrint: wristPrint(15.3), calibratedAt: 1000, now: 1000 })
    expect(tip).toMatch(/Sag „neu“ oder geh über das Hauptmenü und speichere neu\.$/)
  })

  // #189 (15.11.): Unter 10° greift der Gerade-Fang (gespeichert 0°), ab 10°
  // kommt der Tipp, zum Hals und zur Schnecke gleich (Hals vorher 28°).
  it('gerade gespeichert (Fang griff, 0°): kein Tipp', () => {
    expect(computeStraightWristTip({ masterPrint: wristPrint(0, 0, 9.9), calibratedAt: 1000, now: 1000 })).toBeNull()
  })

  it('ab 10° Richtung Schnecke: Tipp', () => {
    expect(computeStraightWristTip({ masterPrint: wristPrint(10), calibratedAt: 1000, now: 1000 })).not.toBeNull()
    expect(computeStraightWristTip({ masterPrint: wristPrint(10.5), calibratedAt: 1000, now: 1000 })).not.toBeNull()
  })

  it('ab 10° Richtung Hals: Tipp, gleich wie zur Schnecke', () => {
    for (const deg of [10, 14.8, 22.3, 28, 34.7]) {
      expect(computeStraightWristTip({ masterPrint: wristPrint(deg, NECK), calibratedAt: 1000, now: 1000 })).not.toBeNull()
    }
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

/**
 * Entwickler-Ansicht (#101, Nutzerinnen-Test): Bei jedem Speichern kurz die
 * gespeicherte Gradzahl zeigen — auch unter 10° —, damit wir sehen, was
 * „gerade" misst, und die Grenze prüfen können.
 */
describe('computeSavedKnickLabel', () => {
  // #189: Gerade-Fang — angezeigt wird der gemessene Wert, dazu „→ 0°", wenn der Fang griff.
  it('Gerade-Fang griff: gemessener Wert mit Richtung und „→ 0°"', () => {
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(0, 0, 5.26 * NECK), calibratedAt: 1000, now: 1000 })).toBe('gespeichert: 5,3° · links → 0°')
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(0, 0, 9.9 * SCROLL), calibratedAt: 1000, now: 1000 })).toBe('gespeichert: 9,9° · rechts → 0°')
  })

  it('Gerade-Fang griff, gemessen fast 0 (< 2°): ohne Richtung, mit „→ 0°"', () => {
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(0, 0, 1.2), calibratedAt: 1000, now: 1000 })).toBe('gespeichert: 1,2° → 0°')
  })

  it('zeigt den gespeicherten Knick mit einer Nachkommastelle', () => {
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(11.26, NECK), calibratedAt: 1000, now: 1000 })).toBe('gespeichert: 11,3° · links')
  })


  // Richtung wie auf dem (gespiegelten) Bildschirm, gleiche Zuordnung wie die
  // Hand in der Leiste (#94): Seite +1 → links, −1 → rechts.
  it('nennt die Richtung, in die die Hand auf dem Bildschirm knickt', () => {
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(12, NECK), calibratedAt: 1000, now: 1000 })).toBe('gespeichert: 12,0° · links')
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(12, SCROLL), calibratedAt: 1000, now: 1000 })).toBe('gespeichert: 12,0° · rechts')
  })

  it('wie der Tipp nur kurz nach dem Speichern und nur im Handgelenk-Modus', () => {
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(4), calibratedAt: 1000, now: 9000 })).toBeNull()
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(4), calibratedAt: null, now: 1000 })).toBeNull()
    expect(
      computeSavedKnickLabel({ masterPrint: { mode: 'violin', calibWristX: 0, calibWristY: 0 }, calibratedAt: 1000, now: 1000 }),
    ).toBeNull()
  })
})
