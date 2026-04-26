import type {
  FocusMode,
  Landmark,
  MasterPrint,
  ShoulderMasterPrint,
  WristMasterPrint,
  ViolinMasterPrint,
} from '../types'
import { computeEarShoulderDistance } from '../analysis/shoulder-analyzer'
import { computeWristAngle, computeWristBendDirection } from '../analysis/wrist-analyzer'

/**
 * Create a Master Print from current pose landmarks for the given focus mode.
 */
export function createMasterPrint(
  mode: FocusMode,
  landmarks: Landmark[],
): MasterPrint {
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
      const elbow = landmarks[13]!
      const wrist = landmarks[15]!
      const index = landmarks[19]!
      return {
        mode: 'wrist',
        wristAngle: computeWristAngle(elbow, wrist, index),
        wristBendDir: computeWristBendDirection(elbow, wrist, index),
      } satisfies WristMasterPrint
    }
    case 'violin': {
      const leftWrist = landmarks[15]!
      return {
        mode: 'violin',
        calibWristY: leftWrist.y,
      } satisfies ViolinMasterPrint
    }
  }
}
