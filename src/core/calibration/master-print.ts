import type {
  FocusMode,
  Landmark,
  MasterPrint,
  ShoulderMasterPrint,
  WristMasterPrint,
  ViolinMasterPrint,
} from '../types'
import { computeEarShoulderDistance } from '../analysis/shoulder-analyzer'
import {
  computeFlexionExtensionAngle,
  computeBendDirection2D,
  computeArmLength2D,
  computeCollinearityAngle2D,
} from '../analysis/wrist-analyzer'

/**
 * Create a Master Print from current pose landmarks for the given focus mode.
 */
export function createMasterPrint(
  mode: FocusMode,
  landmarks: Landmark[],
  options: {
    handLandmarks?: Landmark[] | null
    aspect?: number
    worldLandmarks?: Landmark[]
  } = {},
): MasterPrint | null {
  const { handLandmarks, aspect = 1 } = options
  switch (mode) {
    case 'shoulder': {
      const leftEar = landmarks[7]!
      const leftShoulder = landmarks[11]!
      return {
        mode: 'shoulder',
        earShoulderDist: computeEarShoulderDistance(leftEar, leftShoulder),
      } satisfies ShoulderMasterPrint
    }
    case 'wrist': {
      // Wrist calibration requires a HandLandmarker result for the calibration
      // frame — pose-derived MCP is too coarse, and seeding a baseline from
      // one path that runtime won't use creates a calibration/runtime drift.
      // Caller must abort and surface UI feedback when this returns null.
      if (!handLandmarks || handLandmarks.length === 0) return null

      const poseElbow = landmarks[13]!
      const handWrist = handLandmarks[0]!
      const handMiddleMCP = handLandmarks[9]!

      const { angle } = computeFlexionExtensionAngle(poseElbow, handWrist, handMiddleMCP, aspect)
      return {
        mode: 'wrist',
        flexAngle: angle,
        flexBendDir: computeBendDirection2D(poseElbow, handWrist, handMiddleMCP, aspect),
        // Foreshortening confidence keeps using pose-only arm length —
        // HandLandmarker doesn't help with arm-pointing-at-camera detection.
        calibArmLength2D: computeArmLength2D(poseElbow, landmarks[15]!),
        calib2DAngle: computeCollinearityAngle2D(poseElbow, handWrist, handMiddleMCP, aspect),
      } satisfies WristMasterPrint
    }
    case 'violin': {
      const leftWrist = landmarks[15]!
      return {
        mode: 'violin',
        calibWristX: leftWrist.x,
        calibWristY: leftWrist.y,
      } satisfies ViolinMasterPrint
    }
  }
}
