import type { DistanceStatus } from './distance-check'

/**
 * Positionierungs-Status vor der Kalibrierung: der Distanz-Status plus der Fall
 * „kein Körper im Bild". `drifted` tritt erst nach der Kalibrierung auf und
 * spielt hier keine Rolle.
 */
export type PositioningStatus = DistanceStatus | 'no-body'

export interface DistanceGuidance {
  /** Ob ein Distanz-Hinweis nötig ist. Bei gutem Abstand führt allein das Randglühen. */
  show: boolean
  /** Ruhiger, positiver Hinweis — kein Rot, keine Fehlersprache (Feedback-Grundsatz). */
  message: string
}

/**
 * Bildet den Positionierungs-Status auf einen freundlichen Richtungs-Hinweis ab.
 * Die Richtung („näher"/„zurück") war schon in `checkDistance` vorhanden, wurde
 * aber nie sichtbar gemacht — hier wird sie zu einem ermutigenden Satz.
 */
export function computeDistanceGuidance(status: PositioningStatus): DistanceGuidance {
  switch (status) {
    case 'too-far':
      return { show: true, message: 'Komm ruhig etwas näher zur Kamera' }
    case 'too-close':
      return { show: true, message: 'Geh ein kleines Stück zurück' }
    case 'no-body':
      return { show: true, message: 'Stell dich mittig ins Bild' }
    case 'good':
    case 'drifted':
      return { show: false, message: '' }
  }
}
