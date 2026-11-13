import { describe, expect, it } from 'vitest'
import { checkDistance, computeShoulderWidth } from '../../src/core/calibration/distance-check'

/**
 * #168: Charakterisierungs-Tests für die Abstands-Prüfung.
 * Schulterbreite (normierte x-Koordinaten) zwischen 0,12 und 0,45 = gut.
 */
describe('computeShoulderWidth', () => {
  it('liefert den Betrag des x-Abstands, egal in welcher Reihenfolge', () => {
    expect(computeShoulderWidth(0.3, 0.6)).toBeCloseTo(0.3, 10)
    expect(computeShoulderWidth(0.6, 0.3)).toBeCloseTo(0.3, 10)
  })
})

describe('checkDistance', () => {
  it('meldet „too-far“ unter 0,12', () => {
    expect(checkDistance(0.05)).toBe('too-far')
    expect(checkDistance(0.119)).toBe('too-far')
  })

  it('meldet „good“ zwischen 0,12 und 0,45 (Grenzen eingeschlossen)', () => {
    expect(checkDistance(0.12)).toBe('good')
    expect(checkDistance(0.3)).toBe('good')
    expect(checkDistance(0.45)).toBe('good')
  })

  it('meldet „too-close“ über 0,45', () => {
    expect(checkDistance(0.451)).toBe('too-close')
    expect(checkDistance(0.9)).toBe('too-close')
  })
})
