import type { Landmark, WristMasterPrint, SensitivityPreset } from '../types'

/**
 * Compute the angle at the wrist formed by elbow → wrist → index finger.
 * Straight line = 180°. Returns degrees.
 */
export function computeWristAngle(elbow: Landmark, wrist: Landmark, index: Landmark): number {
  const v1x = elbow.x - wrist.x
  const v1y = elbow.y - wrist.y
  const v2x = index.x - wrist.x
  const v2y = index.y - wrist.y

  const dot = v1x * v2x + v1y * v2y
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)

  if (mag1 === 0 || mag2 === 0) return 180
  return Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * (180 / Math.PI)
}

/**
 * Determine bend direction via cross product z-component.
 * Positive = hand bends outward/up, negative = inward/down.
 */
export function computeWristBendDirection(elbow: Landmark, wrist: Landmark, index: Landmark): number {
  const v1x = elbow.x - wrist.x
  const v1y = elbow.y - wrist.y
  const v2x = index.x - wrist.x
  const v2y = index.y - wrist.y
  return v1x * v2y - v1y * v2x
}

/**
 * Update the locked bend direction. Only changes when angle deviation > 5°.
 */
export function updateBendLock(
  angleDiff: number,
  bendDir: number,
  refBendDir: number,
  currentLock: boolean,
): boolean {
  if (angleDiff > 5) {
    return (bendDir - refBendDir) >= 0
  }
  return currentLock
}

/**
 * Map wrist angle deviation to a tension target (0-100).
 */
export function computeWristTensionTarget(
  angleDiff: number,
  sensitivity: SensitivityPreset,
): number {
  if (angleDiff <= sensitivity.wristStart) return 0
  const range = sensitivity.wristFull - sensitivity.wristStart
  if (range <= 0) return 0
  return Math.min(100, ((angleDiff - sensitivity.wristStart) / range) * 100)
}

/**
 * Full wrist analysis for a single frame.
 */
export function analyzeWrist(
  elbow: Landmark,
  wrist: Landmark,
  index: Landmark,
  masterPrint: WristMasterPrint,
  sensitivity: SensitivityPreset,
) {
  const currentAngle = computeWristAngle(elbow, wrist, index)
  const bendDir = computeWristBendDirection(elbow, wrist, index)
  const angleDiff = Math.abs(currentAngle - masterPrint.wristAngle)

  return {
    currentAngle,
    angleDiff,
    bendDir,
    tensionTarget: computeWristTensionTarget(angleDiff, sensitivity),
  }
}
