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
  goToSession: () => void
  goToResults: (stats: SessionStats) => void
  goHome: () => void

  // Actions
  setFocusMode: (mode: FocusMode) => void
  setSensitivity: (level: SensitivityLevel) => void
  setViewMode: (mode: ViewMode) => void
  setDistanceOk: (ok: boolean) => void
  setCalibrating: (calibrating: boolean) => void
  toggleDebugLandmarks: () => void
  calibrate: (masterPrint: MasterPrint, shoulderWidth: number) => void
  startSession: () => void
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

export const usePoseStore = create<PoseState>((set) => ({
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

  goToSession: () => set({
    appScreen: 'session',
    masterPrint: null,
    calibratedShoulderWidth: null,
    lastCalibrationAt: null,
    isCalibrating: false,
    distanceOk: false,
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
    driftDirection: 1,
    lastSessionStats: null,
    flowStreak: 0,
    maxFlowStreak: 0,
  }),

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
    driftDirection: 1,
    lastSessionStats: null,
    flowStreak: 0,
    maxFlowStreak: 0,
  }),

  // Actions
  setFocusMode: (mode) => set({
    focusMode: mode,
    masterPrint: null,
    calibratedShoulderWidth: null,
    lastCalibrationAt: null,
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
    driftDirection: 1,
  }),

  setSensitivity: (level) => set({ sensitivity: level }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setDistanceOk: (ok) => set({ distanceOk: ok }),

  setCalibrating: (calibrating) => set({ isCalibrating: calibrating }),

  toggleDebugLandmarks: () => set((s) => ({ debugLandmarks: !s.debugLandmarks })),

  calibrate: (masterPrint, shoulderWidth) => set({
    masterPrint,
    calibratedShoulderWidth: shoulderWidth,
    lastCalibrationAt: performance.now(),
    isCalibrating: false,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    sessionActive: false,
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    lastSessionStats: null,
    returnGlowTimer: 0,
    lastBendForward: true,
    wristRailAngleDeg: 0,
    wristRailIsBlue: true,
    driftDirection: 1,
  }),

  startSession: () => set({
    sessionActive: true,
    sessionStart: performance.now(),
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    lastSessionStats: null,
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
  }),

  endSession: (stats) => set({
    sessionActive: false,
    masterPrint: null,
    lastCalibrationAt: null,
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
    driftDirection: 1,
  }),
}))

// Re-export for convenience
export { SENSITIVITY_PRESETS }
