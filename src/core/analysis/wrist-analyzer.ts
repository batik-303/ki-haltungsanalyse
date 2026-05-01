/**
 * Status-Tracker für Deadzone (±10°) und Hysterese (200ms) für "repariert"-Status.
 * Muss als Closure im Hook gehalten werden (z.B. useRef).
 */
export function createWristRepairStatus(deadzoneDeg = 10, hysteresisMs = 200) {
  let lastInZone = false
  let zoneEnteredAt = 0

  /**
   * @param angleDiff Abweichung in Grad
   * @param nowMs Zeitstempel (ms)
   * @returns { repaired: boolean, inDeadzone: boolean, timeInZone: number }
   */
  return function update(angleDiff: number, nowMs: number) {
    const inDeadzone = angleDiff <= deadzoneDeg
    if (inDeadzone) {
      if (!lastInZone) {
        zoneEnteredAt = nowMs
      }
      lastInZone = true
    } else {
      lastInZone = false
      zoneEnteredAt = 0
    }
    const timeInZone = lastInZone ? nowMs - zoneEnteredAt : 0
    const repaired = lastInZone && timeInZone >= hysteresisMs
    return { repaired, inDeadzone, timeInZone }
  }
}
import type { Landmark, WristMasterPrint, SensitivityPreset } from '../types'

/**
 * Compute 2D distance between elbow and wrist (normalized coordinates).
 * Used to detect foreshortening when arm points toward camera.
 */
export function computeArmLength2D(elbow: Landmark, wrist: Landmark): number {
  const dx = elbow.x - wrist.x
  const dy = elbow.y - wrist.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Compute foreshortening confidence factor (0..1).
 * Returns 1.0 when arm is fully visible, drops toward 0 as arm
 * points at camera (2D projection shrinks vs calibrated length).
 */
export function computeForeshorteningConfidence(
  currentLength2D: number,
  calibLength2D: number,
): number {
  if (calibLength2D <= 0) return 1
  const ratio = currentLength2D / calibLength2D
  // Clamp and remap: [0.3, 0.7] → [0, 1]
  if (ratio >= 0.7) return 1
  if (ratio <= 0.3) return 0
  return (ratio - 0.3) / 0.4
}

/**
 * Compute the angle at the wrist formed by elbow → wrist → index finger.
 * Uses 3D vectors (x, y, z) to capture depth movements (e.g. toward neck).
 * Straight line = 180°. Returns degrees.
 */
export function computeWristAngle(elbow: Landmark, wrist: Landmark, index: Landmark): number {
  const v1x = elbow.x - wrist.x
  const v1y = elbow.y - wrist.y
  const v1z = elbow.z - wrist.z
  const v2x = index.x - wrist.x
  const v2y = index.y - wrist.y
  const v2z = index.z - wrist.z

  const dot = v1x * v2x + v1y * v2y + v1z * v2z
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z)
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z)

  if (mag1 === 0 || mag2 === 0) return 180
  return Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * (180 / Math.PI)
}

/**
 * Determine bend direction via 3D cross product magnitude.
 * Returns the magnitude of the cross product vector — sign indicates
 * primary bend direction relative to the arm plane.
 */
export function computeWristBendDirection(elbow: Landmark, wrist: Landmark, index: Landmark): number {
  const v1x = elbow.x - wrist.x
  const v1y = elbow.y - wrist.y
  const v1z = elbow.z - wrist.z
  const v2x = index.x - wrist.x
  const v2y = index.y - wrist.y
  const v2z = index.z - wrist.z
  // Cross product components
  const cx = v1y * v2z - v1z * v2y
  const cy = v1z * v2x - v1x * v2z
  const cz = v1x * v2y - v1y * v2x
  // Signed magnitude: sign of cz preserves the dominant 2D bend sense
  const mag = Math.sqrt(cx * cx + cy * cy + cz * cz)
  return cz >= 0 ? mag : -mag
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
  const zeroStartDeg = 1
  const pivotDeg = 5
  const lowRangeMax = 15

  if (angleDiff <= zeroStartDeg) return 0

  // From 1° to 5°: gentle awareness ramp.
  if (angleDiff <= pivotDeg) {
    const t = (angleDiff - zeroStartDeg) / (pivotDeg - zeroStartDeg)
    return t * lowRangeMax
  }

  // Past 5°: steep exponential increase.
  // Smaller wristFull means stricter mode; map that into a steeper rise.
  const strictness = Math.max(0.7, Math.min(1.6, 25 / sensitivity.wristFull))
  const x = (angleDiff - pivotDeg) * strictness
  const high = lowRangeMax + (100 - lowRangeMax) * (1 - Math.exp(-0.18 * x))
  return Math.min(100, high)
}

/**
 * Full wrist analysis for a single frame.
 * Uses absolute symmetry: equal magnitude in both bend directions
 * produces equal feedback intensity.
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
