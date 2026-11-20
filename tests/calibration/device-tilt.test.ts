import { describe, expect, it } from 'vitest'
import {
  computeDeviceTiltDeg,
  createDeviceTiltHintState,
  stepDeviceTiltHint,
  TILT_DISTANCE_AFTER_MS,
  TILT_LEVEL_ENTER_DEG,
  TILT_LEVEL_EXIT_DEG,
  TILT_NO_SENSOR_GRACE_MS,
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

describe('Toleranz (#210, nach Test der Nutzerin)', () => {
  it('bis 10° gilt als gerade, Hysterese bis 12°', () => {
    expect(TILT_LEVEL_ENTER_DEG).toBe(10)
    expect(TILT_LEVEL_EXIT_DEG).toBe(12)
  })
})

describe('stepDeviceTiltHint', () => {
  const start = createDeviceTiltHintState()

  it('vor der ersten Messung: nichts anzeigen, Abstand noch zurückhalten', () => {
    const s = stepDeviceTiltHint(start, null, 0)
    expect(s.view).toBe('hidden')
    expect(s.distanceAllowed).toBe(false)
  })

  it('ohne Sensor/Erlaubnis: nach kurzer Wartezeit nichts zeigen, Abstand frei', () => {
    let s = stepDeviceTiltHint(start, null, 0)
    s = stepDeviceTiltHint(s, null, TILT_NO_SENSOR_GRACE_MS)
    expect(s.view).toBe('hidden')
    expect(s.distanceAllowed).toBe(true)
    s = stepDeviceTiltHint(s, 20, TILT_NO_SENSOR_GRACE_MS + 100)
    expect(s.view).toBe('hidden')
  })

  it('zuerst nur das Gerät-Kärtchen: schief → „tilted", Abstand noch nicht', () => {
    const s = stepDeviceTiltHint(start, 20, 0)
    expect(s.view).toBe('tilted')
    expect(s.distanceAllowed).toBe(false)
  })

  it('gerade → „level" und Abstand sofort frei; Kärtchen bleibt sichtbar', () => {
    let s = stepDeviceTiltHint(start, 20, 0)
    s = stepDeviceTiltHint(s, 5, 100)
    expect(s.view).toBe('level')
    expect(s.distanceAllowed).toBe(true)
    s = stepDeviceTiltHint(s, 5, 60_000)
    expect(s.view).toBe('level')
  })

  it('reagiert live: wieder schief → „tilted", Abstand bleibt sichtbar', () => {
    let s = stepDeviceTiltHint(start, 5, 0)
    s = stepDeviceTiltHint(s, 20, 2000)
    expect(s.view).toBe('tilted')
    expect(s.distanceAllowed).toBe(true)
    s = stepDeviceTiltHint(s, 4, 3000)
    expect(s.view).toBe('level')
  })

  it('Hysterese: einmal gerade, bleibt es bis 12° gerade', () => {
    let s = stepDeviceTiltHint(start, 9, 0)
    expect(s.view).toBe('level')
    s = stepDeviceTiltHint(s, 11.5, 100)
    expect(s.view).toBe('level')
    s = stepDeviceTiltHint(s, 13, 200)
    expect(s.view).toBe('tilted')
  })

  it('nie blockieren: nach der Wartezeit kommt der Abstand, das Gerät-Kärtchen bleibt', () => {
    let s = stepDeviceTiltHint(start, 20, 0)
    s = stepDeviceTiltHint(s, 20, TILT_DISTANCE_AFTER_MS - 1)
    expect(s.distanceAllowed).toBe(false)
    s = stepDeviceTiltHint(s, 20, TILT_DISTANCE_AFTER_MS)
    expect(s.view).toBe('tilted')
    expect(s.distanceAllowed).toBe(true)
    s = stepDeviceTiltHint(s, 20, TILT_DISTANCE_AFTER_MS + 60_000)
    expect(s.view).toBe('tilted')
  })

  it('einzelne leere Messung nach echten Werten ändert nichts', () => {
    let s = stepDeviceTiltHint(start, 5, 0)
    s = stepDeviceTiltHint(s, null, 2000)
    expect(s.view).toBe('level')
    expect(s.done).toBe(false)
  })

  it('iOS-Frage noch offen: keine Uhr, nichts zeigen, Abstand zurückhalten', () => {
    let s = stepDeviceTiltHint(start, null, 0, 'pending')
    s = stepDeviceTiltHint(s, null, 10_000, 'pending')
    expect(s.view).toBe('hidden')
    expect(s.distanceAllowed).toBe(false)
    expect(s.done).toBe(false)
  })

  it('Frist zählt erst ab Antwort: nach Zustimmung erscheint das Kärtchen', () => {
    let s = stepDeviceTiltHint(start, null, 0, 'pending')
    s = stepDeviceTiltHint(s, null, 10_000, 'granted')
    s = stepDeviceTiltHint(s, null, 10_000 + TILT_NO_SENSOR_GRACE_MS - 1, 'granted')
    expect(s.done).toBe(false)
    s = stepDeviceTiltHint(s, 20, 10_300, 'granted')
    expect(s.view).toBe('tilted')
    expect(s.distanceAllowed).toBe(false)
  })

  it('Erlaubnis abgelehnt: sofort Abstand, kein Kärtchen', () => {
    let s = stepDeviceTiltHint(start, null, 0, 'pending')
    s = stepDeviceTiltHint(s, null, 2000, 'denied')
    expect(s.view).toBe('hidden')
    expect(s.distanceAllowed).toBe(true)
    expect(s.done).toBe(true)
  })
})
