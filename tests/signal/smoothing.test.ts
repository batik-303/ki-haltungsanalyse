import { describe, expect, it } from 'vitest'
import { createMovingAverage } from '../../src/core/signal/smoothing'

/**
 * #168: Charakterisierungs-Tests für den gleitenden Mittelwert.
 * Benutzt werden `push` und `reset` (Schulter-Modus im Pose-Hook).
 */
describe('createMovingAverage', () => {
  it('gibt nach jedem push den Mittelwert aller Werte im Fenster zurück', () => {
    const avg = createMovingAverage(3)
    expect(avg.push(3)).toBe(3)
    expect(avg.push(6)).toBe(4.5)
    expect(avg.push(9)).toBe(6)
  })

  it('wirft bei vollem Fenster den ältesten Wert hinaus', () => {
    const avg = createMovingAverage(3)
    avg.push(3)
    avg.push(6)
    avg.push(9)
    expect(avg.push(12)).toBe(9) // (6 + 9 + 12) / 3
  })

  it('hat standardmäßig ein Fenster von 30 Werten', () => {
    const avg = createMovingAverage()
    for (let i = 0; i < 30; i++) avg.push(0)
    expect(avg.push(31)).toBe(31 / 30)
  })

  it('vergisst nach reset alle alten Werte', () => {
    const avg = createMovingAverage(3)
    avg.push(100)
    avg.push(100)
    avg.reset()
    expect(avg.push(5)).toBe(5)
  })
})
