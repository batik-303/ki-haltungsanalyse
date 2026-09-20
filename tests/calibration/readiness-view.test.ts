import { describe, expect, it } from 'vitest'
import { computeReadinessView } from '../../src/core/calibration/readiness-gate'

/**
 * Ticket #59 (Karte #56): Ansichtsmodell fürs Distanz-Gate mit Auto-Start.
 *
 * Phasen: idle (ruhig, wartet auf den bewussten Auslöser) → waiting (Auslöser
 * kam, Abstand passt noch nicht; sanfte Führung + Auto-Start-Versprechen) →
 * armed (feuert). Feedback-Philosophie: ermutigend, **kein Rot** (nur sapphire /
 * success). Ehrlich: nie „Geige erkannt" (Pose sieht keine Objekte).
 */
describe('computeReadinessView', () => {
  it('idle: ruhig, lädt zum bewussten Auslöser ein', () => {
    const view = computeReadinessView({ phase: 'idle', timedOut: false })
    expect(view.tone).toBe('sapphire')
    expect(view.hint.length).toBeGreaterThan(0)
  })

  it('waiting: führt sanft zum Abstand und verspricht den Auto-Start', () => {
    const view = computeReadinessView({ phase: 'waiting', timedOut: false })
    expect(view.tone).toBe('sapphire')
    expect(view.hint.length).toBeGreaterThan(0)
  })

  it('waiting + timedOut: bleibt freundlich, lenkt sanft auf „Haltung speichern“', () => {
    const view = computeReadinessView({ phase: 'waiting', timedOut: true })
    expect(view.hint).toMatch(/Haltung speichern/)
    expect(view.tone).toBe('sapphire')
  })

  it('armed: bestätigt im Erfolgs-Ton', () => {
    const view = computeReadinessView({ phase: 'armed', timedOut: false })
    expect(view.tone).toBe('success')
  })

  it('spricht nirgends von „Geige erkannt" (ehrlich: Pose erkennt keine Objekte)', () => {
    const phases = ['idle', 'waiting', 'armed'] as const
    for (const phase of phases) {
      const view = computeReadinessView({ phase, timedOut: false })
      expect(view.hint).not.toMatch(/Geige erkannt/i)
    }
  })

  it('nutzt in keinem Zustand einen Rot-/Fehler-Ton', () => {
    const phases = ['idle', 'waiting', 'armed'] as const
    const tones = phases.map((phase) => computeReadinessView({ phase, timedOut: false }).tone)
    expect(tones).not.toContain('amber')
    expect(new Set(tones)).toEqual(new Set(['sapphire', 'success']))
  })
})
