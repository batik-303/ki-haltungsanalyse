/**
 * Reine Ansichtslogik für das Kalibrier-Overlay (Variante C „Minimal HUD", Ticket #28).
 *
 * Bildet die Kalibrier-Phase auf ein Ansichtsmodell ab: Titel, Hinweis, Glyph
 * (großer Zähler, kein Ring seit T4 #60), Ton und CTA. Bewusst frei von
 * React/DOM und von literalen Styling-Farben — die
 * Komponente übersetzt `tone` in die konkreten Glas-Farben.
 *
 * Grundsatz der Feedback-Philosophie: **kein Rot**. Ein misslungener Versuch ist
 * kein Fehler, sondern der ermutigende Accent-Zustand „Nochmal versuchen".
 */

/** Warum ein Kalibrier-Versuch nicht gespeichert werden konnte. */
export type CalibrationFailureReason = 'no_pose' | 'no_hand' | 'no_posture'

/**
 * Zustände, die das Overlay tragen muss. `idle` = Overlay ausgeblendet.
 *
 * Kein `success`-Zustand mehr (#58): eine gelungene Kalibrierung geht ohne
 * Bestätigung direkt in die laufende Analyse über — das Overlay verschwindet.
 * Kein `counting` mehr (#118): das ruhige Speichern zeigt `computeSaveSequenceView`
 * (Kärtchen oben, nur die Zahl in der Mitte).
 */
export type CalibrationPhase = { kind: 'retry'; reason?: CalibrationFailureReason }

/**
 * Semantischer Ton — die Komponente mappt ihn auf die konkreten Farben.
 * Geteilt mit dem Bereitschafts-Tor (#36), das `success` für den grünen
 * „passt / los geht's"-Zustand nutzt; das Kalibrier-Overlay selbst zeigt seit
 * #118 nur noch `accent` (Nochmal versuchen).
 *
 * `accent` hieß früher `amber` und wurde als Warn-Amber `#ffb800` gezeichnet.
 * Das ist der Ton der Haltungs-Warnung — ein Bedienknopf darin liest sich wie
 * ein Haltungssignal. Der Ton trägt jetzt den Marken-Accent (Geigenholz-Gold).
 */
export type CalibrationTone = 'sapphire' | 'success' | 'accent'

/** Was die CTA auslöst. */
export type CalibrationCtaAction = 'recalibrate'

export interface CalibrationView {
  title: string
  hint: string
  /** Zeichen im Mittelpunkt: der Wiederhol-Pfeil. */
  glyph: string
  tone: CalibrationTone
  cta: string
  ctaIcon: string
  ctaAction: CalibrationCtaAction
  ctaBusy: boolean
}

export function computeCalibrationView(phase: CalibrationPhase): CalibrationView {
  return {
    title: 'Nochmal versuchen',
    hint:
      phase.reason === 'no_hand'
        ? 'Hand sichtbar ins Bild halten und „speichern“ sagen'
        : phase.reason === 'no_posture'
          ? 'Alles gut — nimm ruhig deine Spielhaltung ein und sag „speichern“'
          : 'Haltung noch nicht erkannt — ruhig hinstellen und „speichern“ sagen',
    glyph: '↻',
    tone: 'accent',
    cta: 'Erneut versuchen',
    ctaIcon: '↻',
    ctaAction: 'recalibrate',
    ctaBusy: false,
  }
}
