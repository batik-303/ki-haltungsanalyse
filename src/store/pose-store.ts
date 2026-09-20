import { create } from 'zustand'
import type {
  AppScreen,
  Instrument,
  FocusMode,
  SensitivityLevel,
  MasterPrint,
  Layer,
  LayerInfo,
  ViewMode,
  ZoneCounters,
  SessionStats,
} from '../core/types'
import { SENSITIVITY_PRESETS } from '../core/config/sensitivity'
import type { ReadinessPhase } from '../core/calibration/readiness-gate'
import type { PositioningStatus } from '../core/calibration/distance-guidance'

export interface PoseState {
  // Navigation
  appScreen: AppScreen
  selectedInstrument: Instrument | null

  // Mode
  focusMode: FocusMode
  sensitivity: SensitivityLevel
  viewMode: ViewMode

  // Calibration
  masterPrint: MasterPrint | null
  calibratedShoulderWidth: number | null
  lastCalibrationAt: number | null
  isCalibrating: boolean
  distanceOk: boolean
  // Richtung der Distanz fürs Positionier-Feedback („näher"/„zurück"). `distanceOk`
  // bleibt der Boolean fürs Gate; hier steht zusätzlich die Richtung für den Hinweis.
  distanceStatus: PositioningStatus

  // Kalibrier-Auslöser: Distanz-Gate mit Auto-Start (#59) — Snapshot fürs UI/
  // Canvas-Rand-Feedback. Die eigentliche Zustandsmaschine lebt als useRef im
  // Hook (Triple-State-System); hier landet nur der React-sichtbare Snapshot.
  readinessPhase: ReadinessPhase
  // Kante: Tor ist scharf → Countdown auslösen. Wird vom Verbraucher quittiert.
  readinessArmed: boolean
  // Warten auf den Abstand dauert ungewöhnlich lange — sanfter Hinweis auf den
  // Knopf „Haltung speichern", **kein** Sperren (kein Festhängen).
  readinessTimedOut: boolean

  // Live analysis (updated every frame from canvas loop)
  tensionScore: number
  smoothedDeviation: number
  rawDeviation: number
  currentLayer: Layer
  currentLayerInfo: LayerInfo

  // Session
  sessionActive: boolean
  sessionStart: number
  sessionZones: ZoneCounters
  lastSessionStats: SessionStats | null

  // Return-to-anchor
  returnGlowTimer: number


  // Wrist-specific
  lastBendForward: boolean
  // Reparatur-Status-Objekt (Deadzone/Hysterese)
  wristRepairStatus?: { repaired: boolean; [key: string]: any }

  // Wrist rail (Schiene)
  smoothedRailDir: { x: number; y: number } | null
  railTimerValue: number
  railSuccessGlow: number
  holdMilestoneLevel: number
  wristRailAngleDeg: number
  wristRailIsBlue: boolean
  // Analysis path used by the wrist analyzer this frame
  wristAnalysisPath: 'hand' | 'pose-fallback' | null

  // Violin-specific
  violinDeadzone?: boolean

  // Filtered wrist render coordinates (pixel space)
  filteredWristCoords: { ex: number; ey: number; wx: number; wy: number; ix: number; iy: number; mx: number; my: number } | null

  // Wrist foreshortening confidence (0 = arm points at camera, 1 = fully visible)
  wristForeshorteningConfidence: number

  // Violin-specific
  driftDirection: number

  // Streak
  flowStreak: number
  maxFlowStreak: number

  // Debug overlay (renders all 33 MediaPipe landmarks with indices)
  debugLandmarks: boolean

  // Navigation actions
  goToSetup: (instrument: Instrument) => void
  enterSession: (instrument: Instrument) => void
  goToSession: () => void
  goToResults: (stats: SessionStats) => void
  goHome: () => void
  practiceAgain: () => void

  // Actions
  setFocusMode: (mode: FocusMode) => void
  setSensitivity: (level: SensitivityLevel) => void
  setViewMode: (mode: ViewMode) => void
  setDistanceOk: (ok: boolean) => void
  setReadiness: (phase: ReadinessPhase, timedOut: boolean) => void
  setReadinessArmed: (armed: boolean) => void
  setCalibrating: (calibrating: boolean) => void
  toggleDebugLandmarks: () => void
  calibrate: (masterPrint: MasterPrint, shoulderWidth: number) => void
  recalibrate: () => void
  updateFrame: (data: FrameUpdate) => void
  endSession: (stats: SessionStats | null) => void
  reset: () => void
}

