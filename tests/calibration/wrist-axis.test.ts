import { describe, expect, it } from 'vitest'
import {
  computeWristAxisOk,
  WRIST_AXIS_MIN_ELEVATION_DEG,
  WRIST_AXIS_MIN_VISIBILITY,
} from '../../src/core/calibration/readiness-gate'
import type { Landmark } from '../../src/core/types'

/**
 * Ticket #36: Achsen-Check als Ersatz für echte Geigen-Erkennung.
 * `computeWristAxisOk` prüft rein aus vorhandenen Pose-Landmarks (Ellbogen 13,
 * Handgelenk 15), ob der linke Unterarm in Spielhaltung angehoben ist — das
 * Handgelenk liegt spürbar über dem Ellbogen. Bewusst **weich** (kinderfreundlich),
 * keine echte Objekterkennung (MediaPipe Pose sieht die Geige nicht).
 */
const lm = (x: number, y: number, visibility = 1): Landmark => ({ x, y, z: 0, visibility })

describe('computeWristAxisOk', () => {
  it('erkennt die angehobene Spielhaltung (Handgelenk deutlich über dem Ellbogen)', () => {
    const elbow = lm(0.5, 0.6)
    const wrist = lm(0.6, 0.35)
    const result = computeWristAxisOk(elbow, wrist)
    expect(result.visible).toBe(true)
    expect(result.ok).toBe(true)
    expect(result.elevationDeg).toBeGreaterThan(WRIST_AXIS_MIN_ELEVATION_DEG)
  })

  it('lehnt den hängenden Ruhearm ab (Handgelenk unter dem Ellbogen)', () => {
    const elbow = lm(0.5, 0.5)
    const wrist = lm(0.5, 0.85)
    const result = computeWristAxisOk(elbow, wrist)
    expect(result.ok).toBe(false)
    expect(result.elevationDeg).toBeLessThan(0)
  })

  it('lehnt den waagerechten Arm ab (Handgelenk auf Ellbogenhöhe, ~0°)', () => {
    const elbow = lm(0.5, 0.5)
    const wrist = lm(0.75, 0.5)
    const result = computeWristAxisOk(elbow, wrist)
    expect(result.elevationDeg).toBeCloseTo(0, 5)
    expect(result.ok).toBe(false)
  })

  it('misst ~90°, wenn das Handgelenk direkt über dem Ellbogen steht', () => {
    const elbow = lm(0.5, 0.6)
    const wrist = lm(0.5, 0.3)
    expect(computeWristAxisOk(elbow, wrist).elevationDeg).toBeCloseTo(90, 5)
  })

  it('gilt an der Schwelle als bereit (>= ist ausreichend, weiche Grenze)', () => {
    // Handgelenk direkt über dem Ellbogen → 90°, weit über der Schwelle;
    // hier prüfen wir die Inklusiv-Grenze mit einer exakt gesetzten Elevation.
    const elbow = lm(0.5, 0.6)
    // dx=0.2, dy so wählen, dass atan2(rise, 0.2) == Schwelle
    const rise = 0.2 * Math.tan((WRIST_AXIS_MIN_ELEVATION_DEG * Math.PI) / 180)
    const wrist = lm(0.7, 0.6 - rise)
    const result = computeWristAxisOk(elbow, wrist)
    expect(result.elevationDeg).toBeCloseTo(WRIST_AXIS_MIN_ELEVATION_DEG, 4)
    expect(result.ok).toBe(true)
  })

  it('gilt als nicht sichtbar (und damit nicht bereit) bei zu geringer Sichtbarkeit', () => {
    const elbow = lm(0.5, 0.6, WRIST_AXIS_MIN_VISIBILITY - 0.01)
    const wrist = lm(0.5, 0.3, 1)
    const result = computeWristAxisOk(elbow, wrist)
    expect(result.visible).toBe(false)
    expect(result.ok).toBe(false)
  })

  it('berücksichtigt das Seitenverhältnis (Skalierung der horizontalen Achse)', () => {
    const elbow = lm(0.5, 0.6)
    const wrist = lm(0.7, 0.4)
    // Größeres aspect streckt die Horizontale → flacherer Elevationswinkel.
    const square = computeWristAxisOk(elbow, wrist, 1).elevationDeg
    const wide = computeWristAxisOk(elbow, wrist, 2).elevationDeg
    expect(wide).toBeLessThan(square)
  })
})
