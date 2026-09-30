import type { Landmark } from '../types'

// Grau-Bedingung aus #74 (docs/research/mediapipe-hand-visibility.md). Der
// HandLandmarker liefert kein `visibility` je Punkt; die Sicht wird aus vier
// Frame-Signalen zusammengesetzt.
const MIN_HANDEDNESS_SCORE = 0.6
const MIN_FORESHORTENING_CONFIDENCE = 0.5

export interface AnchorVisibilityInput {
  /** Linke Hand aus `pickLeftHandDetection`, oder null. */
  hand: Landmark[] | null
  /** Sicherheit der Links/Rechts-Einordnung (`handedness[i][0].score`). */
  handednessScore: number | undefined
  /** `computeForeshorteningConfidence` des Unterarms. */
  foreshorteningConfidence: number
}

/**
 * Sieht die Kamera das Handgelenk sicher genug für eine Farbe? Ungefiltert pro
 * Frame; die Zeit-Hysterese bis Grau liegt in `createAnchorColorState`.
 */
export function computeAnchorVisibility({ hand, handednessScore, foreshorteningConfidence }: AnchorVisibilityInput): boolean {
  const wrist = hand?.[0]
  if (!wrist) return false
  if ((handednessScore ?? 0) < MIN_HANDEDNESS_SCORE) return false
  if (wrist.x < 0 || wrist.x > 1 || wrist.y < 0 || wrist.y > 1) return false
  return foreshorteningConfidence >= MIN_FORESHORTENING_CONFIDENCE
}
