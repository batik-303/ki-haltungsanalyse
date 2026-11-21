import { describe, expect, it } from 'vitest'
import {
  createDeviceTiltHintState,
  stepDeviceTiltHint,
  TILT_DISTANCE_AFTER_MS,
  TILT_LEVEL_ENTER_DEG,
  TILT_LEVEL_EXIT_DEG,
  TILT_NO_SENSOR_GRACE_MS,
  type DeviceTiltHintState,
  type DeviceTiltPermission,
} from '../../src/core/calibration/device-tilt'

/**
 * #210: Vor der Abstands-Prüfung zeigt die App sanft, ob Handy/Tablet gerade
 * steht. Reine Logik: Neigung aus dem Lagesensor (beta/gamma + Bildschirm-
 * Drehung) und ein kleiner Ablauf, der nie festhält.
 */
describe('Toleranz (#210, nach Test der Nutzerin)', () => {
  // #215: Nutzerin hat gemessen (Notenständer bequem 34°, etwas Mühe 21°, mehr Mühe 13,5°)
  it('bis 25° Zurück-/Vorlehnen gilt als gerade, Hysterese bis 27°', () => {
    expect(TILT_LEVEL_ENTER_DEG).toBe(25)
    expect(TILT_LEVEL_EXIT_DEG).toBe(27)
  })
})

describe('stepDeviceTiltHint', () => {
  const start = createDeviceTiltHintState()
  /**
   * Echter Sensor (#215): ein Wert plus ein leicht anderer, wie das Rauschen
   * eines lebenden Sensors. Erst dann zeigt das Kärtchen etwas.
   */
  const live = (s: DeviceTiltHintState, tilt: number, t: number, p?: DeviceTiltPermission) =>
    stepDeviceTiltHint(stepDeviceTiltHint(s, tilt + 0.01, t, p), tilt, t, p)

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
    s = live(s, 40, TILT_NO_SENSOR_GRACE_MS + 100)
    expect(s.view).toBe('hidden')
  })

  it('zuerst nur das Gerät-Kärtchen: schief → „tilted", Abstand noch nicht', () => {
    const s = live(start, 40, 0)
    expect(s.view).toBe('tilted')
    expect(s.distanceAllowed).toBe(false)
  })

  it('gerade → „level" und Abstand sofort frei; Kärtchen bleibt sichtbar', () => {
    let s = live(start, 40, 0)
    s = live(s, 5, 100)
    expect(s.view).toBe('level')
    expect(s.distanceAllowed).toBe(true)
    s = live(s, 5, 60_000)
    expect(s.view).toBe('level')
  })

  it('reagiert live: wieder schief → „tilted", Abstand bleibt sichtbar', () => {
    let s = live(start, 5, 0)
    s = live(s, 40, 2000)
    expect(s.view).toBe('tilted')
    expect(s.distanceAllowed).toBe(true)
    s = live(s, 4, 3000)
    expect(s.view).toBe('level')
  })

  it('Hysterese: einmal gerade, bleibt es bis 27° gerade', () => {
    let s = live(start, 24, 0)
    expect(s.view).toBe('level')
    s = live(s, 26.5, 100)
    expect(s.view).toBe('level')
    s = live(s, 28, 200)
    expect(s.view).toBe('tilted')
  })

  it('nie blockieren: nach der Wartezeit kommt der Abstand, das Gerät-Kärtchen bleibt', () => {
    let s = live(start, 40, 0)
    s = live(s, 40, TILT_DISTANCE_AFTER_MS - 1)
    expect(s.distanceAllowed).toBe(false)
    s = live(s, 40, TILT_DISTANCE_AFTER_MS)
    expect(s.view).toBe('tilted')
    expect(s.distanceAllowed).toBe(true)
    s = live(s, 40, TILT_DISTANCE_AFTER_MS + 60_000)
    expect(s.view).toBe('tilted')
  })

  it('einzelne leere Messung nach echten Werten ändert nichts', () => {
    let s = live(start, 5, 0)
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
    s = live(s, 40, 10_300, 'granted')
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
