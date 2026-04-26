import type { ViolinMasterPrint } from '../types'

const INSTANT_THRESHOLD = 0.04
const DRIFT_START = 0.012
const DRIFT_FULL = 0.12

/**
 * Violin drift analyzer with 60-second trend buffer.
 * Tracks how much the left wrist sinks (or rises) from the calibrated position.
 */
export function createViolinAnalyzer(bufferSize = 1800) {
  const trendBuffer: number[] = []

  return {
    /**
     * Analyze one frame of violin drift.
     * @param currentWristY - Current normalized Y position of left wrist (0-1)
     * @param masterPrint - Calibrated reference
     * @returns Tension target (0-100) and drift metadata
     */
    analyze(currentWristY: number, masterPrint: ViolinMasterPrint) {
      const rawDrift = currentWristY - masterPrint.calibWristY

      // 60-second trend buffer
      trendBuffer.push(rawDrift)
      if (trendBuffer.length > bufferSize) {
        trendBuffer.shift()
      }

      const smoothedDrift = trendBuffer.reduce((a, b) => a + b, 0) / trendBuffer.length
      const absRaw = Math.abs(rawDrift)
      const isLargeMove = absRaw > INSTANT_THRESHOLD

      // Blend: large movement → mostly instant; small → mostly trend
      const effectiveDrift = isLargeMove
        ? smoothedDrift * 0.3 + rawDrift * 0.7
        : smoothedDrift

      const absDrift = Math.abs(effectiveDrift)
      const tensionTarget = absDrift <= DRIFT_START
        ? 0
        : Math.min(100, ((absDrift - DRIFT_START) / (DRIFT_FULL - DRIFT_START)) * 100)

      // Drift direction: 1 = sinking, -1 = too high
      const driftDirection = effectiveDrift > 0 ? 1 : -1

      return {
        rawDrift,
        smoothedDrift,
        effectiveDrift,
        tensionTarget,
        driftDirection,
        isLargeMove,
      }
    },

    reset() {
      trendBuffer.length = 0
    },
  }
}
