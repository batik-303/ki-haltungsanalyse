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

function wristPrint(calibKnick: number, calibKnickSide: KnickSide = SCROLL): WristMasterPrint {
  return {
    mode: 'wrist',
    flexAngle: 0,
    flexBendDir: 1,
    calibArmLength2D: 0.3,
    calibKnick,
    calibKnickSide,
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

  it('Richtung Schnecke bis einschließlich 10° gespeichert: kein Tipp', () => {
    expect(computeStraightWristTip({ masterPrint: wristPrint(10), calibratedAt: 1000, now: 1000 })).toBeNull()
    expect(computeStraightWristTip({ masterPrint: wristPrint(3), calibratedAt: 1000, now: 1000 })).toBeNull()
  })

  it('Richtung Schnecke knapp über 10°: Tipp', () => {
    expect(computeStraightWristTip({ masterPrint: wristPrint(10.5), calibratedAt: 1000, now: 1000 })).not.toBeNull()
  })

  it('Richtung Hals ist ein leichter Knick erlaubt (gemessen 15–22°): kein Tipp bis einschließlich 28°', () => {
    for (const deg of [14.8, 17, 22.3, 28]) {
      expect(computeStraightWristTip({ masterPrint: wristPrint(deg, NECK), calibratedAt: 1000, now: 1000 })).toBeNull()
    }
  })

  it('Richtung Hals zu viel (gemessen ≈ 35°): Tipp', () => {
    expect(computeStraightWristTip({ masterPrint: wristPrint(28.5, NECK), calibratedAt: 1000, now: 1000 })).not.toBeNull()
    expect(computeStraightWristTip({ masterPrint: wristPrint(34.7, NECK), calibratedAt: 1000, now: 1000 })).not.toBeNull()
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
  it('zeigt den gespeicherten Knick mit einer Nachkommastelle', () => {
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(11.26, 0), calibratedAt: 1000, now: 1000 })).toBe('gespeichert: 11,3°')
  })

  it('auch unter der Grenze (gerade gespeichert)', () => {
    expect(computeSavedKnickLabel({ masterPrint: wristPrint(4, 0), calibratedAt: 1000, now: 1000 })).toBe('gespeichert: 4,0°')
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
