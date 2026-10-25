import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { Landmark } from '../types'

export interface LeftHandDetection {
  landmarks: Landmark[]
  /** Sicherheit der Links/Rechts-Einordnung (nicht der Sichtbarkeit, #74). */
  handednessScore: number
}

/**
 * Pick the Left-handedness hand from a HandLandmarker result, or null if no
 * hand or no Left-categorized hand is present. The violinist's grip hand
 * (Subject anatomy = left) is the one we analyze; selfie-camera mirroring is
 * handled in MediaPipe's handedness output so 'Left' maps to the user's
 * actual left hand.
 */
export function pickLeftHandDetection(result: HandLandmarkerResult | null | undefined): LeftHandDetection | null {
  if (!result || !result.landmarks || result.landmarks.length === 0) return null
  const handedness = result.handedness ?? result.handednesses ?? []
  for (let i = 0; i < result.landmarks.length; i++) {
    const cat = handedness[i]?.[0]
    if (cat?.categoryName === 'Left') {
      return { landmarks: result.landmarks[i] as unknown as Landmark[], handednessScore: cat.score }
    }
  }
  return null
}

/** Nur die Punkte der linken Hand (siehe `pickLeftHandDetection`). */
export function pickLeftHand(result: HandLandmarkerResult | null | undefined): Landmark[] | null {
  return pickLeftHandDetection(result)?.landmarks ?? null
}
