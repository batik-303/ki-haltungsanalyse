import { describe, expect, it } from 'vitest'
import { computeCalibrationView } from '../../src/core/calibration/overlay-view'

/**
 * Ticket #28 (Karte #15): Variante C „Minimal HUD" für das Kalibrier-Overlay.
 * `computeCalibrationView` ist die reine Kernlogik — sie bildet die
 * Kalibrier-Phase auf das Ansichtsmodell (Titel, Hinweis, Ring, CTA) ab.
 * Grundsatz: positive Sprache, **kein Rot** — ein misslungener Versuch führt
 * in den ermutigenden Accent-Zustand „Nochmal versuchen", nicht in einen Fehler.
 */
describe('computeCalibrationView', () => {
  describe('Countdown (counting)', () => {
    it('zeigt die Restsekunde als großen Zähler (nur die Zahl) und den sapphire-Ton', () => {
      const view = computeCalibrationView({ kind: 'counting', count: 3 })
      expect(view.title).toBe('Haltung einnehmen')
      expect(view.hint).toBe('Halte deine optimale Spielhaltung …')
      expect(view.glyph).toBe('3')
      expect(view.tone).toBe('sapphire')
      expect(view.ctaBusy).toBe(true)
      expect(view.ctaAction).toBe('none')
    })

    it('zählt die reine Restsekunde herunter (kein Ring, kein Fortschritt)', () => {
      // T4 #60: Variante A zeigt nur die klare Zahl — kein Ring, kein
      // `progress`-Feld mehr im Ansichtsmodell.
      expect(computeCalibrationView({ kind: 'counting', count: 2 }).glyph).toBe('2')
      expect(computeCalibrationView({ kind: 'counting', count: 1 }).glyph).toBe('1')
      expect('progress' in computeCalibrationView({ kind: 'counting', count: 2 })).toBe(false)
    })

    it('vermeidet in der CTA das Wort „kalibrieren" (T4 #60)', () => {
      expect(computeCalibrationView({ kind: 'counting', count: 3 }).cta.toLowerCase()).not.toContain('kalibr')
    })
  })

  // Ein Erfolgs-Zustand mit „Session starten"-CTA entfällt bewusst (T2 #58):
  // eine gelungene Kalibrierung geht ohne Bestätigung direkt in die Analyse.
  // Das Overlay kennt daher nur noch `counting` und `retry`.

  describe('Nochmal versuchen (retry) — kein Rot', () => {
    it('nutzt den Accent-Ton und die Wiederhol-CTA (ohne das Wort „kalibrieren")', () => {
      const view = computeCalibrationView({ kind: 'retry' })
      expect(view.title).toBe('Nochmal versuchen')
      expect(view.glyph).toBe('↻')
      expect(view.tone).toBe('accent')
      expect(view.cta).toBe('Erneut versuchen')
      expect(view.cta.toLowerCase()).not.toContain('kalibr')
      expect(view.ctaIcon).toBe('↻')
      expect(view.ctaAction).toBe('recalibrate')
      expect(view.ctaBusy).toBe(false)
    })

    it('nennt bei fehlender Hand den konkreten Hinweis (auf „bereit" umgetextet)', () => {
      const view = computeCalibrationView({ kind: 'retry', reason: 'no_hand' })
      expect(view.hint).toBe('Hand sichtbar ins Bild halten und „bereit“ sagen')
      expect(view.hint.toLowerCase()).not.toContain('kalibr')
    })

    it('lädt bei fehlender Spielhaltung sanft neu ein (weiche Erfassung, #59)', () => {
      const view = computeCalibrationView({ kind: 'retry', reason: 'no_posture' })
      expect(view.hint).toBe('Alles gut — nimm ruhig deine Spielhaltung ein und sag „bereit“')
      expect(view.tone).toBe('accent')
      expect(view.ctaAction).toBe('recalibrate')
    })

    it('gibt sonst einen allgemeinen, ermutigenden Hinweis (auf „bereit" umgetextet)', () => {
      expect(computeCalibrationView({ kind: 'retry', reason: 'no_pose' }).hint).toBe(
        'Haltung noch nicht erkannt — ruhig hinstellen und „bereit“ sagen',
      )
      expect(computeCalibrationView({ kind: 'retry' }).hint).toBe(
        'Haltung noch nicht erkannt — ruhig hinstellen und „bereit“ sagen',
      )
    })
  })

  it('verwendet in keinem Zustand einen Rot-Ton', () => {
    const tones = [
      computeCalibrationView({ kind: 'counting', count: 2 }).tone,
      computeCalibrationView({ kind: 'retry', reason: 'no_hand' }).tone,
    ]
    expect(tones).not.toContain('error')
    expect(new Set(tones)).toEqual(new Set(['sapphire', 'accent']))
  })
})
