import type { Landmark } from '../types'

export type AnalysisPath = 'hand' | 'pose-fallback'

/**
 * Decide whether the wrist analyzer should use the precise hand-derived path
 * or fall back to pose-only landmarks for this frame. Pure function of the
 * already-filtered hand result — handedness selection (`pickLeftHand`) lives
 * upstream, so an empty input here means "no usable hand for this frame"
 * regardless of why (missed detection, occlusion, wrong handedness).
 *
 * Used in two places, both must agree:
 *   - rAF wrist branch (selects analysis math per frame)
 *   - debug overlay (renders HAND / POSE-FB indicator)
 */
export function selectAnalysisPath(handLandmarks: Landmark[] | null | undefined): AnalysisPath {
  if (!handLandmarks || handLandmarks.length === 0) return 'pose-fallback'
  return 'hand'
}
