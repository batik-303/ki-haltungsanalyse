import { useCallback, useRef } from 'react'
import { usePoseStore } from '../store/pose-store'
import { createMasterPrint } from '../core/calibration/master-print'
import { computeShoulderWidth } from '../core/calibration/distance-check'
import type { Landmark } from '../core/types'
import { PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision'
import { pickLeftHand } from '../core/analysis/hand-landmarker'

export type CalibrationFailureReason = 'no_pose' | 'no_hand'

export interface CalibrationResult {
  success: boolean
  reason?: CalibrationFailureReason
}

interface UseCalibrationOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
  handLandmarkerRef?: React.RefObject<HandLandmarker | null>
  landmarkerRef?: React.RefObject<PoseLandmarker | null>
  onCalibrated?: () => void
}

/**
 * Hook for managing calibration flows (standard 3s, timer 10s).
 */
export function useCalibration({ videoRef, canvasRef, handLandmarkerRef, onCalibrated }: UseCalibrationOptions) {
  const countdownRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doCapture = useCallback((landmarker: PoseLandmarker): CalibrationResult => {
    const video = videoRef.current
    if (!video) return { success: false, reason: 'no_pose' }

    const now = performance.now()
    const results = landmarker.detectForVideo(video, now)
    const landmarks = results.landmarks?.[0] as Landmark[] | undefined
    const worldLandmarks = results.worldLandmarks?.[0] as Landmark[] | undefined

    if (!landmarks || landmarks.length === 0) return { success: false, reason: 'no_pose' }

    const store = usePoseStore.getState()
    const canvas = canvasRef?.current
    const aspect = canvas && canvas.height > 0 ? canvas.width / canvas.height : 1

    // Wrist mode requires HandLandmarker — see master-print for rationale.
    let handLandmarks: Landmark[] | null = null
    if (store.focusMode === 'wrist') {
      const hand = handLandmarkerRef?.current
      if (hand) {
        try {
          const handResults = hand.detectForVideo(video, now)
          handLandmarks = pickLeftHand(handResults)
        } catch (e) {
          console.warn('[Calibration] hand detect failed', e)
        }
      }
      if (!handLandmarks) return { success: false, reason: 'no_hand' }
    }

    const masterPrint = createMasterPrint(store.focusMode, landmarks, {
      handLandmarks,
      aspect,
      worldLandmarks,
    })
    if (!masterPrint) return { success: false, reason: 'no_hand' }

    const shoulderWidth = computeShoulderWidth(landmarks[11]!.x, landmarks[12]!.x)

    store.calibrate(masterPrint, shoulderWidth)
    onCalibrated?.()
    return { success: true }
  }, [videoRef, canvasRef, handLandmarkerRef, onCalibrated])

  const startCountdown = useCallback((
    seconds: number,
    landmarker: PoseLandmarker,
    onTick: (remaining: number) => void,
    onDone: (success: boolean, reason?: CalibrationFailureReason) => void,
  ) => {
    usePoseStore.getState().setCalibrating(true)
    let count = seconds

    onTick(count)
    intervalRef.current = setInterval(() => {
      count--
      if (count > 0) {
        onTick(count)
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current)
        const result = doCapture(landmarker)
        usePoseStore.getState().setCalibrating(false)
        onDone(result.success, result.reason)
      }
    }, 1000)
  }, [doCapture])

  const cancelCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    usePoseStore.getState().setCalibrating(false)
  }, [])

  return {
    startCountdown,
    cancelCountdown,
    doCapture,
    countdownRef,
  }
}
