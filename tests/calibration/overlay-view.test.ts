import { describe, expect, it } from 'vitest'
import { computeCalibrationView } from '../../src/core/calibration/overlay-view'

/**
 * Ticket #28 (Karte #15): Variante C „Minimal HUD" für das Kalibrier-Overlay.
 * `computeCalibrationView` ist die reine Kernlogik — sie bildet die
 * Kalibrier-Phase auf das Ansichtsmodell (Titel, Hinweis, Ring, CTA) ab.
 * Grundsatz: positive Sprache, **kein Rot** — ein misslungener Versuch führt
 * in den Amber-Zustand „Nochmal versuchen", nicht in einen Fehler.
 */
describe('computeCalibrationView', () => {
  describe('Countdown (counting)', () => {
    it('zeigt die Restsekunde als Ring-Glyph und den sapphire-Ton', () => {
      const view = computeCalibrationView({ kind: 'counting', count: 3 })
      expect(view.title).toBe('Haltung einnehmen')
      expect(view.hint).toBe('Halte deine optimale Spielhaltung …')
      expect(view.glyph).toBe('3')
      expect(view.tone).toBe('sapphire')
      expect(view.ctaBusy).toBe(true)
      expect(view.ctaAction).toBe('none')
    })

    it('füllt den Ring anteilig zur Restzeit (count / 3)', () => {
      expect(computeCalibrationView({ kind: 'counting', count: 3 }).progress).toBeCloseTo(1)
      expect(computeCalibrationView({ kind: 'counting', count: 2 }).progress).toBeCloseTo(2 / 3)
      expect(computeCalibrationView({ kind: 'counting', count: 1 }).progress).toBeCloseTo(1 / 3)
    })

    it('begrenzt den Fortschritt auf 0..1 (kein Über-/Unterlauf)', () => {
      expect(computeCalibrationView({ kind: 'counting', count: 9 }).progress).toBe(1)
      expect(computeCalibrationView({ kind: 'counting', count: 0 }).progress).toBe(0)
      expect(computeCalibrationView({ kind: 'counting', count: -1 }).progress).toBe(0)
    })
  })

  describe('Erfolg (success)', () => {
    it('bestätigt gespeicherte Haltung, grüner Haken, CTA „Session starten"', () => {
      const view = computeCalibrationView({ kind: 'success' })
      expect(view.title).toBe('Haltung gespeichert')
      expect(view.glyph).toBe('✓')
      expect(view.tone).toBe('success')
      expect(view.progress).toBe(1)
      expect(view.cta).toBe('Session starten')
      expect(view.ctaIcon).toBe('▶')
      expect(view.ctaAction).toBe('start')
      expect(view.ctaBusy).toBe(false)
    })
  })

  describe('Nochmal versuchen (retry) — kein Rot', () => {
    it('nutzt den Amber-Ton und die Wiederhol-CTA', () => {
      const view = computeCalibrationView({ kind: 'retry' })
      expect(view.title).toBe('Nochmal versuchen')
      expect(view.glyph).toBe('↻')
      expect(view.tone).toBe('amber')
      expect(view.cta).toBe('Erneut kalibrieren')
      expect(view.ctaIcon).toBe('↻')
      expect(view.ctaAction).toBe('recalibrate')
      expect(view.ctaBusy).toBe(false)
    })

    it('nennt bei fehlender Hand den konkreten Hinweis', () => {
      const view = computeCalibrationView({ kind: 'retry', reason: 'no_hand' })
      expect(view.hint).toBe('Hand sichtbar ins Bild halten und erneut kalibrieren')
    })

    it('lädt bei fehlender Spielhaltung sanft neu ein (weiche Erfassung, #59)', () => {
      const view = computeCalibrationView({ kind: 'retry', reason: 'no_posture' })
      expect(view.hint).toBe('Alles gut — nimm ruhig deine Spielhaltung ein und sag „bereit“')
      expect(view.tone).toBe('amber')
      expect(view.ctaAction).toBe('recalibrate')
    })

    it('gibt sonst einen allgemeinen, ermutigenden Hinweis', () => {
      expect(computeCalibrationView({ kind: 'retry', reason: 'no_pose' }).hint).toBe(
        'Haltung noch nicht erkannt — ruhig hinstellen und erneut kalibrieren',
      )
      expect(computeCalibrationView({ kind: 'retry' }).hint).toBe(
        'Haltung noch nicht erkannt — ruhig hinstellen und erneut kalibrieren',
      )
    })
  })

  it('verwendet in keinem Zustand einen Rot-Ton', () => {
    const tones = [
      computeCalibrationView({ kind: 'counting', count: 2 }).tone,
      computeCalibrationView({ kind: 'success' }).tone,
      computeCalibrationView({ kind: 'retry', reason: 'no_hand' }).tone,
    ]
    expect(tones).not.toContain('error')
    expect(new Set(tones)).toEqual(new Set(['sapphire', 'success', 'amber']))
  })
})
