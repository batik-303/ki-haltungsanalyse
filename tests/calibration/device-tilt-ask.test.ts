import { describe, expect, it } from 'vitest'
import {
  computeDeviceTiltMessage,
  createDeviceTiltHintState,
  initialDeviceTiltPermission,
  stepDeviceTiltHint,
  TILT_DISTANCE_AFTER_MS,
  TILT_NO_SENSOR_GRACE_MS,
} from '../../src/core/calibration/device-tilt'

/**
 * #215: iPadOS lehnt die Sensor-Frage still ab, wenn sie im selben Tippen wie
 * Kamera + Mikro kommt. Deshalb fragt das Gerät-Kärtchen selbst: eigener Tipp,
 * während Kamera und Mikro schon laufen.
 */
describe('Gerät-Kärtchen fragt per eigenem Tipp (#215)', () => {
  const start = createDeviceTiltHintState()

  it('mit requestPermission (iOS/iPadOS): Start-Zustand „prompt“, sonst „granted“', () => {
    expect(initialDeviceTiltPermission(true)).toBe('prompt')
    expect(initialDeviceTiltPermission(false)).toBe('granted')
  })

  it('Text lädt freundlich zum Tippen ein', () => {
    expect(computeDeviceTiltMessage('ask')).toBe('Tippe hier, damit ich prüfen kann, ob dein Gerät gerade steht.')
  })

  it('„prompt“: Kärtchen zeigt die Einladung, Abstand noch zurück', () => {
    const s = stepDeviceTiltHint(start, null, 0, 'prompt')
    expect(s.view).toBe('ask')
    expect(s.distanceAllowed).toBe(false)
    expect(s.done).toBe(false)
  })

  it('nie blockieren: ignoriert man die Einladung, kommt der Abstand nach 5 s; Kärtchen bleibt', () => {
    let s = stepDeviceTiltHint(start, null, 0, 'prompt')
    s = stepDeviceTiltHint(s, null, TILT_DISTANCE_AFTER_MS - 1, 'prompt')
    expect(s.distanceAllowed).toBe(false)
    s = stepDeviceTiltHint(s, null, TILT_DISTANCE_AFTER_MS, 'prompt')
    expect(s.distanceAllowed).toBe(true)
    expect(s.view).toBe('ask')
    s = stepDeviceTiltHint(s, null, 60_000, 'prompt')
    expect(s.view).toBe('ask')
    expect(s.done).toBe(false)
  })

  it('getippt, Antwort offen: Einladung weg, Abstand bleibt, wie er war', () => {
    let s = stepDeviceTiltHint(start, null, 0, 'prompt')
    s = stepDeviceTiltHint(s, null, TILT_DISTANCE_AFTER_MS, 'prompt')
    s = stepDeviceTiltHint(s, null, TILT_DISTANCE_AFTER_MS + 10, 'pending')
    expect(s.view).toBe('hidden')
    expect(s.distanceAllowed).toBe(true)
  })

  it('erlaubt: Frist für „kein Sensor“ zählt erst ab jetzt, dann live wie bisher', () => {
    let s = stepDeviceTiltHint(start, null, 0, 'prompt')
    s = stepDeviceTiltHint(s, null, 20_000, 'pending')
    s = stepDeviceTiltHint(s, null, 21_000, 'granted')
    s = stepDeviceTiltHint(s, null, 21_000 + TILT_NO_SENSOR_GRACE_MS - 1, 'granted')
    expect(s.done).toBe(false)
    s = stepDeviceTiltHint(s, 40, 21_200, 'granted')
    s = stepDeviceTiltHint(s, 40.1, 21_216, 'granted')
    expect(s.view).toBe('tilted')
    s = stepDeviceTiltHint(s, 5, 21_300, 'granted')
    expect(s.view).toBe('level')
    expect(s.distanceAllowed).toBe(true)
  })

  it('abgelehnt: Kärtchen weg, Abstand frei', () => {
    let s = stepDeviceTiltHint(start, null, 0, 'prompt')
    s = stepDeviceTiltHint(s, null, 1000, 'denied')
    expect(s.view).toBe('hidden')
    expect(s.distanceAllowed).toBe(true)
    expect(s.done).toBe(true)
    expect(s.doneReason).toBe('denied')
  })
})
