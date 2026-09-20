/**
 * Reine Ansichtslogik für das Kalibrier-Overlay (Variante C „Minimal HUD", Ticket #28).
 *
 * Bildet die Kalibrier-Phase auf ein Ansichtsmodell ab: Titel, Hinweis, Ring-Glyph,
 * Ton und CTA. Bewusst frei von React/DOM und von literalen Styling-Farben — die
 * Komponente übersetzt `tone` in die konkreten Glas-Farben.
 *
 * Grundsatz der Feedback-Philosophie: **kein Rot**. Ein misslungener Versuch ist
 * kein Fehler, sondern der ermutigende Amber-Zustand „Nochmal versuchen".
 */

/** Warum ein Kalibrier-Versuch nicht gespeichert werden konnte. */
export type CalibrationFailureReason = 'no_pose' | 'no_hand' | 'no_posture'

/**
 * Zustände, die das Overlay tragen muss. `idle` = Overlay ausgeblendet.
 *
 * Kein `success`-Zustand mehr (#58): eine gelungene Kalibrierung geht ohne
 * Bestätigung direkt in die laufende Analyse über — das Overlay verschwindet.
 */
export type CalibrationPhase =
  | { kind: 'counting'; count: number }
  | { kind: 'retry'; reason?: CalibrationFailureReason }

/**
 * Semantischer Ton — die Komponente mappt ihn auf die literalen Glas-Farben.
 * Geteilt mit dem Bereitschafts-Tor (#36), das `success` für den grünen
 * „passt / los geht's"-Zustand nutzt; das Kalibrier-Overlay selbst zeigt seit
 * #58 nur noch `sapphire` (Countdown) und `amber` (Nochmal versuchen).
 */
export type CalibrationTone = 'sapphire' | 'success' | 'amber'

/** Was die CTA auslöst — oder `none`, solange der Countdown läuft. */
export type CalibrationCtaAction = 'recalibrate' | 'none'

export interface CalibrationView {
  title: string
  hint: string
  /** Zeichen in der Ring-Mitte: Restsekunde, Haken oder Wiederhol-Pfeil. */
  glyph: string
  tone: CalibrationTone
  /** Ring-Füllung 0..1. */
  progress: number
  cta: string
  ctaIcon: string
  ctaAction: CalibrationCtaAction
  ctaBusy: boolean
}

const COUNTDOWN_SECONDS = 3

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export function computeCalibrationView(phase: CalibrationPhase): CalibrationView {
  switch (phase.kind) {
    case 'counting':
      return {
        title: 'Haltung einnehmen',
        hint: 'Halte deine optimale Spielhaltung …',
        glyph: String(phase.count),
        tone: 'sapphire',
        progress: clamp01(phase.count / COUNTDOWN_SECONDS),
        cta: 'Kalibriere …',
        ctaIcon: '↻',
        ctaAction: 'none',
        ctaBusy: true,
      }
    case 'retry':
      return {
        title: 'Nochmal versuchen',
        hint:
          phase.reason === 'no_hand'
            ? 'Hand sichtbar ins Bild halten und erneut kalibrieren'
            : phase.reason === 'no_posture'
              ? 'Alles gut — nimm ruhig deine Spielhaltung ein und sag „bereit“'
              : 'Haltung noch nicht erkannt — ruhig hinstellen und erneut kalibrieren',
        glyph: '↻',
        tone: 'amber',
        progress: 1,
        cta: 'Erneut kalibrieren',
        ctaIcon: '↻',
        ctaAction: 'recalibrate',
        ctaBusy: false,
      }
  }
}
