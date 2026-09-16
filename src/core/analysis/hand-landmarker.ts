import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { Landmark } from '../types'

/**
 * Pick the Left-handedness hand from a HandLandmarker result, or null if no
 * hand or no Left-categorized hand is present. The violinist's grip hand
 * (Subject anatomy = left) is the one we analyze; selfie-camera mirroring is
 * handled in MediaPipe's handedness output so 'Left' maps to the user's
 * actual left hand.
 */
export function pickLeftHand(result: HandLandmarkerResult | null | undefined): Landmark[] | null {
  if (!result || !result.landmarks || result.landmarks.length === 0) return null
  const handedness = result.handedness ?? result.handednesses ?? []
  for (let i = 0; i < result.landmarks.length; i++) {
    const cats = handedness[i]
    if (!cats || cats.length === 0) continue
    if (cats[0]?.categoryName === 'Left') {
      return result.landmarks[i] as unknown as Landmark[]
    }
  }
  return null
}
