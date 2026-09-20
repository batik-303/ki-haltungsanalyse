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
 */
export type CalibrationPhase =
  | { kind: 'counting'; count: number }
  | { kind: 'retry'; reason?: CalibrationFailureReason }

/**
 * Semantischer Ton — die Komponente mappt ihn auf die konkreten Farben.
 * Geteilt mit dem Bereitschafts-Tor (#36), das `success` für den grünen
 * „passt / los geht's"-Zustand nutzt; das Kalibrier-Overlay selbst zeigt seit
 * #58 nur noch `sapphire` (Countdown) und `accent` (Nochmal versuchen).
 *
 * `accent` hieß früher `amber` und wurde als Warn-Amber `#ffb800` gezeichnet.
 * Das ist der Ton der Haltungs-Warnung — ein Bedienknopf darin liest sich wie
 * ein Haltungssignal. Der Ton trägt jetzt den Marken-Accent (Geigenholz-Gold).
 */
export type CalibrationTone = 'sapphire' | 'success' | 'accent'

/** Was die CTA auslöst — oder `none`, solange der Countdown läuft. */
export type CalibrationCtaAction = 'recalibrate' | 'none'

export interface CalibrationView {
  title: string
  hint: string
  /**
   * Zeichen im Mittelpunkt: Restsekunde (großer, klarer Zähler) oder
   * Wiederhol-Pfeil. Seit T4 #60 ohne umgebenden Ring — nur die reine Zahl
   * (Variante A „Randglühen", T1 #57).
   */
  glyph: string
  tone: CalibrationTone
  cta: string
  ctaIcon: string
  ctaAction: CalibrationCtaAction
  ctaBusy: boolean
}

export function computeCalibrationView(phase: CalibrationPhase): CalibrationView {
  switch (phase.kind) {
    case 'counting':
      return {
        title: 'Haltung einnehmen',
        hint: 'Halte deine optimale Spielhaltung …',
        glyph: String(phase.count),
        tone: 'sapphire',
        cta: 'Speichere …',
        ctaIcon: '↻',
        ctaAction: 'none',
        ctaBusy: true,
      }
    case 'retry':
      return {
        title: 'Nochmal versuchen',
        hint:
          phase.reason === 'no_hand'
            ? 'Hand sichtbar ins Bild halten und „bereit“ sagen'
            : phase.reason === 'no_posture'
              ? 'Alles gut — nimm ruhig deine Spielhaltung ein und sag „bereit“'
              : 'Haltung noch nicht erkannt — ruhig hinstellen und „bereit“ sagen',
        glyph: '↻',
        tone: 'accent',
        cta: 'Erneut versuchen',
        ctaIcon: '↻',
        ctaAction: 'recalibrate',
        ctaBusy: false,
      }
  }
}
