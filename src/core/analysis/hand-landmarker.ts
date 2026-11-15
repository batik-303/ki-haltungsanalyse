import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { Landmark } from '../types'

export interface LeftHandDetection {
  landmarks: Landmark[]
  /** Sicherheit der Links/Rechts-Einordnung (nicht der Sichtbarkeit, #74). */
  handednessScore: number
}

/** Unterarm aus der Körper-Erkennung (Pose 13 → 15) in Bildkoordinaten. */
export interface ArmReference {
  elbow: { x: number; y: number }
  wrist: { x: number; y: number }
  /** Seitenverhältnis Breite / Höhe des Bildes. */
  aspect: number
}

/**
 * Größter Abstand Hand-Handgelenk (Hand 0) ↔ Körper-Handgelenk (Pose 15), in
 * Unterarm-Längen (#199). Die Bogenhand liegt weit darüber, die Griffhand
 * meist deutlich darunter. Feinstellung über das Diagnose-Log (`hand-pick`).
 */
export const MAX_HAND_WRIST_DISTANCE = 0.5

/** Eine erkannte Hand, wie die Auswahl sie sieht (auch fürs Diagnose-Log). */
export interface HandCandidate {
  label: string
  /** Abstand zum Körper-Handgelenk in Unterarm-Längen; ohne Arm `null`. */
  distance: number | null
}

export interface HandSelection {
  detection: LeftHandDetection | null
  candidates: HandCandidate[]
  /** Index der gewählten Hand in `candidates`, sonst -1. */
  chosen: number
}

function distanceToWrist(hand: Landmark[] | undefined, arm: ArmReference): number | null {
  const handWrist = hand?.[0]
  const forearm = Math.hypot((arm.wrist.x - arm.elbow.x) * arm.aspect, arm.wrist.y - arm.elbow.y)
  if (!handWrist || forearm === 0) return null
  return Math.hypot((handWrist.x - arm.wrist.x) * arm.aspect, handWrist.y - arm.wrist.y) / forearm
}

/**
 * Wählt die Griffhand (anatomisch links) aus einem HandLandmarker-Ergebnis.
 *
 * Mit Arm (#199): die Hand, deren Handgelenk am nächsten am Körper-Handgelenk
 * liegt und höchstens `MAX_HAND_WRIST_DISTANCE` entfernt ist; sonst keine Hand
 * (→ Grau). Das Etikett zählt nur als Sicherheit: „Left“ = Score, sonst
 * 1 − Score. So misst die App nie an der Bogenhand, auch wenn sie „Left“ heißt.
 *
 * Ohne Arm (kein Körper im Bild): wie bisher die erste Hand mit „Left“.
 */
export function selectArmHand(result: HandLandmarkerResult | null | undefined, arm?: ArmReference): HandSelection {
  const hands = (result?.landmarks ?? []) as unknown as Landmark[][]
  const handedness = result?.handedness ?? result?.handednesses ?? []
  const candidates: HandCandidate[] = hands.map((hand, i) => ({
    label: handedness[i]?.[0]?.categoryName ?? '',
    distance: arm ? distanceToWrist(hand, arm) : null,
  }))

  let chosen = -1
  if (arm) {
    let bestDistance = MAX_HAND_WRIST_DISTANCE
    candidates.forEach((c, i) => {
      if (c.distance !== null && c.distance <= bestDistance) {
        chosen = i
        bestDistance = c.distance
      }
    })
  } else {
    chosen = candidates.findIndex((c) => c.label === 'Left')
  }

  const hand = hands[chosen]
  const cat = handedness[chosen]?.[0]
  if (!hand || !cat) return { detection: null, candidates, chosen: -1 }
  const handednessScore = cat.categoryName === 'Left' ? cat.score : 1 - cat.score
  return { detection: { landmarks: hand, handednessScore }, candidates, chosen }
}

/** Die Griffhand samt Sicherheit (siehe `selectArmHand`), oder null. */
export function pickLeftHandDetection(
  result: HandLandmarkerResult | null | undefined,
  arm?: ArmReference,
): LeftHandDetection | null {
  return selectArmHand(result, arm).detection
}

/** Nur die Punkte der Griffhand (siehe `selectArmHand`). */
export function pickLeftHand(result: HandLandmarkerResult | null | undefined, arm?: ArmReference): Landmark[] | null {
  return pickLeftHandDetection(result, arm)?.landmarks ?? null
}
