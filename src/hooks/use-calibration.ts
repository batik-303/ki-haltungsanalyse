import { useCallback, useRef } from 'react'
import { usePoseStore } from '../store/pose-store'
import { createMasterPrint } from '../core/calibration/master-print'
import { computeShoulderWidth } from '../core/calibration/distance-check'
import type { Landmark } from '../core/types'
import { PoseLandmarker } from '@mediapipe/tasks-vision'

interface UseCalibrationOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  landmarkerRef?: React.RefObject<PoseLandmarker | null>
  onCalibrated?: () => void
}

/**
 * Hook for managing calibration flows (standard 3s, timer 10s).
 */
export function useCalibration({ videoRef, onCalibrated }: UseCalibrationOptions) {
  const countdownRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doCapture = useCallback((landmarker: PoseLandmarker) => {
    const video = videoRef.current
    if (!video) return false

    const results = landmarker.detectForVideo(video, performance.now())
    const landmarks = results.landmarks?.[0] as Landmark[] | undefined

    if (!landmarks || landmarks.length === 0) return false

    const store = usePoseStore.getState()
    const masterPrint = createMasterPrint(store.focusMode, landmarks)
    const shoulderWidth = computeShoulderWidth(landmarks[11]!.x, landmarks[12]!.x)

    store.calibrate(masterPrint, shoulderWidth)
    onCalibrated?.()
    return true
  }, [videoRef, onCalibrated])

  const startCountdown = useCallback((
    seconds: number,
    landmarker: PoseLandmarker,
    onTick: (remaining: number) => void,
    onDone: (success: boolean) => void,
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
        const success = doCapture(landmarker)
        usePoseStore.getState().setCalibrating(false)
        onDone(success)
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
