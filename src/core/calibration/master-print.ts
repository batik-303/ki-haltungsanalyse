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
  computeMCP,
} from '../analysis/wrist-analyzer'

/**
 * Create a Master Print from current pose landmarks for the given focus mode.
 */
export function createMasterPrint(
  mode: FocusMode,
  landmarks: Landmark[],
  worldLandmarks?: Landmark[],
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
      // Image-space (normalized 0..1, distorted by aspect) — kept for foreshortening,
      // which relies on the arm visually shrinking when pointed at the camera.
      const elbow = landmarks[13]!
      const wrist = landmarks[15]!

      // World-space (meters, hip-origin, gravity-aligned) — correct units for
      // anatomical joint angles. Fall back to image-space if MediaPipe didn't
      // emit world landmarks for this frame.
      const world = worldLandmarks ?? landmarks
      const elbowW = world[13]!
      const wristW = world[15]!
      const mcpW = computeMCP(world[17]!, world[19]!)

      const { angle } = computeFlexionExtensionAngle(elbowW, wristW, mcpW)
      return {
        mode: 'wrist',
        flexAngle: angle,
        flexBendDir: computeBendDirection2D(elbowW, wristW, mcpW),
        calibArmLength2D: computeArmLength2D(elbow, wrist),
        calib2DAngle: computeCollinearityAngle2D(elbowW, wristW, mcpW),
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