export interface FrameUpdate {
  tensionScore: number
  smoothedDeviation: number
  rawDeviation: number
  layerInfo: LayerInfo
  returnGlowTimer: number
  lastBendForward?: boolean
  driftDirection?: number
  sessionZones?: ZoneCounters
  // Filtered wrist render coordinates (pixel space)
  filteredWristCoords?: { ex: number; ey: number; wx: number; wy: number; ix: number; iy: number; mx: number; my: number }
  // Wrist foreshortening confidence (0..1)
  wristForeshorteningConfidence?: number
  // Reparatur-Status-Objekt (Deadzone/Hysterese)
  wristRepairStatus?: { repaired: boolean; [key: string]: any }
  // Wrist rail (Schiene)
  smoothedRailDir?: { x: number; y: number }
  railTimerValue?: number
  railSuccessGlow?: number
  holdMilestoneLevel?: number
  wristRailAngleDeg?: number
  wristRailIsBlue?: boolean
  wristAnalysisPath?: 'hand' | 'pose-fallback' | null
  // Violin-Deadzone-Status
  violinDeadzone?: boolean
  // Streak
  streakSeconds?: number
  maxStreak?: number
}

const DEFAULT_LAYER_INFO: LayerInfo = {
  layer: 'flow',
  label: '–',
  statusMessage: 'Kamera wird geladen...',
  statusType: 'good',
}

