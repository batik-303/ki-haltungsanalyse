/**
 * Compute the next tension score using dual-speed asymmetric approach.
 * Rising tension approaches slower (0.12) to avoid jitter.
 * Falling tension approaches faster (0.15) for reward feedback.
 * 
 * @param current - Current tension score (0-100)
 * @param target - Target tension from analyzer (0-100)
 * @param risingRate - Approach rate when tension is increasing (default 0.12)
 * @param fallingRate - Approach rate when tension is decreasing (default 0.15)
 * @returns New tension score, clamped to [0, 100]
 */
export function computeTension(
  current: number,
  target: number,
  risingRate = 0.12,
  fallingRate = 0.15,
): number {
  const rate = target > current ? risingRate : fallingRate
  const next = current + (target - current) * rate
  return Math.max(0, Math.min(100, next))
}

/**
 * Map a raw deviation to a tension target (0-100) based on start and full thresholds.
 * Values below startThresh → 0. Values above fullThresh → 100.
 */
export function mapToTensionTarget(
  deviation: number,
  startThresh: number,
  fullThresh: number,
): number {
  if (deviation <= startThresh) return 0
  const range = fullThresh - startThresh
  if (range <= 0) return 0
  return Math.min(100, ((deviation - startThresh) / range) * 100)
}
