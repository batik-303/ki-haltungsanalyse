import { describe, expect, it } from 'vitest'
import {
  createDeviceTiltHintState,
  normalizeScreenAngle,
  stepDeviceTiltHint,
  TILT_STALE_MS,
} from '../../src/core/calibration/device-tilt'

/**
 * #215: Auf dem iPad kam nur ein einzelner (oder ein eingefrorener) Sensor-Wert;
 * das Kärtchen blieb bei „Gerät gerade stellen“ hängen. Bienveillant: nie ein
 * Hinweis, den man nicht erfüllen kann. Erst sich ändernde Werte zeigen, dass
 * der Sensor lebt; bleiben sie ~3 s gleich, gilt: kein Sensor, Abstand sofort.
 */
describe('stepDeviceTiltHint – eingefrorener Sensor (#215)', () => {
  const start = createDeviceTiltHintState()

  it('Wartezeit ist etwa 3 s', () => {
    expect(TILT_STALE_MS).toBe(3000)
  })

  it('ein einzelner Wert zeigt noch kein „schief“', () => {
    const s = stepDeviceTiltHint(start, 90, 0)
    expect(s.view).toBe('hidden')
    expect(s.distanceAllowed).toBe(false)
  })

  it('nur ein einzelner Wert (z. B. 0/0 → 90°): nach 3 s kein Kärtchen, Abstand frei', () => {
    let s = stepDeviceTiltHint(start, 90, 0)
    s = stepDeviceTiltHint(s, 90, TILT_STALE_MS - 1)
    expect(s.done).toBe(false)
    s = stepDeviceTiltHint(s, 90, TILT_STALE_MS)
    expect(s.view).toBe('hidden')
    expect(s.distanceAllowed).toBe(true)
    expect(s.doneReason).toBe('stale')
  })

  it('leere Meldungen nach einem einzelnen Wert zählen nicht als Änderung', () => {
    let s = stepDeviceTiltHint(start, 90, 0)
    s = stepDeviceTiltHint(s, null, 1000)
    s = stepDeviceTiltHint(s, null, TILT_STALE_MS)
    expect(s.doneReason).toBe('stale')
    expect(s.view).toBe('hidden')
  })

  it('sich ändernde Werte: Kärtchen erscheint', () => {
    let s = stepDeviceTiltHint(start, 30, 0)
    s = stepDeviceTiltHint(s, 30.2, 16)
    expect(s.view).toBe('tilted')
  })

  it('leichtes Rauschen hält den Sensor lebendig', () => {
    let s = stepDeviceTiltHint(start, 30, 0)
    for (let t = 1; t <= 10; t++) s = stepDeviceTiltHint(s, 30 + (t % 2) * 0.01, t * 1000)
    expect(s.done).toBe(false)
    expect(s.view).toBe('tilted')
  })

  it('kein Sensor (nie ein Wert) bleibt als Grund erkennbar', () => {
    let s = stepDeviceTiltHint(start, null, 0)
    s = stepDeviceTiltHint(s, null, 10_000)
    expect(s.doneReason).toBe('no-sensor')
  })

  it('abgelehnt bleibt als Grund erkennbar', () => {
    expect(stepDeviceTiltHint(start, null, 0, 'denied').doneReason).toBe('denied')
  })
})

describe('normalizeScreenAngle – hochkant und quer (#215)', () => {
  it('nimmt screen.orientation.angle, wenn vorhanden', () => {
    expect(normalizeScreenAngle(90, 0)).toBe(90)
    expect(normalizeScreenAngle(270, undefined)).toBe(270)
  })

  it('Rückfall auf window.orientation (−90 → 270)', () => {
    expect(normalizeScreenAngle(undefined, 90)).toBe(90)
    expect(normalizeScreenAngle(undefined, -90)).toBe(270)
    expect(normalizeScreenAngle(undefined, 180)).toBe(180)
  })

  it('ohne beides: hochkant (0)', () => {
    expect(normalizeScreenAngle(undefined, undefined)).toBe(0)
  })
})
