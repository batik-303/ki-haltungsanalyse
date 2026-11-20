import { describe, expect, it } from 'vitest'
import {
  computeDeviceTiltDeg,
  createDeviceTiltHintState,
  stepDeviceTiltHint,
  TILT_HINT_TIMEOUT_MS,
  TILT_LEVEL_HOLD_MS,
} from '../../src/core/calibration/device-tilt'

/**
 * #210: Vor der Abstands-Prüfung zeigt die App sanft, ob Handy/Tablet gerade
 * steht. Reine Logik: Neigung aus dem Lagesensor (beta/gamma + Bildschirm-
 * Drehung) und ein kleiner Ablauf, der nie festhält.
 */
describe('computeDeviceTiltDeg', () => {
  it('Hochkant aufrecht (beta 90, gamma 0) ist 0°', () => {
    expect(computeDeviceTiltDeg({ beta: 90, gamma: 0 }, 0)).toBeCloseTo(0, 5)
  })

  it('nach hinten gelehnt (beta 80) ergibt 10°', () => {
    expect(computeDeviceTiltDeg({ beta: 80, gamma: 0 }, 0)).toBeCloseTo(10, 5)
  })

  it('flach auf dem Tisch ist weit weg von gerade (90°)', () => {
    expect(computeDeviceTiltDeg({ beta: 0, gamma: 0 }, 0)).toBeCloseTo(90, 5)
  })

  it('seitlich in der Bildschirm-Ebene gekippt zählt mit (beta 80, gamma 90 ≈ 10° Drehung)', () => {
    // Aufrecht, aber um 10° in der Bildschirm-Ebene gedreht: Euler-Werte β=80, γ=±90.
    expect(computeDeviceTiltDeg({ beta: 80, gamma: 90 }, 0)).toBeCloseTo(10, 5)
  })

  it('Querformat (angle 90): aufrecht, wenn die rechte Geräte-Kante oben ist', () => {
    // Gerät gegen den Uhrzeigersinn gedreht → Oben-Vektor zeigt auf +x: β=0, γ=-90.
    expect(computeDeviceTiltDeg({ beta: 0, gamma: -90 }, 90)).toBeCloseTo(0, 5)
  })

  it('Querformat (angle 270): aufrecht, wenn die linke Geräte-Kante oben ist', () => {
    expect(computeDeviceTiltDeg({ beta: 0, gamma: 90 }, 270)).toBeCloseTo(0, 5)
  })

  it('Querformat falsch herum gedacht ergibt große Neigung', () => {
    expect(computeDeviceTiltDeg({ beta: 0, gamma: 90 }, 90)).toBeGreaterThan(90)
  })

  it('ohne Sensorwerte (null) keine Neigung', () => {
    expect(computeDeviceTiltDeg({ beta: null, gamma: 0 }, 0)).toBeNull()
    expect(computeDeviceTiltDeg({ beta: 90, gamma: null }, 0)).toBeNull()
  })
})

describe('stepDeviceTiltHint', () => {
  const start = createDeviceTiltHintState()

  it('ohne Sensor-Messung wird nichts angezeigt', () => {
    const s = stepDeviceTiltHint(start, null, 0)
    expect(s.view).toBe('hidden')
  })

  it('schief → „aufrichten", gerade → „steht gerade"', () => {
    const s1 = stepDeviceTiltHint(start, 12, 0)
    expect(s1.view).toBe('tilted')
    const s2 = stepDeviceTiltHint(s1, 2, 100)
    expect(s2.view).toBe('level')
  })

  it('Hysterese: einmal gerade, bleibt es bis knapp über der Grenze gerade', () => {
    let s = stepDeviceTiltHint(start, 4, 0)
    expect(s.view).toBe('level')
    s = stepDeviceTiltHint(s, 6, 100)
    expect(s.view).toBe('level')
    s = stepDeviceTiltHint(s, 8, 200)
    expect(s.view).toBe('tilted')
  })

  it('hält nie fest: nach der Wartezeit schief verschwindet das Kärtchen für immer', () => {
    let s = stepDeviceTiltHint(start, 20, 0)
    s = stepDeviceTiltHint(s, 20, TILT_HINT_TIMEOUT_MS - 1)
    expect(s.view).toBe('tilted')
    s = stepDeviceTiltHint(s, 20, TILT_HINT_TIMEOUT_MS)
    expect(s.view).toBe('hidden')
    s = stepDeviceTiltHint(s, 1, TILT_HINT_TIMEOUT_MS + 100)
    expect(s.view).toBe('hidden')
  })

  it('gerade gehalten: verschwindet nach kurzer Bestätigung', () => {
    let s = stepDeviceTiltHint(start, 2, 0)
    s = stepDeviceTiltHint(s, 2, TILT_LEVEL_HOLD_MS - 1)
    expect(s.view).toBe('level')
    s = stepDeviceTiltHint(s, 2, TILT_LEVEL_HOLD_MS)
    expect(s.view).toBe('hidden')
  })

  it('gerade erreicht kurz vor Ablauf: Bestätigung darf noch zu Ende laufen', () => {
    let s = stepDeviceTiltHint(start, 20, 0)
    s = stepDeviceTiltHint(s, 2, TILT_HINT_TIMEOUT_MS - 100)
    s = stepDeviceTiltHint(s, 2, TILT_HINT_TIMEOUT_MS + 100)
    expect(s.view).toBe('level')
    s = stepDeviceTiltHint(s, 2, TILT_HINT_TIMEOUT_MS - 100 + TILT_LEVEL_HOLD_MS)
    expect(s.view).toBe('hidden')
  })

  it('die Uhr startet erst mit der ersten Messung', () => {
    let s = stepDeviceTiltHint(start, null, 0)
    s = stepDeviceTiltHint(s, 20, 5000)
    expect(s.view).toBe('tilted')
  })
})
