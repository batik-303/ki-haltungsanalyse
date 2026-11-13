import { describe, expect, it } from 'vitest'
import { computeTension } from '../../src/core/signal/tension'

/**
 * #168: Charakterisierungs-Tests für die asymmetrische Spannung.
 * Langsam hoch (Standard 0,12), schneller runter (Standard 0,15):
 * Rückkehr zur guten Haltung soll man sofort spüren.
 */
describe('computeTension', () => {
  it('steigt mit der Standard-Rate 0,12 Richtung Ziel', () => {
    expect(computeTension(0, 100)).toBeCloseTo(12, 10)
  })

  it('fällt mit der Standard-Rate 0,15 Richtung Ziel', () => {
    expect(computeTension(100, 0)).toBeCloseTo(85, 10)
  })

  it('fällt schneller, als es steigt (gleicher Abstand)', () => {
    const rise = computeTension(40, 60) - 40
    const fall = 60 - computeTension(60, 40)
    expect(fall).toBeGreaterThan(rise)
  })

  it('nutzt übergebene Raten', () => {
    expect(computeTension(0, 100, 0.05, 0.15)).toBeCloseTo(5, 10)
    expect(computeTension(100, 0, 0.05, 0.3)).toBeCloseTo(70, 10)
  })

  it('bleibt stehen, wenn Ziel erreicht ist', () => {
    expect(computeTension(42, 42)).toBe(42)
  })

  it('begrenzt das Ergebnis auf 0 bis 100', () => {
    expect(computeTension(90, 1000, 1, 1)).toBe(100)
    expect(computeTension(10, -1000, 1, 1)).toBe(0)
  })
})
