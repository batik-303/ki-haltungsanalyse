import { describe, expect, it } from 'vitest'
import { computeReadinessView } from '../../src/core/calibration/readiness-gate'

/**
 * Ticket #36: Ansichtsmodell für das Bereitschafts-Tor (Canvas-Rand-Feedback).
 * Ehrliche Sprache: „Spielhaltung", **nicht** „Geige erkannt" (Pose sieht keine
 * Objekte). Feedback-Philosophie: ermutigend, positiv, **kein Rot**.
 */
describe('computeReadinessView', () => {
  it('positioning: bittet dezent, sich vor die Kamera zu stellen', () => {
    const view = computeReadinessView({ phase: 'positioning', holdProgress: 0 })
    expect(view.tone).toBe('sapphire')
    expect(view.hint.length).toBeGreaterThan(0)
    expect(view.progress).toBe(0)
  })

  it('posture: fordert die Spielhaltung ein (ehrlicher Wortlaut aus dem Issue)', () => {
    const view = computeReadinessView({ phase: 'posture', holdProgress: 0 })
    expect(view.hint).toBe('Jetzt halte dein Instrument in Spielhaltung')
    expect(view.tone).toBe('sapphire')
  })

  it('posture + timedOut: lenkt sanft auf den manuellen Rückfall (kein Einsperren)', () => {
    const view = computeReadinessView({ phase: 'posture', holdProgress: 0, timedOut: true })
    expect(view.hint).toMatch(/Kalibrieren/)
    expect(view.tone).toBe('sapphire')
  })

  it('holding: ermutigt zum kurzen Halten und reicht den Fortschritt durch', () => {
    const view = computeReadinessView({ phase: 'holding', holdProgress: 0.6 })
    expect(view.tone).toBe('sapphire')
    expect(view.progress).toBeCloseTo(0.6)
  })

  it('armed: bestätigt die erkannte Haltung im Erfolgs-Ton', () => {
    const view = computeReadinessView({ phase: 'armed', holdProgress: 1 })
    expect(view.tone).toBe('success')
    expect(view.progress).toBe(1)
  })

  it('spricht nirgends von „Geige erkannt" (ehrlich: Pose erkennt keine Objekte)', () => {
    const phases = ['positioning', 'posture', 'holding', 'armed'] as const
    for (const phase of phases) {
      const view = computeReadinessView({ phase, holdProgress: 0.5 })
      expect(view.hint).not.toMatch(/Geige erkannt/i)
    }
  })

  it('nutzt in keinem Zustand einen Rot-/Fehler-Ton', () => {
    const phases = ['positioning', 'posture', 'holding', 'armed'] as const
    const tones = phases.map((phase) => computeReadinessView({ phase, holdProgress: 0.5 }).tone)
    expect(tones).not.toContain('amber')
    expect(new Set(tones)).toEqual(new Set(['sapphire', 'success']))
  })
})
