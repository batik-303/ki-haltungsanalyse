export type DistanceStatus = 'too-close' | 'too-far' | 'good' | 'drifted'

const MIN_SHOULDER_WIDTH = 0.12
const MAX_SHOULDER_WIDTH = 0.45

/**
 * Compute shoulder width ratio from left/right shoulder X coordinates.
 */
export function computeShoulderWidth(leftShoulderX: number, rightShoulderX: number): number {
  return Math.abs(rightShoulderX - leftShoulderX)
}

/**
 * Validate user distance from camera based on shoulder width ratio.
 */
export function checkDistance(shoulderWidth: number): DistanceStatus {
  if (shoulderWidth > MAX_SHOULDER_WIDTH) return 'too-close'
  if (shoulderWidth < MIN_SHOULDER_WIDTH) return 'too-far'
  return 'good'
}

/**
 * Get the user-facing message for a distance status.
 */
export function getDistanceMessage(status: DistanceStatus): string {
  switch (status) {
    case 'too-close': return '⬅ Etwas weiter weg stellen'
    case 'too-far': return '➡ Etwas näher kommen'
    case 'good': return '✓ Gute Distanz – jetzt kalibrieren!'
    case 'drifted': return '⚠ Distanz geändert – ggf. neu kalibrieren'
  }
}
