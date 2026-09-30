import type {
  FocusMode,
  KnickSide,
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
  computeSignedKnick2D,
} from '../analysis/wrist-analyzer'

// Unter diesem Betrag gilt die gespeicherte Haltung als gerade: Die Seite ist
// dort zu unsicher gemessen und bleibt unbekannt (#91, Lehre aus #85).
const CALIB_KNICK_SIDE_MIN_DEG = 2

/**
 * Knick der gespeicherten Haltung aus vielen Countdown-Frames (#91): Median
 * des Knicks mit Seite, robust gegen einen Ausreißer im Erfassungs-Frame.
 */
function computeCalibKnick(samples: number[]): { calibKnick: number; calibKnickSide: KnickSide } {
  const sorted = [...samples].sort((a, b) => a - b)
  const mid = sorted.length / 2
  const median = sorted.length % 2 === 1
    ? sorted[Math.floor(mid)]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
  const calibKnick = Math.abs(median)
  const calibKnickSide = calibKnick < CALIB_KNICK_SIDE_MIN_DEG ? 0 : (Math.sign(median) as KnickSide)
  return { calibKnick, calibKnickSide }
}

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
    /** Knick mit Seite (Grad) aus den Countdown-Frames, siehe computeSignedKnick2D. */
    knickSamples?: number[]
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
      // Ohne Countdown-Frames zählt nur der Erfassungs-Frame.
      const knickSamples = options.knickSamples?.length
        ? options.knickSamples
        : [computeSignedKnick2D(poseElbow, handWrist, handMiddleMCP, aspect)]

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
        calibArmLength2D: computeArmLength2D(poseElbow, poseWrist, aspect),
        // Knick-Baseline in derselben Größe wie die Laufzeit (ADR 0003): bei
        // der Kalibrierung ist das Längenverhältnis 1, der korrigierte Knick
        // also gleich dem 2D-Winkel. Mit Seite, gemittelt (#91).
        ...computeCalibKnick(knickSamples),
        flexBendDirFallback: computeBendDirection2D(elbowFB, wristFB, mcpFB),
        calibKnickFallback: computeCollinearityAngle2D(elbowFB, wristFB, mcpFB),
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
