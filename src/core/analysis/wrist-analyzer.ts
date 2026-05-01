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
 * Compute MCP-Joint approximation as midpoint of LEFT_PINKY (17) and LEFT_INDEX (19).
 * More stable than a single fingertip for tracking hand orientation.
 */
export function computeMCP(pinky: Landmark, index: Landmark): Landmark {
  return {
    x: (pinky.x + index.x) / 2,
    y: (pinky.y + index.y) / 2,
    z: (pinky.z + index.z) / 2,
    visibility: Math.min(pinky.visibility, index.visibility),
  }
}

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
 * @deprecated Use computeFlexionExtensionAngle() for isolated flex measurement.
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
 * Compute Flexion/Extension angle isolated from Radial/Ulnar deviation.
 * Projects the hand vector (wrist→MCP) onto the plane defined by forearm × gravity,
 * then measures the angle between the projected hand vector and the forearm vector.
 * Straight wrist = 180°. Returns degrees.
 *
 * Falls back to 2D angle when the forearm is nearly vertical (cross product too small).
 */
export function computeFlexionExtensionAngle(
  elbow: Landmark,
  wrist: Landmark,
  mcp: Landmark,
): { angle: number; usedFallback: boolean } {
  // Forearm vector (elbow → wrist direction, used as reference for "straight")
  const fax = wrist.x - elbow.x
  const fay = wrist.y - elbow.y
  const faz = wrist.z - elbow.z

  // Gravity reference (y-down in MediaPipe normalized coords)
  const upX = 0, upY = -1, upZ = 0

  // Plane normal = forearm × up
  let nx = fay * upZ - faz * upY
  let ny = faz * upX - fax * upZ
  let nz = fax * upY - fay * upX
  const nMag = Math.sqrt(nx * nx + ny * ny + nz * nz)

  // Fallback: forearm nearly vertical → cross product too small
  if (nMag < 0.1) {
    // 2D angle fallback (ignoring z)
    const fa2x = wrist.x - elbow.x
    const fa2y = wrist.y - elbow.y
    const h2x = mcp.x - wrist.x
    const h2y = mcp.y - wrist.y
    const dot2 = fa2x * h2x + fa2y * h2y
    const mag1 = Math.sqrt(fa2x * fa2x + fa2y * fa2y)
    const mag2 = Math.sqrt(h2x * h2x + h2y * h2y)
    if (mag1 === 0 || mag2 === 0) return { angle: 180, usedFallback: true }
    const cos = Math.min(1, Math.max(-1, dot2 / (mag1 * mag2)))
    return { angle: Math.acos(cos) * (180 / Math.PI), usedFallback: true }
  }

  // Normalize the plane normal
  nx /= nMag
  ny /= nMag
  nz /= nMag

  // Hand vector (wrist → MCP)
  const hx = mcp.x - wrist.x
  const hy = mcp.y - wrist.y
  const hz = mcp.z - wrist.z

  // Project hand vector onto the flexion plane: h_proj = h - (h·n)*n
  const hDotN = hx * nx + hy * ny + hz * nz
  const px = hx - hDotN * nx
  const py = hy - hDotN * ny
  const pz = hz - hDotN * nz

  // Angle between forearm and projected hand vector
  const dot = fax * px + fay * py + faz * pz
  const faMag = Math.sqrt(fax * fax + fay * fay + faz * faz)
  const pMag = Math.sqrt(px * px + py * py + pz * pz)

  if (faMag === 0 || pMag === 0) return { angle: 180, usedFallback: false }
  const cos = Math.min(1, Math.max(-1, dot / (faMag * pMag)))
  return { angle: Math.acos(cos) * (180 / Math.PI), usedFallback: false }
}

/**
 * Compute flex bend direction (sign) using the cross product of forearm and
 * projected hand vector within the flexion plane.
 * Positive = one direction, negative = opposite.
 */
export function computeFlexBendDirection(
  elbow: Landmark,
  wrist: Landmark,
  mcp: Landmark,
): number {
  const fax = wrist.x - elbow.x
  const fay = wrist.y - elbow.y
  const faz = wrist.z - elbow.z

  const hx = mcp.x - wrist.x
  const hy = mcp.y - wrist.y
  const hz = mcp.z - wrist.z

  // Cross product forearm × hand
  const cx = fay * hz - faz * hy
  const cy = faz * hx - fax * hz
  const cz = fax * hy - fay * hx
  const mag = Math.sqrt(cx * cx + cy * cy + cz * cz)
  // Sign from component perpendicular to gravity plane (cz)
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
 * Uses plane-projected Flexion/Extension angle with MCP approximation.
 * Radial/Ulnar deviation is ignored.
 */
export function analyzeWrist(
  elbow: Landmark,
  wrist: Landmark,
  mcp: Landmark,
  masterPrint: WristMasterPrint,
  sensitivity: SensitivityPreset,
) {
  const { angle: currentAngle, usedFallback } = computeFlexionExtensionAngle(elbow, wrist, mcp)
  const bendDir = computeFlexBendDirection(elbow, wrist, mcp)
  const angleDiff = Math.abs(currentAngle - masterPrint.flexAngle)

  return {
    currentAngle,
    angleDiff,
    bendDir,
    usedFallback,
    tensionTarget: computeWristTensionTarget(angleDiff, sensitivity),
  }
}
