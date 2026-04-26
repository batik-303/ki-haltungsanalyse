import type { Landmark, ShoulderMasterPrint, SensitivityPreset } from '../types'

/**
 * Compute euclidean distance between left ear and left shoulder.
 */
export function computeEarShoulderDistance(leftEar: Landmark, leftShoulder: Landmark): number {
  return Math.sqrt(
    (leftEar.x - leftShoulder.x) ** 2 +
    (leftEar.y - leftShoulder.y) ** 2
  )
}

/**
 * Compute shoulder deviation as a ratio of the calibrated reference distance.
 * Positive = shoulder closer to ear = shoulder pulling up.
 */
export function computeShoulderDeviation(
  leftEar: Landmark,
  leftShoulder: Landmark,
  masterPrint: ShoulderMasterPrint,
): number {
  const currentDist = computeEarShoulderDistance(leftEar, leftShoulder)
  return (masterPrint.earShoulderDist - currentDist) / masterPrint.earShoulderDist
}

/**
 * Map shoulder deviation to a tension target (0-100).
 */
export function computeShoulderTensionTarget(
  deviation: number,
  sensitivity: SensitivityPreset,
): number {
  if (deviation <= sensitivity.startThresh) return 0
  const range = sensitivity.fullThresh - sensitivity.startThresh
  if (range <= 0) return 0
  return Math.min(100, ((deviation - sensitivity.startThresh) / range) * 100)
}
