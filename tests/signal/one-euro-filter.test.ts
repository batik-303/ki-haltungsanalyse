import { describe, expect, it } from 'vitest'
import { createOneEuroFilter } from '../../src/core/signal/one-euro-filter'

/**
 * #168: Charakterisierungs-Tests für den One-Euro-Filter (Casiez et al. 2012).
 * Der Filter glättet stark, wenn sich wenig bewegt, und folgt schnell bei
 * großen Bewegungen. Zeit `t` kommt in Sekunden von außen.
 */
describe('createOneEuroFilter', () => {
  it('gibt den ersten Wert unverändert zurück', () => {
    const filter = createOneEuroFilter(1, 0, 1)
    expect(filter(0.7, 0)).toBe(0.7)
  })

  it('bleibt bei konstantem Eingang auf dem Wert', () => {
    const filter = createOneEuroFilter(1, 0, 1)
    filter(0.5, 0)
    for (let i = 1; i <= 10; i++) expect(filter(0.5, i / 30)).toBeCloseTo(0.5, 10)
  })

  it('gibt bei gleicher oder rückwärts laufender Zeit den letzten Wert zurück', () => {
    const filter = createOneEuroFilter(1, 0, 1)
    filter(0, 0)
    const last = filter(1, 1 / 30)
    expect(filter(5, 1 / 30)).toBe(last)
    expect(filter(5, 0)).toBe(last)
  })

  it('glättet einen Sprung mit dem Faktor r / (r + 1), r = 2π · minCutoff · Δt', () => {
    const filter = createOneEuroFilter(1, 0, 1)
    filter(0, 0)
    const r = 2 * Math.PI * 1 * (1 / 30)
    expect(filter(1, 1 / 30)).toBeCloseTo(r / (r + 1), 10)
  })

  it('folgt mit größerem beta einem schnellen Sprung stärker (weniger Nachlauf)', () => {
    const still = createOneEuroFilter(1, 0, 1)
    const fast = createOneEuroFilter(1, 1, 1)
    still(0, 0)
    fast(0, 0)
    expect(fast(1, 1 / 30)).toBeGreaterThan(still(1, 1 / 30))
  })

  it('nähert sich bei gehaltenem Sprung dem Zielwert an', () => {
    const filter = createOneEuroFilter(1, 0, 1)
    filter(0, 0)
    let y = 0
    for (let i = 1; i <= 300; i++) y = filter(1, i / 30)
    expect(y).toBeCloseTo(1, 3)
  })
})
