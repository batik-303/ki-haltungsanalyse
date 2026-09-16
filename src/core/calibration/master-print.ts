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
  computeArmLength2D,
  computeCollinearityAngle2D,
  computePalmBendSign,
  computeBendDirection2D,
  computeMCP,
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
      const poseWrist = landmarks[15]!
      const handWrist = handLandmarks[0]!
      const handMiddleMCP = handLandmarks[9]!

      const { angle } = computeFlexionExtensionAngle(poseElbow, handWrist, handMiddleMCP, aspect)

      // Pose-only fallback baselines — needed for the pose-fallback runtime
      // path so it can decode angle/sign in matching units when the hand
      // briefly disappears. Use world landmarks when available (isotropic,
      // so no aspect correction) and fall back to image landmarks otherwise.
      const world = options.worldLandmarks ?? landmarks
      const elbowFB = world[13]!
      const wristFB = world[15]!
      const mcpFB = computeMCP(world[17]!, world[19]!)

      return {
        mode: 'wrist',
        flexAngle: angle,
        // Palm-normal bend sign: 3D, orientation-invariant. Same code path as
        // the runtime so calibration baseline and runtime measurements live in
        // identical units — no calibration/runtime sign drift.
        flexBendDir: computePalmBendSign(poseElbow, handLandmarks),
        // Foreshortening confidence keeps using pose-only arm length —
        // HandLandmarker doesn't help with arm-pointing-at-camera detection.
        calibArmLength2D: computeArmLength2D(poseElbow, poseWrist),
        calib2DAngle: computeCollinearityAngle2D(poseElbow, handWrist, handMiddleMCP, aspect),
        flexBendDirFallback: computeBendDirection2D(elbowFB, wristFB, mcpFB),
        calib2DAngleFallback: computeCollinearityAngle2D(elbowFB, wristFB, mcpFB),
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
