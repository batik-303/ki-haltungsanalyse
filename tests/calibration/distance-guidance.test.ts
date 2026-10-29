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

  it('bestätigt bei gutem Abstand mit „Abstand passt“ und lädt zur Spielhaltung ein (#115, #116)', () => {
    const g = computeDistanceGuidance('good')
    expect(g.show).toBe(true)
    expect(g.message).toBe('Abstand passt')
    expect(g.detail).toBe('Nimm deine Spielhaltung ein – so, wie du gleich üben willst')
    expect(g.tone).toBe('blue')
  })

  it('führt mit gelbem Punkt, solange der Abstand nicht passt (#115)', () => {
    for (const status of ['too-far', 'too-close', 'no-body'] as const) {
      const g = computeDistanceGuidance(status)
      expect(g.tone).toBe('yellow')
      expect(g.detail).toBe('')
    }
  })

  it('zeigt nach dem Speichern (drifted) kein Kärtchen', () => {
    expect(computeDistanceGuidance('drifted').show).toBe(false)
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