export const usePoseStore = create<PoseState>((set, get) => ({
  // Navigation
  appScreen: 'home',
  selectedInstrument: null,

  // Mode
  focusMode: 'violin',
  sensitivity: 'med',
  viewMode: 'analyse',

  // Calibration
  masterPrint: null,
  calibratedShoulderWidth: null,
  lastCalibrationAt: null,
  isCalibrating: false,
  distanceOk: false,
  distanceStatus: 'no-body',

  // Kalibrier-Auslöser (#59)
  readinessPhase: 'idle',
  readinessArmed: false,
  readinessTimedOut: false,

  // Live analysis
  tensionScore: 0,
  smoothedDeviation: 0,
  rawDeviation: 0,
  currentLayer: 'flow',
  currentLayerInfo: DEFAULT_LAYER_INFO,

  // Session
  sessionActive: false,
  sessionStart: 0,
  sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
  lastSessionStats: null,

  // Return-to-anchor
  returnGlowTimer: 0,

  // Wrist
  lastBendForward: true,

  // Wrist rail
  smoothedRailDir: null,
  railTimerValue: 0,
  railSuccessGlow: 0,
  holdMilestoneLevel: 0,
  wristRailAngleDeg: 0,
  wristRailIsBlue: true,
  wristAnalysisPath: null,

  // Filtered wrist render coords
  filteredWristCoords: null,

  // Wrist foreshortening
  wristForeshorteningConfidence: 1,

  // Violin
  driftDirection: 1,

  // Streak
  flowStreak: 0,
  maxFlowStreak: 0,

  // Debug overlay — default ON while we investigate the wrist analyzer.
  debugLandmarks: true,

  // Navigation actions
  goToSetup: (instrument) => set({
    appScreen: 'setup',
    selectedInstrument: instrument,
  }),

  // Session-Eintritt (#35): eine vorhandene Kalibrierung bleibt erhalten, damit
  // Schüler über die Übungswoche zwischen den Stunden weiterüben, ohne bei jedem
  // Eintritt neu zu kalibrieren. Da es keinen „Start"-Schritt mehr gibt (#58),
  // läuft die Analyse bei erhaltener Kalibrierung **sofort** weiter
  // (sessionActive + sessionStart → Phase 'tracking'); ohne Kalibrierung startet
  // die Session erst mit dem Kalibrieren. Der einzige bewusste Verwerf-Punkt
  // bleibt `recalibrate` (plus `setFocusMode`).
  goToSession: () => {
    const keepCalibration = get().masterPrint !== null
    set({
      appScreen: 'session',
      isCalibrating: false,
      distanceOk: false,
      distanceStatus: 'no-body',
      readinessPhase: 'idle',
      readinessArmed: false,
      readinessTimedOut: false,
      tensionScore: 0,
      smoothedDeviation: 0,
      rawDeviation: 0,
      currentLayer: 'flow',
      currentLayerInfo: DEFAULT_LAYER_INFO,
      sessionActive: keepCalibration,
      sessionStart: keepCalibration ? performance.now() : 0,
      sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
      returnGlowTimer: 0,
      lastBendForward: true,
      wristRailAngleDeg: 0,
      wristRailIsBlue: true,
      wristAnalysisPath: null,
      driftDirection: 1,
      lastSessionStats: null,
      flowStreak: 0,
      maxFlowStreak: 0,
    })
  },

  // V1-Flow: Home ist die Auswahlbühne, der CTA startet direkt die Session
  // (kein Setup-Zwischenschritt). Setzt das Instrument und übernimmt den
  // frischen Sitzungszustand von goToSession; der zuvor gewählte Fokus bleibt.
  enterSession: (instrument) => {
    get().goToSession()
    set({ selectedInstrument: instrument })
  },

  goToResults: (stats) => set({
    appScreen: 'results',
    sessionActive: false,
    lastSessionStats: stats,
  }),

  goHome: () => set({
    appScreen: 'home',
    selectedInstrument: null,
    masterPrint: null,
    calibratedShoulderWidth: null,
    lastCalibrationAt: null,
    isCalibrating: false,
    distanceOk: false,
    distanceStatus: 'no-body',
    readinessPhase: 'idle',
    readinessArmed: false,
    readinessTimedOut: false,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    currentLayer: 'flow',
    currentLayerInfo: DEFAULT_LAYER_INFO,
    sessionActive: false,
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    returnGlowTimer: 0,
    lastBendForward: true,
    wristRailAngleDeg: 0,
    wristRailIsBlue: true,
    wristAnalysisPath: null,
    driftDirection: 1,
    lastSessionStats: null,
    flowStreak: 0,
    maxFlowStreak: 0,
  }),

  // „Nochmal üben" auf dem results-Screen: neue Sitzung, gleiche Konfiguration.
  // Instrument, focusMode, sensitivity, viewMode UND die Kalibrierung bleiben
  // erhalten (#35) — nur der Analyse-/Sitzungs-/Statistikzustand wird zurück-
  // gesetzt. Führt direkt in die `session` (setup wurde mit #26 aus dem V1-Flow
  // genommen); da es keinen „Start"-Schritt mehr gibt (#58), läuft die neue
  // Session mit erhaltener Kalibrierung sofort (Phase 'tracking').
  practiceAgain: () => {
    const keepCalibration = get().masterPrint !== null
    set({
      appScreen: 'session',
      isCalibrating: false,
      distanceOk: false,
      distanceStatus: 'no-body',
      readinessPhase: 'idle',
      readinessArmed: false,
      readinessTimedOut: false,
      tensionScore: 0,
      smoothedDeviation: 0,
      rawDeviation: 0,
      currentLayer: 'flow',
      currentLayerInfo: DEFAULT_LAYER_INFO,
      sessionActive: keepCalibration,
      sessionStart: keepCalibration ? performance.now() : 0,
      sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
      returnGlowTimer: 0,
      lastBendForward: true,
      wristRailAngleDeg: 0,
      wristRailIsBlue: true,
      wristAnalysisPath: null,
      driftDirection: 1,
      lastSessionStats: null,
      flowStreak: 0,
      maxFlowStreak: 0,
    })
  },

  // Actions
  setFocusMode: (mode) => set({
    focusMode: mode,
    masterPrint: null,
    calibratedShoulderWidth: null,
    lastCalibrationAt: null,
    readinessPhase: 'idle',
    readinessArmed: false,
    readinessTimedOut: false,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    currentLayer: 'flow',
    currentLayerInfo: DEFAULT_LAYER_INFO,
    sessionActive: false,
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    returnGlowTimer: 0,
    lastBendForward: true,
    wristRailAngleDeg: 0,
    wristRailIsBlue: true,
    wristAnalysisPath: null,
    driftDirection: 1,
  }),

  setSensitivity: (level) => set({ sensitivity: level }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setDistanceOk: (ok) => set({ distanceOk: ok }),

  setReadiness: (phase, timedOut) => set({ readinessPhase: phase, readinessTimedOut: timedOut }),

  setReadinessArmed: (armed) => set({ readinessArmed: armed }),

  setCalibrating: (calibrating) => set({ isCalibrating: calibrating }),

  toggleDebugLandmarks: () => set((s) => ({ debugLandmarks: !s.debugLandmarks })),

  // Kalibrierung geht direkt in die Analyse über (#58): mit dem Speichern der
  // Haltung läuft die Session **sofort** (sessionActive + sessionStart) —
  // selectSessionPhase liefert direkt `tracking`. Es gibt keinen bewussten
  // „Start"-Schritt mehr. Der Session-Tracker (rAF-Loop-Ref) wird passend dazu
  // im Kalibrier-Erfolgszweig des Hooks gestartet (Triple-State-System).
  calibrate: (masterPrint, shoulderWidth) => set({
    masterPrint,
    calibratedShoulderWidth: shoulderWidth,
    lastCalibrationAt: performance.now(),
    isCalibrating: false,
    readinessPhase: 'idle',
    readinessArmed: false,
    readinessTimedOut: false,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    sessionActive: true,
    sessionStart: performance.now(),
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    lastSessionStats: null,
    returnGlowTimer: 0,
    lastBendForward: true,
    wristRailAngleDeg: 0,
    wristRailIsBlue: true,
    wristAnalysisPath: null,
    driftDirection: 1,
  }),

  // Bewusstes „Neu kalibrieren" (#35) — der EINZIGE Verwerf-Punkt für eine
  // erhaltene Kalibrierung (neben `setFocusMode`). Verwirft masterPrint,
  // Schulterbreite und Zeitstempel und setzt das Auslöse-Tor sowie den
  // sichtbaren Analyse-Zustand auf „idle" zurück.
  //
  // V1-Persistenz-Naht: Hier (und in `calibrate`) hängt später ein Lade-/
  // Speicher-Hook um den Store — recalibrate löscht die persistierte
  // Kalibrierung des aktuellen focusMode, calibrate schreibt sie. Bewusst noch
  // nicht implementiert (bleibt V0.1 in-memory); siehe Issue #35 / ADR.
  recalibrate: () => set({
    masterPrint: null,
    calibratedShoulderWidth: null,
    lastCalibrationAt: null,
    isCalibrating: false,
    sessionActive: false,
    readinessPhase: 'idle',
    readinessArmed: false,
    readinessTimedOut: false,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    currentLayer: 'flow',
    currentLayerInfo: DEFAULT_LAYER_INFO,
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    returnGlowTimer: 0,
    lastBendForward: true,
    wristRailAngleDeg: 0,
    wristRailIsBlue: true,
    wristAnalysisPath: null,
    driftDirection: 1,
  }),

  updateFrame: (data) => set({
    tensionScore: data.tensionScore,
    smoothedDeviation: data.smoothedDeviation,
    rawDeviation: data.rawDeviation,
    currentLayer: data.layerInfo.layer,
    currentLayerInfo: data.layerInfo,
    returnGlowTimer: data.returnGlowTimer,
    ...(data.lastBendForward !== undefined && { lastBendForward: data.lastBendForward }),
    ...(data.driftDirection !== undefined && { driftDirection: data.driftDirection }),
    ...(data.sessionZones && { sessionZones: data.sessionZones }),
    ...(data.filteredWristCoords && { filteredWristCoords: data.filteredWristCoords }),
    ...(data.wristForeshorteningConfidence !== undefined && { wristForeshorteningConfidence: data.wristForeshorteningConfidence }),
    ...(data.streakSeconds !== undefined && { flowStreak: data.streakSeconds }),
    ...(data.maxStreak !== undefined && { maxFlowStreak: data.maxStreak }),
    ...(data.wristRepairStatus !== undefined && { wristRepairStatus: data.wristRepairStatus }),
    ...(data.smoothedRailDir !== undefined && { smoothedRailDir: data.smoothedRailDir }),
    ...(data.railTimerValue !== undefined && { railTimerValue: data.railTimerValue }),
    ...(data.railSuccessGlow !== undefined && { railSuccessGlow: data.railSuccessGlow }),
    ...(data.holdMilestoneLevel !== undefined && { holdMilestoneLevel: data.holdMilestoneLevel }),
    ...(data.wristRailAngleDeg !== undefined && { wristRailAngleDeg: data.wristRailAngleDeg }),
    ...(data.wristRailIsBlue !== undefined && { wristRailIsBlue: data.wristRailIsBlue }),
    ...(data.wristAnalysisPath !== undefined && { wristAnalysisPath: data.wristAnalysisPath }),
  }),

  // Sitzungsende (#35): Kalibrierung bleibt erhalten, damit die Wiederholung
  // („Nochmal üben") direkt in den „bereit"-Zustand führt. Verworfen wird sie
  // nur bewusst über `recalibrate` (oder bei `setFocusMode`).
  endSession: (stats) => set({
    sessionActive: false,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    returnGlowTimer: 0,
    wristRailAngleDeg: 0,
    wristRailIsBlue: true,
    lastSessionStats: stats,
  }),

  reset: () => set({
    masterPrint: null,
    calibratedShoulderWidth: null,
    lastCalibrationAt: null,
    isCalibrating: false,
    readinessPhase: 'idle',
    readinessArmed: false,
    readinessTimedOut: false,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    currentLayer: 'flow',
    currentLayerInfo: DEFAULT_LAYER_INFO,
    sessionActive: false,
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    returnGlowTimer: 0,
    lastBendForward: true,
    wristRailAngleDeg: 0,
    wristRailIsBlue: true,
    wristAnalysisPath: null,
    driftDirection: 1,
  }),
}))

// Re-export for convenience
export { SENSITIVITY_PRESETS }
