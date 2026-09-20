import { createWristRepairStatus, createWristRailColor, computeCollinearityAngle2D, computeZBoost, computeWristTensionTarget, computePalmBendSign, computeForearmLength3D, computeBendDirection2D, computeMCP, smoothDirection2D, createWristRailTimer } from '../core/analysis/wrist-analyzer'
import { useEffect, useRef, useCallback } from 'react'
import { PoseLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { pickLeftHand } from '../core/analysis/hand-landmarker'
import { selectAnalysisPath } from '../core/analysis/analysis-path'
import type { Landmark } from '../core/types'
import { SENSITIVITY_PRESETS } from '../core/config/sensitivity'
import { computeShoulderDeviation, computeShoulderTensionTarget } from '../core/analysis/shoulder-analyzer'
import { updateBendLock, computeArmLength2D, computeForeshorteningConfidence } from '../core/analysis/wrist-analyzer'
import { createViolinAnalyzer } from '../core/analysis/violin-analyzer'
import { classifyLayer } from '../core/analysis/layer-classifier'
import { createMovingAverage } from '../core/signal/smoothing'
import { createOneEuroFilter } from '../core/signal/one-euro-filter'
import { computeTension } from '../core/signal/tension'
import { computeShoulderWidth, checkDistance } from '../core/calibration/distance-check'
import { createReadinessGate } from '../core/calibration/readiness-gate'
import { createSessionTracker } from '../core/session/session-tracker'
import { usePoseStore } from '../store/pose-store'
import { renderFrame } from '../rendering/canvas-renderer'

// One Euro Filter Parameter für Wrist-Rendering (zentral konfigurierbar)
// Conservative values: smooth visual output without perceptible lag.
// minCutoff=0.6 → strong smoothing when still; beta=0.003 → gentle response on movement.
const WRIST_FILTER_MIN_CUTOFF = 0.6
const WRIST_FILTER_BETA = 0.003
const WRIST_FILTER_D_CUTOFF = 1.0

/**
 * Erstellt One Euro Filter für alle relevanten Landmarken (Elbow, Wrist, Index)
 * Werte können zentral angepasst werden (siehe oben)
 */
function createWristRenderFilters() {
  return {
    ex: createOneEuroFilter(WRIST_FILTER_MIN_CUTOFF, WRIST_FILTER_BETA, WRIST_FILTER_D_CUTOFF),
    ey: createOneEuroFilter(WRIST_FILTER_MIN_CUTOFF, WRIST_FILTER_BETA, WRIST_FILTER_D_CUTOFF),
    wx: createOneEuroFilter(WRIST_FILTER_MIN_CUTOFF, WRIST_FILTER_BETA, WRIST_FILTER_D_CUTOFF),
    wy: createOneEuroFilter(WRIST_FILTER_MIN_CUTOFF, WRIST_FILTER_BETA, WRIST_FILTER_D_CUTOFF),
    ix: createOneEuroFilter(WRIST_FILTER_MIN_CUTOFF, WRIST_FILTER_BETA, WRIST_FILTER_D_CUTOFF),
    iy: createOneEuroFilter(WRIST_FILTER_MIN_CUTOFF, WRIST_FILTER_BETA, WRIST_FILTER_D_CUTOFF),
    mx: createOneEuroFilter(WRIST_FILTER_MIN_CUTOFF, WRIST_FILTER_BETA, WRIST_FILTER_D_CUTOFF),
    my: createOneEuroFilter(WRIST_FILTER_MIN_CUTOFF, WRIST_FILTER_BETA, WRIST_FILTER_D_CUTOFF),
  }
}

// Stronger smoothing for z-values (noisier than x/y from MediaPipe)
// beta=0.003 provides proven stability for wrist angle detection
function createWristZFilters() {
  return {
    elbowZ: createOneEuroFilter(0.3, 0.001, 1.0),
    wristZ: createOneEuroFilter(0.3, 0.001, 1.0),
    indexZ: createOneEuroFilter(0.3, 0.001, 1.0),
  }
}

const WRIST_SLIDE_SPEED_THRESHOLD = 0.45
const WRIST_SLIDE_SHIELD_SECONDS = 0.22
const WRIST_SLIDE_DAMPING = 0.35

export function usePoseDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const handLandmarkerLoadingRef = useRef(false)
  // Latest filtered hand landmarks (Left handedness only). Null when wrist
  // mode is inactive, no hand detected, or no Left-categorized hand present.
  const handLandmarksRef = useRef<Landmark[] | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef(performance.now())
  const loadingRef = useRef(false)

  // Mutable analysis state (not in React, not in store — owned by rAF loop)
  // Moving Average für Arm-Hand-Winkel (Glättung, 30 Frames)
  const smootherRef = useRef(createMovingAverage(30))
  const violinRef = useRef(createViolinAnalyzer())
  const sessionRef = useRef(createSessionTracker('violin'))
  const tensionRef = useRef(0)
  const bendForwardRef = useRef(true)
  // Wrist repair status closure (Deadzone/Hysterese)
  const wristRepairStatusRef = useRef(createWristRepairStatus(10, 200))
  const wristPrevPosRef = useRef<{ x: number; y: number } | null>(null)
  const wristSlideShieldRef = useRef(0)
  let wristRepairStatus: any = undefined

  // One-Euro filters for wrist render coordinates (ex, ey, wx, wy, ix, iy)
  const wristFiltersRef = useRef(createWristRenderFilters())

  // One-Euro filters for z-values used in 3D angle analysis
  const wristZFiltersRef = useRef(createWristZFilters())

  // Rail direction smoothing state (2D normalized vector)
  const railDirRef = useRef<{ x: number; y: number } | null>(null)
  // Rail 5-second challenge timer
  const railTimerRef = useRef(createWristRailTimer())
  // Sticky-blue hysteresis for wrist rail color
  const wristRailColorRef = useRef(createWristRailColor())
  // EMA post-smoothing for effectiveAngleDiff (eliminates Z-axis micro-jitter)
  const angleDiffEmaRef = useRef(0)
  // Last analysis path used in the wrist branch (for transition smoothing).
  const lastAnalysisPathRef = useRef<'hand' | 'pose-fallback' | null>(null)

  // Kalibrier-Auslöser: Distanz-Gate mit Auto-Start (#59). Reine Zustandsmaschine
  // als useRef (Triple-State: Analyse-Zustand nie in Zustand/Store).
  const readinessGateRef = useRef(createReadinessGate())

  const resetAnalysisState = useCallback(() => {
    smootherRef.current.reset()
    violinRef.current.reset()
    tensionRef.current = 0
    bendForwardRef.current = true
    wristPrevPosRef.current = null
    wristSlideShieldRef.current = 0
    wristFiltersRef.current = createWristRenderFilters()
    wristZFiltersRef.current = createWristZFilters()
    railDirRef.current = null
    railTimerRef.current = createWristRailTimer()
    wristRailColorRef.current = createWristRailColor()
    angleDiffEmaRef.current = 0
    lastAnalysisPathRef.current = null
    readinessGateRef.current.reset()
    usePoseStore.getState().setReadiness('idle', false)
    usePoseStore.getState().setReadinessArmed(false)
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

        // Pre-grant mic permission for voice commands (non-blocking)
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((s) => { s.getTracks().forEach((t) => t.stop()); console.log('[Pose] Mic permission pre-granted') })
          .catch(() => { console.warn('[Pose] Mic not available — voice commands may not work') })

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
      handLandmarkerRef.current?.close()
      handLandmarkerRef.current = null
      handLandmarksRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // HandLandmarker lifecycle: loaded only while focusMode === 'wrist'.
  // Subscribes to store; allocates on entry, releases on exit. PoseLandmarker
  // and other modes incur zero HandLandmarker overhead.
  useEffect(() => {
    async function loadHandLandmarker() {
      if (handLandmarkerRef.current || handLandmarkerLoadingRef.current) return
      handLandmarkerLoadingRef.current = true
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        )
        const hand = await HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        })
        // Guard: focus may have left wrist mode while loading.
        if (usePoseStore.getState().focusMode === 'wrist') {
          handLandmarkerRef.current = hand
        } else {
          hand.close()
        }
      } catch (e) {
        console.error('Failed to initialize hand landmarker:', e)
      } finally {
        handLandmarkerLoadingRef.current = false
      }
    }

    function releaseHandLandmarker() {
      handLandmarkerRef.current?.close()
      handLandmarkerRef.current = null
      handLandmarksRef.current = null
    }

    if (usePoseStore.getState().focusMode === 'wrist') {
      loadHandLandmarker()
    }

    const unsubscribe = usePoseStore.subscribe((state, prev) => {
      if (state.focusMode === prev.focusMode) return
      if (state.focusMode === 'wrist') {
        loadHandLandmarker()
      } else {
        releaseHandLandmarker()
      }
    })

    return () => {
      unsubscribe()
      releaseHandLandmarker()
    }
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

      // Hand detection (wrist mode only — landmarker loaded on demand).
      // Run with the same video frame + timestamp as pose for temporal coherence.
      const handLandmarker = handLandmarkerRef.current
      if (store.focusMode === 'wrist' && handLandmarker) {
        try {
          const handResults = handLandmarker.detectForVideo(video, now)
          handLandmarksRef.current = pickLeftHand(handResults)
        } catch (e) {
          console.warn('[HandLandmarker] detect failed', e)
          handLandmarksRef.current = null
        }
      } else if (handLandmarksRef.current) {
        handLandmarksRef.current = null
      }

      // Aspect for image-space angle math. Identical for canvas and video
      // since canvas is sized to videoWidth × videoHeight in the init step.
      const aspect = canvas.height > 0 ? canvas.width / canvas.height : 1

      if (landmarks && landmarks.length > 0) {
        // Distance check
        const leftShoulder = landmarks[11]!
        const rightShoulder = landmarks[12]!
        const shoulderWidth = computeShoulderWidth(leftShoulder.x, rightShoulder.x)
        const distStatus = checkDistance(shoulderWidth)
        const distOk = distStatus === 'good'

        if (store.distanceOk !== distOk) {
          usePoseStore.setState({ distanceOk: distOk })
        }

        // ── Kalibrier-Auslöser: Distanz-Gate mit Auto-Start (#59) ──
        // Kein Auto-Arm mehr: das Tor feuert nur, wenn zuvor bewusst ausgelöst
        // wurde (`requestArm` via `armReadiness`). Es reicht die Distanz durch
        // und schaltet scharf, sobald der Abstand passt. Die Spielhaltung wird
        // erst im Erfassungsmoment geprüft (siehe use-calibration).
        if (!store.masterPrint && !store.isCalibrating) {
          const readiness = readinessGateRef.current.update({
            distanceOk: distOk,
            dtMs: dt * 1000,
          })
          if (
            readiness.phase !== store.readinessPhase ||
            readiness.timedOut !== store.readinessTimedOut
          ) {
            usePoseStore.getState().setReadiness(readiness.phase, readiness.timedOut)
          }
          if (readiness.justArmed) {
            usePoseStore.getState().setReadinessArmed(true)
          }
        }

        // Analysis (only when calibrated)
        if (store.masterPrint && !store.isCalibrating) {
          const sensitivity = SENSITIVITY_PRESETS[store.sensitivity]
          let tensionTarget = 0
          let rawDev = 0
          let smoothedDev = 0
          let driftDir: number | undefined
          let bendFwd: boolean | undefined
          let filteredWristCoords: { ex: number; ey: number; wx: number; wy: number; ix: number; iy: number; mx: number; my: number } | undefined
          let wristForeConf: number | undefined
          let smoothedRailDir: { x: number; y: number } | undefined
          let railTimerValue: number | undefined
          let railSuccessGlow: number | undefined
          let railSuccess: boolean | undefined
          let railMilestoneLevel: number | undefined
          let wristRailIsBlue: boolean | undefined
          let wristRailAngleDeg: number | undefined

          if (store.focusMode === 'shoulder' && store.masterPrint.mode === 'shoulder') {
            const leftEar = landmarks[7]!
            rawDev = computeShoulderDeviation(leftEar, leftShoulder, store.masterPrint)
            smoothedDev = smootherRef.current.push(rawDev)
            tensionTarget = computeShoulderTensionTarget(smoothedDev, sensitivity)
          } else if (store.focusMode === 'wrist' && store.masterPrint.mode === 'wrist') {
            // Pose-derived skeletal landmarks (image-space normalized 0..1).
            const elbow = landmarks[13]!
            const wrist = landmarks[15]!
            const pinky = landmarks[17]!
            const index = landmarks[19]!

            // Per-frame path selection. Hand path uses HandLandmarker for
            // precise MCP + palm-normal sign; pose-fallback uses pose-derived
            // MCP and old 2D-cross sign, with their own calibration baselines
            // (also seeded at calibration time when the hand was visible).
            const hand = handLandmarksRef.current
            const path = selectAnalysisPath(hand)
            const prevPath = lastAnalysisPathRef.current
            const justSwitchedPath = prevPath !== null && prevPath !== path
            const worldLandmarks = results.worldLandmarks?.[0] as Landmark[] | undefined

            // Symmetric position-shift shield: damp sensitivity briefly during fast slides.
            const prevWrist = wristPrevPosRef.current
            if (prevWrist && dt > 0) {
              const dx = wrist.x - prevWrist.x
              const dy = wrist.y - prevWrist.y
              const wristSpeed = Math.sqrt(dx * dx + dy * dy) / dt
              if (wristSpeed > WRIST_SLIDE_SPEED_THRESHOLD) {
                wristSlideShieldRef.current = WRIST_SLIDE_SHIELD_SECONDS
              }
            }
            wristPrevPosRef.current = { x: wrist.x, y: wrist.y }
            if (wristSlideShieldRef.current > 0) {
              wristSlideShieldRef.current = Math.max(0, wristSlideShieldRef.current - dt)
            }
            const slideShieldFactor = wristSlideShieldRef.current > 0 ? WRIST_SLIDE_DAMPING : 1

            // Foreshortening detection: compare current 2D arm length vs calibrated
            const armLen2D = computeArmLength2D(elbow, wrist)
            const foreConf = computeForeshorteningConfidence(armLen2D, store.masterPrint.calibArmLength2D)

            // ── Path-dispatched raw angle + bend sign ──
            let angleDiff2D: number
            let baselineAngle: number
            let bendSign: number
            let refBendSign: number
            let forearmLen: number

            if (path === 'hand' && hand) {
              const handWrist = hand[0]!
              const handMiddleMCP = hand[9]!
              angleDiff2D = computeCollinearityAngle2D(elbow, handWrist, handMiddleMCP, aspect)
              baselineAngle = store.masterPrint.calib2DAngle ?? 0
              bendSign = computePalmBendSign(elbow, hand)
              refBendSign = store.masterPrint.flexBendDir
              forearmLen = computeForearmLength3D(elbow, handWrist)
            } else {
              // Pose-only fallback: world landmarks when available (isotropic
              // meter units, no aspect correction needed), else image-space.
              const elbowFB = worldLandmarks?.[13] ?? elbow
              const wristFB = worldLandmarks?.[15] ?? wrist
              const mcpFB = worldLandmarks
                ? computeMCP(worldLandmarks[17]!, worldLandmarks[19]!)
                : computeMCP(pinky, index)
              angleDiff2D = computeCollinearityAngle2D(elbowFB, wristFB, mcpFB)
              baselineAngle = store.masterPrint.calib2DAngleFallback ?? store.masterPrint.calib2DAngle ?? 0
              bendSign = computeBendDirection2D(elbowFB, wristFB, mcpFB)
              refBendSign = store.masterPrint.flexBendDirFallback ?? store.masterPrint.flexBendDir
              forearmLen = computeForearmLength3D(elbowFB, wristFB)
            }

            const baselineCorrected = Math.abs(angleDiff2D - baselineAngle)

            // ── Z-boost: depth-direction nudge using world-space pose Z. ──
            const wristW = worldLandmarks?.[15] ?? wrist
            const indexW = worldLandmarks?.[19] ?? index
            const t = now / 1000
            const zf = wristZFiltersRef.current
            const zWristF = zf.wristZ(wristW.z, t)
            const zIndexF = zf.indexZ(indexW.z, t)
            const rawZBoostedUnclamped = computeZBoost(baselineCorrected, zIndexF, zWristF)

            // Path-transition clamp: cap per-frame change to ≤ 3° on the
            // first frame after a path switch. Keeps the EMA continuous
            // across the switch — Hand→Pose or Pose→Hand looks smooth
            // instead of jumping when the two paths disagree.
            const PATH_SWITCH_MAX_DELTA_DEG = 3
            const prevEffective = angleDiffEmaRef.current
            const rawZBoosted = justSwitchedPath
              ? Math.max(prevEffective - PATH_SWITCH_MAX_DELTA_DEG, Math.min(prevEffective + PATH_SWITCH_MAX_DELTA_DEG, rawZBoostedUnclamped))
              : rawZBoostedUnclamped

            // ── EMA post-smoothing (alpha=0.25, ~100ms time constant at 30fps) ──
            // When foreshortening confidence is low, hold the angle (don't let it drop)
            // so the peripheral doesn't falsely show "correct" when the camera can't see the bend.
            const rawSmoothed = angleDiffEmaRef.current * 0.75 + rawZBoosted * 0.25
            if (foreConf >= 0.7) {
              // High confidence: track freely
              angleDiffEmaRef.current = rawSmoothed
            } else {
              // Low confidence: only allow angle to increase, not decrease
              // Slow decay (0.995 per frame ≈ 3° drop over 1 second at 30fps)
              const held = angleDiffEmaRef.current * 0.995
              angleDiffEmaRef.current = Math.max(rawSmoothed, held)
            }
            const effectiveAngleDiff = angleDiffEmaRef.current

            // ── Sticky-blue rail color with grace buffer ──
            // Apply slide shield to color decision: during fast movement (vibrato/shift), don't turn yellow
            const graceBuffer = (store.lastCalibrationAt && (now - store.lastCalibrationAt) < 500) ? 2 : 0
            const colorAngle = slideShieldFactor < 1 ? effectiveAngleDiff * slideShieldFactor : effectiveAngleDiff
            wristRailIsBlue = wristRailColorRef.current(colorAngle, graceBuffer)
            wristRailAngleDeg = effectiveAngleDiff

            rawDev = effectiveAngleDiff / 30 // Normalize for display
            smoothedDev = smootherRef.current.push(rawDev)

            // Cap tension by foreshortening confidence — avoid false alarms
            tensionTarget = computeWristTensionTarget(effectiveAngleDiff, sensitivity) * foreConf * slideShieldFactor

            // Bend lock: bendSign + refBendSign + forearmLen were resolved
            // above per analysis path so this stays unaware of which path is
            // active. Margin scales with forearm length (Issue 012).
            bendFwd = updateBendLock(
              effectiveAngleDiff,
              bendSign,
              refBendSign,
              bendForwardRef.current,
              forearmLen,
            )
            bendForwardRef.current = bendFwd

            // Track path for next frame's transition-clamp detection and for
            // the debug indicator (read via store by canvas-renderer).
            lastAnalysisPathRef.current = path

            // Wrist repair status update
            wristRepairStatus = wristRepairStatusRef.current(
              effectiveAngleDiff,
              now
            )

            // ── Rail direction smoothing ──
            const armDx = wrist.x - elbow.x
            const armDy = wrist.y - elbow.y
            const armMag = Math.sqrt(armDx * armDx + armDy * armDy)
            if (armMag > 0) {
              const currentDirX = armDx / armMag
              const currentDirY = armDy / armMag
              if (railDirRef.current) {
                railDirRef.current = smoothDirection2D(
                  railDirRef.current.x, railDirRef.current.y,
                  currentDirX, currentDirY, 0.08,
                )
              } else {
                railDirRef.current = { x: currentDirX, y: currentDirY }
              }
            }

            // ── Rail 5-second challenge timer ──
            const RAIL_DEADZONE_DEG = 10
            const isStraight = effectiveAngleDiff <= RAIL_DEADZONE_DEG
            const railResult = railTimerRef.current(isStraight, dt, now)

            // One-Euro filtered coordinates for smooth rendering
            const f = wristFiltersRef.current
            filteredWristCoords = {
              ex: f.ex(elbow.x * canvas.width, t),
              ey: f.ey(elbow.y * canvas.height, t),
              wx: f.wx(wrist.x * canvas.width, t),
              wy: f.wy(wrist.y * canvas.height, t),
              ix: f.ix(index.x * canvas.width, t),
              iy: f.iy(index.y * canvas.height, t),
              mx: f.mx(((pinky.x + index.x) / 2) * canvas.width, t),
              my: f.my(((pinky.y + index.y) / 2) * canvas.height, t),
            }

            // Store confidence for renderer warning
            wristForeConf = foreConf

            // Rail-specific store fields
            smoothedRailDir = railDirRef.current ?? undefined
            railTimerValue = railResult.timerValue
            railSuccessGlow = railResult.successGlow
            railSuccess = railResult.success
            railMilestoneLevel = railResult.milestoneLevel
          } else if (store.focusMode === 'violin' && store.masterPrint.mode === 'violin') {
            const wrist = landmarks[15]!
            const result = violinRef.current.analyze(wrist.y, store.masterPrint)
            rawDev = result.smoothedDrift
            smoothedDev = result.effectiveDrift
            tensionTarget = result.tensionTarget
            driftDir = result.driftDirection

            // Deadzone ±4 Grad um Zielhöhe
            const DEADZONE_DEGREES = 4
            // rawDev ist in normierten Einheiten, Umrechnung auf Grad:
            // Annahme: 1.0 = 90 Grad, also 1 Grad ≈ 1/90
            const deviationDeg = rawDev * 90
            const inDeadzone = Math.abs(deviationDeg) <= DEADZONE_DEGREES

            // Dual-speed for violin: faster return
            const fallingRate = result.isLargeMove ? 0.35 : 0.15
            tensionRef.current = computeTension(tensionRef.current, tensionTarget, result.isLargeMove ? 0.15 : 0.05, fallingRate)

            // ── Hold milestone timer (same timer, mode-agnostic) ──
            const violinRailResult = railTimerRef.current(inDeadzone, dt, now)
            railSuccessGlow = violinRailResult.successGlow
            railSuccess = violinRailResult.success
            railMilestoneLevel = violinRailResult.milestoneLevel

            // Session-Tracking inkl. Deadzone/Belohnungslogik
            const trackResult = sessionRef.current.recordFrame(
              tensionRef.current,
              classifyLayer(tensionRef.current, 'violin').layer,
              dt,
              inDeadzone,
              railSuccess,
              railMilestoneLevel,
            )

            // Push to store (batched, Zustand merges)
            usePoseStore.getState().updateFrame({
              tensionScore: tensionRef.current,
              smoothedDeviation: smoothedDev,
              rawDeviation: rawDev,
              layerInfo: classifyLayer(tensionRef.current, 'violin'),
              returnGlowTimer: trackResult.glowTimer,
              driftDirection: driftDir,
              streakSeconds: trackResult.streakSeconds,
              maxStreak: trackResult.maxStreak,
              // Deadzone-Status für Rendering
              violinDeadzone: inDeadzone,
              // Hold milestone golden flash
              railSuccessGlow,
              holdMilestoneLevel: railMilestoneLevel,
            })
          }

          // Tension update (shoulder/wrist use slower rising rate for calm color transitions)
          if (store.focusMode !== 'violin') {
            tensionRef.current = computeTension(tensionRef.current, tensionTarget, 0.08, 0.15)

            const layerInfo = classifyLayer(tensionRef.current, store.focusMode, driftDir)

            // Session tracking
            const isRepaired = wristRepairStatus?.repaired ?? undefined
            const trackResult = sessionRef.current.recordFrame(tensionRef.current, layerInfo.layer, dt, isRepaired, railSuccess, railMilestoneLevel)

            // Push to store (batched, Zustand merges)
            usePoseStore.getState().updateFrame({
              tensionScore: tensionRef.current,
              smoothedDeviation: smoothedDev,
              rawDeviation: rawDev,
              layerInfo,
              returnGlowTimer: trackResult.glowTimer,
              lastBendForward: bendFwd,
              driftDirection: driftDir,
              filteredWristCoords,
              wristForeshorteningConfidence: wristForeConf,
              streakSeconds: trackResult.streakSeconds,
              maxStreak: trackResult.maxStreak,
              // Wrist repair status for rendering/feedback
              wristRepairStatus: wristRepairStatus,
              // Rail state
              smoothedRailDir,
              railTimerValue,
              railSuccessGlow,
              holdMilestoneLevel: railMilestoneLevel,
              // Sticky-blue rail color
              wristRailIsBlue,
              wristRailAngleDeg,
              // Analysis path (for debug indicator + future fallback UX)
              wristAnalysisPath: lastAnalysisPathRef.current,
            })
          }
        }

        // Render (reads store via getState, plus direct landmarks)
        renderFrame(ctx, canvas.width, canvas.height, now, landmarks, dt, handLandmarksRef.current)
      } else {
        // No body detected
        wristPrevPosRef.current = null
        wristSlideShieldRef.current = 0
        if (store.distanceOk) {
          usePoseStore.setState({ distanceOk: false })
        }
        // Auslöse-Tor weiterführen, solange noch nicht kalibriert (#59). Ohne
        // Körper gilt der Abstand als nicht ok → ein bewusster Auslöser wartet
        // ruhig weiter (waiting), ohne Körper bleibt es idle.
        if (!store.masterPrint && !store.isCalibrating) {
          const readiness = readinessGateRef.current.update({ distanceOk: false, dtMs: dt * 1000 })
          if (
            readiness.phase !== store.readinessPhase ||
            readiness.timedOut !== store.readinessTimedOut
          ) {
            usePoseStore.getState().setReadiness(readiness.phase, readiness.timedOut)
          }
        }
        renderFrame(ctx, canvas.width, canvas.height, now, null, dt, handLandmarksRef.current)
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }

    animFrameRef.current = requestAnimationFrame(detect)
  }

  const startTracking = useCallback(() => {
    sessionRef.current.start()
  }, [])

  const stopTracking = useCallback(() => {
    return sessionRef.current.stop()
  }, [])

  // Bewusster Kalibrier-Auslöser (#59): Stimme „bereit" / Knopf „Haltung
  // speichern" (T4) rufen dies auf. Latcht den Wunsch im Auslöse-Tor; der
  // Countdown feuert automatisch, sobald der Abstand passt (Distanz-Gate).
  const armReadiness = useCallback(() => {
    readinessGateRef.current.requestArm()
  }, [])

  return { resetAnalysisState, armReadiness, landmarkerRef, handLandmarkerRef, startTracking, stopTracking }
}
