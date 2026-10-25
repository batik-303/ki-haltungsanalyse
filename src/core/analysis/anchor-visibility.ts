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
 * Frame; die Zeit-Hysterese bis Grau liegt in `createAnchorGreyGate`.
 */
export function computeAnchorVisibility({ hand, handednessScore, foreshorteningConfidence }: AnchorVisibilityInput): boolean {
  const wrist = hand?.[0]
  if (!wrist) return false
  if ((handednessScore ?? 0) < MIN_HANDEDNESS_SCORE) return false
  if (wrist.x < 0 || wrist.x > 1 || wrist.y < 0 || wrist.y > 1) return false
  return foreshorteningConfidence >= MIN_FORESHORTENING_CONFIDENCE
}

/** Ein Zustand für Anker, periphere Leiste und Statistik (#92). */
export type AnchorColor = 'blue' | 'yellow' | 'grey'

// Zeit-Hysterese aus #74: grau erst nach dieser Zeit ohne sichere Sicht,
// zurück erst nach dieser Zeit sicherer Sicht (neu messen).
const TO_GREY_MS = 250
const REMEASURE_MS = 150

export interface AnchorGreyGateInput {
  /** `computeAnchorVisibility` dieses Frames. */
  visible: boolean
  nowMs: number
  /** Blau/Gelb messen — wird nur bei sicherer Sicht aufgerufen. */
  measureIsBlue: () => boolean
}

/**
 * Factory: Grau-Tor vor der Blau/Gelb-Farbe (#92). Ohne sichere Sicht wird
 * nicht gemessen; die letzte Farbe bleibt stehen, bis nach `TO_GREY_MS` grau
 * wird. Wieder sichtbar: `REMEASURE_MS` lang messen, aber grau zeigen — dann
 * die gemessene Farbe.
 */
export function createAnchorGreyGate() {
  let color: AnchorColor = 'blue'
  let hiddenSince: number | null = null
  let visibleSince: number | null = null

  function update({ visible, nowMs, measureIsBlue }: AnchorGreyGateInput): AnchorColor {
    if (!visible) {
      hiddenSince ??= nowMs
      visibleSince = null
      if (nowMs - hiddenSince >= TO_GREY_MS) color = 'grey'
      return color
    }
    hiddenSince = null
    const measured: AnchorColor = measureIsBlue() ? 'blue' : 'yellow'
    if (color === 'grey') {
      visibleSince ??= nowMs
      if (nowMs - visibleSince < REMEASURE_MS) return color
      visibleSince = null
    }
    color = measured
    return color
  }

  return { update }
}
