import { describe, expect, it } from 'vitest'
import { computeDistanceGuidance } from '../../src/core/calibration/distance-guidance'

/**
 * Punkt 2 (App-Test): Vor dem „bereit"-Sagen fehlte eine Richtungs-Anweisung,
 * wie weit man von der Kamera weg ist. `checkDistance` kennt die Richtung
 * bereits (`too-close`/`too-far`), sie wurde aber nie angezeigt. Diese reine
 * Funktion bildet den Positionierungs-Status auf einen ruhigen, positiven
 * Hinweis ab — Feedback-Grundsatz „kein Rot", keine Fehlersprache.
 */
describe('computeDistanceGuidance', () => {
  it('bittet bei zu großer Entfernung, näher zu kommen', () => {
    const g = computeDistanceGuidance('too-far')
    expect(g.show).toBe(true)
    expect(g.message).toMatch(/näher/i)
  })

  it('bittet bei zu geringer Entfernung, ein Stück zurückzugehen', () => {
    const g = computeDistanceGuidance('too-close')
    expect(g.show).toBe(true)
    expect(g.message).toMatch(/zurück|weiter|weg/i)
  })

  it('führt ins Bild, wenn kein Körper erkannt wird', () => {
    const g = computeDistanceGuidance('no-body')
    expect(g.show).toBe(true)
    expect(g.message).toMatch(/bild|kamera/i)
  })

  it('zeigt bei gutem Abstand keinen Hinweis (das Randglühen bestätigt)', () => {
    const g = computeDistanceGuidance('good')
    expect(g.show).toBe(false)
    expect(g.message).toBe('')
  })

  it('nutzt keine Fehler-/Negativ-Sprache', () => {
    const messages = (['too-far', 'too-close', 'no-body', 'good'] as const)
      .map((s) => computeDistanceGuidance(s).message)
      .join(' ')
      .toLowerCase()
    for (const bad of ['falsch', 'fehler', 'schlecht', 'nicht erkannt']) {
      expect(messages).not.toContain(bad)
    }
  })
})
