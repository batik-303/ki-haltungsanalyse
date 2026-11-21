import { describe, expect, it } from 'vitest'
import {
  computeDeviceTiltDeg,
  createDeviceTiltHintState,
  stepDeviceTiltHint,
  TILT_STALE_MS,
} from '../../src/core/calibration/device-tilt'

/**
 * #215, iPad-Test 10:35: Erlaubnis erteilt, iPad hochkant auf dem Ständer, aber
 * der Bildschirm-Winkel kam als 90 (Desktop-Modus) und ruhige Werte schalteten
 * den Sensor ab. Neu: Neigung ohne Bildschirm-Winkel; ruhiger Sensor bleibt an.
 */
describe('ruhiger, echter Sensor (#215)', () => {
  const start = createDeviceTiltHintState()

  it('einmal lebendig: lange ohne Änderung bleibt das Kärtchen', () => {
    let s = stepDeviceTiltHint(start, 36.4, 0)
    s = stepDeviceTiltHint(s, 36.5, 16)
    s = stepDeviceTiltHint(s, 36.5, 16 + TILT_STALE_MS * 10)
    expect(s.done).toBe(false)
    expect(s.view).toBe('tilted')
  })

  it('nach „stale“ nicht dauerhaft aus: kommen neue Werte, zeigt das Kärtchen wieder', () => {
    let s = stepDeviceTiltHint(start, 90, 0)
    s = stepDeviceTiltHint(s, 90, TILT_STALE_MS)
    expect(s.view).toBe('hidden')
    expect(s.distanceAllowed).toBe(true)
    expect(s.done).toBe(false)
    s = stepDeviceTiltHint(s, 30, TILT_STALE_MS + 5000)
    expect(s.view).toBe('tilted')
    s = stepDeviceTiltHint(s, 5, TILT_STALE_MS + 5100)
    expect(s.view).toBe('level')
  })
})

/**
 * Neigung = Winkel der Bildschirm-Ebene zur Senkrechten, asin(|cos β · cos γ|).
 * Unabhängig vom Bildschirm-Winkel (iPad meldet hochkant 90). Seitliches Drehen
 * in der Bildebene zählt nicht (die Knick-Messung ist handlokal).
 */
describe('computeDeviceTiltDeg – vor/zurück, ohne Bildschirm-Winkel (#215)', () => {
  it('iPad-Log: hochkant, Ständer lehnt zurück (β 53.6, γ 5.4) ≈ 36°', () => {
    expect(computeDeviceTiltDeg({ beta: 53.6, gamma: 5.4 })).toBeCloseTo(36.2, 0)
  })

  it('hochkant aufrecht (β 90) und quer aufrecht (γ ±90) sind 0°', () => {
    expect(computeDeviceTiltDeg({ beta: 90, gamma: 0 })).toBeCloseTo(0, 5)
    expect(computeDeviceTiltDeg({ beta: 0, gamma: 90 })).toBeCloseTo(0, 5)
    expect(computeDeviceTiltDeg({ beta: 0, gamma: -90 })).toBeCloseTo(0, 5)
  })

  it('quer, 10° zurückgelehnt ergibt 10°', () => {
    expect(computeDeviceTiltDeg({ beta: 0, gamma: -80 })).toBeCloseTo(10, 5)
  })

  it('flach auf dem Tisch ist 90°', () => {
    expect(computeDeviceTiltDeg({ beta: 0, gamma: 0 })).toBeCloseTo(90, 5)
  })

  it('seitliches Drehen in der Bildebene zählt nicht', () => {
    // aufrecht, um 10° in der Bildebene gedreht: Euler β=80, γ=90
    expect(computeDeviceTiltDeg({ beta: 80, gamma: 90 })).toBeCloseTo(0, 5)
  })

  it('ohne Sensorwerte null', () => {
    expect(computeDeviceTiltDeg({ beta: null, gamma: 5 })).toBeNull()
  })
})
