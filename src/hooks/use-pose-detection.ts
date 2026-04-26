import { useEffect, useRef, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { Landmark } from '../core/types'
import { SENSITIVITY_PRESETS } from '../core/config/sensitivity'
import { computeShoulderDeviation, computeShoulderTensionTarget } from '../core/analysis/shoulder-analyzer'
import { analyzeWrist, updateBendLock } from '../core/analysis/wrist-analyzer'
import { createViolinAnalyzer } from '../core/analysis/violin-analyzer'
import { classifyLayer } from '../core/analysis/layer-classifier'
import { createMovingAverage } from '../core/signal/smoothing'
import { computeTension } from '../core/signal/tension'
import { computeShoulderWidth, checkDistance, checkDistanceDrift } from '../core/calibration/distance-check'
import { createSessionTracker } from '../core/session/session-tracker'
import { usePoseStore } from '../store/pose-store'
import { renderFrame } from '../rendering/canvas-renderer'

export function usePoseDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef(performance.now())
  const loadingRef = useRef(false)

  // Mutable analysis state (not in React, not in store — owned by rAF loop)
  const smootherRef = useRef(createMovingAverage(30))
  const violinRef = useRef(createViolinAnalyzer())
  const sessionRef = useRef(createSessionTracker('violin'))
  const tensionRef = useRef(0)
  const bendForwardRef = useRef(true)

  const resetAnalysisState = useCallback(() => {
    smootherRef.current.reset()
    violinRef.current.reset()
    tensionRef.current = 0
    bendForwardRef.current = true
    const mode = usePoseStore.getState().focusMode
    sessionRef.current = createSessionTracker(mode)
  }, [])

  // Load MediaPipe model
  useEffect(() => {
    if (loadingRef.current) return
    loadingRef.current = true

    async function init() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        )
        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        })
        landmarkerRef.current = landmarker

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        })

        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.addEventListener('loadeddata', () => {
            const canvas = canvasRef.current
            if (canvas) {
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
            }
            startDetectionLoop()
          })
        }
      } catch (e) {
        console.error('Failed to initialize pose detection:', e)
      }
    }

    init()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      landmarkerRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startDetectionLoop() {
    function detect() {
      const landmarker = landmarkerRef.current
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!landmarker || !video || !canvas) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      const now = performance.now()
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = now

      const results = landmarker.detectForVideo(video, now)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const store = usePoseStore.getState()
      const landmarks = results.landmarks?.[0] as Landmark[] | undefined

      if (landmarks && landmarks.length > 0) {
        // Distance check
        const leftShoulder = landmarks[11]!
        const rightShoulder = landmarks[12]!
        const shoulderWidth = computeShoulderWidth(leftShoulder.x, rightShoulder.x)
        const distStatus = checkDistance(shoulderWidth)
        const distOk = distStatus === 'good'

        // Check drift after calibration
        let effectiveDistOk = distOk
        if (distOk && store.calibratedShoulderWidth && store.masterPrint) {
          if (checkDistanceDrift(shoulderWidth, store.calibratedShoulderWidth)) {
            effectiveDistOk = true // Still ok for analysis, just show warning
          }
        }

        if (store.distanceOk !== distOk) {
          usePoseStore.setState({ distanceOk: distOk })
        }

        // Analysis (only when calibrated)
        if (store.masterPrint && !store.isCalibrating) {
          const sensitivity = SENSITIVITY_PRESETS[store.sensitivity]
          let tensionTarget = 0
          let rawDev = 0
          let smoothedDev = 0
          let driftDir: number | undefined
          let bendFwd: boolean | undefined

          if (store.focusMode === 'shoulder' && store.masterPrint.mode === 'shoulder') {
            const leftEar = landmarks[7]!
            rawDev = computeShoulderDeviation(leftEar, leftShoulder, store.masterPrint)
            smoothedDev = smootherRef.current.push(rawDev)
            tensionTarget = computeShoulderTensionTarget(smoothedDev, sensitivity)
          } else if (store.focusMode === 'wrist' && store.masterPrint.mode === 'wrist') {
            const elbow = landmarks[13]!
            const wrist = landmarks[15]!
            const index = landmarks[19]!
            const result = analyzeWrist(elbow, wrist, index, store.masterPrint, sensitivity)
            rawDev = result.angleDiff / 30 // Normalize for display
            smoothedDev = smootherRef.current.push(rawDev)
            tensionTarget = result.tensionTarget
            bendFwd = updateBendLock(
              result.angleDiff,
              result.bendDir,
              store.masterPrint.wristBendDir,
              bendForwardRef.current,
            )
            bendForwardRef.current = bendFwd
          } else if (store.focusMode === 'violin' && store.masterPrint.mode === 'violin') {
            const wrist = landmarks[15]!
            const result = violinRef.current.analyze(wrist.y, store.masterPrint)
            rawDev = result.smoothedDrift
            smoothedDev = result.effectiveDrift
            tensionTarget = result.tensionTarget
            driftDir = result.driftDirection

            // Dual-speed for violin: faster return
            const fallingRate = result.isLargeMove ? 0.35 : 0.15
            tensionRef.current = computeTension(tensionRef.current, tensionTarget, result.isLargeMove ? 0.15 : 0.05, fallingRate)
          }

          // Tension update (shoulder/wrist use standard rates)
          if (store.focusMode !== 'violin') {
            tensionRef.current = computeTension(tensionRef.current, tensionTarget)
          }

          const layerInfo = classifyLayer(tensionRef.current, store.focusMode, driftDir)

          // Session tracking
          const glowTimer = sessionRef.current.recordFrame(tensionRef.current, layerInfo.layer, dt)

          // Push to store (batched, Zustand merges)
          usePoseStore.getState().updateFrame({
            tensionScore: tensionRef.current,
            smoothedDeviation: smoothedDev,
            rawDeviation: rawDev,
            layerInfo,
            returnGlowTimer: glowTimer,
            lastBendForward: bendFwd,
            driftDirection: driftDir,
          })
        }

        // Render (reads store via getState, plus direct landmarks)
        renderFrame(ctx, canvas.width, canvas.height, now, landmarks, dt)
      } else {
        // No body detected
        if (store.distanceOk) {
          usePoseStore.setState({ distanceOk: false })
        }
        renderFrame(ctx, canvas.width, canvas.height, now, null, dt)
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }

    animFrameRef.current = requestAnimationFrame(detect)
  }

  return { resetAnalysisState, landmarkerRef }
}
