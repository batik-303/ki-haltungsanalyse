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
  // Der Countdown steht seit #118 nicht mehr in diesem Overlay: Kärtchen oben
  // + nur die Zahl in der Mitte zeigt `computeSaveSequenceView`. Der alte große
  // Text „Haltung einnehmen“ in der Mitte entfällt.
  it('kennt keinen Countdown-Zustand mehr (#118)', () => {
    // @ts-expect-error — `counting` gehört nicht mehr zu CalibrationPhase
    const view = computeCalibrationView({ kind: 'counting', count: 3 })
    expect(view?.title).not.toBe('Haltung einnehmen')
  })

  // Ein Erfolgs-Zustand mit „Session starten"-CTA entfällt bewusst (T2 #58):
  // eine gelungene Kalibrierung geht ohne Bestätigung direkt in die Analyse.
  // Das Overlay kennt daher nur noch `retry`.

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

    it('nennt bei fehlender Hand den konkreten Hinweis (auf „speichern" umgetextet, #111)', () => {
      const view = computeCalibrationView({ kind: 'retry', reason: 'no_hand' })
      expect(view.hint).toBe('Hand sichtbar ins Bild halten und „speichern“ sagen')
      expect(view.hint.toLowerCase()).not.toContain('kalibr')
    })

    it('lädt bei fehlender Spielhaltung sanft neu ein (weiche Erfassung, #59)', () => {
      const view = computeCalibrationView({ kind: 'retry', reason: 'no_posture' })
      expect(view.hint).toBe('Alles gut — nimm ruhig deine Spielhaltung ein und sag „speichern“')
      expect(view.tone).toBe('accent')
      expect(view.ctaAction).toBe('recalibrate')
    })

    it('gibt sonst einen allgemeinen, ermutigenden Hinweis (auf „speichern" umgetextet, #111)', () => {
      expect(computeCalibrationView({ kind: 'retry', reason: 'no_pose' }).hint).toBe(
        'Haltung noch nicht erkannt — ruhig hinstellen und „speichern“ sagen',
      )
      expect(computeCalibrationView({ kind: 'retry' }).hint).toBe(
        'Haltung noch nicht erkannt — ruhig hinstellen und „speichern“ sagen',
      )
    })
  })

  it('verwendet in keinem Zustand einen Rot-Ton', () => {
    const tones = [
      computeCalibrationView({ kind: 'retry', reason: 'no_hand' }).tone,
      computeCalibrationView({ kind: 'retry' }).tone,
    ]
    expect(tones).not.toContain('error')
    expect(new Set(tones)).toEqual(new Set(['accent']))
  })
})
