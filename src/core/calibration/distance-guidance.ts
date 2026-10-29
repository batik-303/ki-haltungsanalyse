import type { DistanceStatus } from './distance-check'
import type { DistanceGlowTone } from './distance-glow'

/**
 * Positionierungs-Status vor der Kalibrierung: der Distanz-Status plus der Fall
 * „kein Körper im Bild". `drifted` tritt erst nach der Kalibrierung auf und
 * spielt hier keine Rolle.
 */
export type PositioningStatus = DistanceStatus | 'no-body'

export interface DistanceGuidance {
  /** Ob ein Kärtchen erscheint. Nach dem Speichern (`drifted`) nicht mehr. */
  show: boolean
  /** Ruhiger, positiver Hinweis — kein Rot, keine Fehlersprache (Feedback-Grundsatz). */
  message: string
  /** Kleine zweite Zeile unter `message` (nur bei „Abstand passt", #116); sonst leer. */
  detail: string
  /** Farbe des Punkts — dieselbe wie das Randglühen (#115). */
  tone: DistanceGlowTone
}

/**
 * Bildet den Positionierungs-Status auf einen freundlichen Richtungs-Hinweis ab.
 * Die Richtung („näher"/„zurück") war schon in `checkDistance` vorhanden, wurde
 * aber nie sichtbar gemacht — hier wird sie zu einem ermutigenden Satz.
 *
 * #115: Das Kärtchen erklärt das Randglühen — gelber Punkt, solange der Abstand
 * nicht passt; blauer Punkt und „Abstand passt", sobald er passt (Text aus #116).
 */
export function computeDistanceGuidance(status: PositioningStatus): DistanceGuidance {
  switch (status) {
    case 'too-far':
      return { show: true, message: 'Komm ruhig etwas näher zur Kamera', detail: '', tone: 'yellow' }
    case 'too-close':
      return { show: true, message: 'Geh ein kleines Stück zurück', detail: '', tone: 'yellow' }
    case 'no-body':
      return { show: true, message: 'Stell dich mittig ins Bild', detail: '', tone: 'yellow' }
    case 'good':
      return {
        show: true,
        message: 'Abstand passt',
        detail: 'Nimm deine Spielhaltung ein – so, wie du gleich üben willst',
        tone: 'blue',
      }
    case 'drifted':
      return { show: false, message: '', detail: '', tone: 'blue' }
  }
}
