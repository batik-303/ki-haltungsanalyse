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

  // Filtered wrist render coords
  filteredWristCoords: null,

  // Wrist foreshortening
  wristForeshorteningConfidence: 1,

  // Violin
  driftDirection: 1,

  // Streak
  flowStreak: 0,
  maxFlowStreak: 0,

  // Navigation actions
  goToSetup: (instrument) => set({
    appScreen: 'setup',
    selectedInstrument: instrument,
  }),

  goToSession: () => set({
    appScreen: 'session',
    masterPrint: null,
    calibratedShoulderWidth: null,
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
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    currentLayer: 'flow',
    currentLayerInfo: DEFAULT_LAYER_INFO,
    sessionActive: false,
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    returnGlowTimer: 0,
    lastBendForward: true,
    driftDirection: 1,
  }),

  setSensitivity: (level) => set({ sensitivity: level }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setDistanceOk: (ok) => set({ distanceOk: ok }),

  setCalibrating: (calibrating) => set({ isCalibrating: calibrating }),

  calibrate: (masterPrint, shoulderWidth) => set({
    masterPrint,
    calibratedShoulderWidth: shoulderWidth,
    isCalibrating: false,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    sessionActive: false,
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    lastSessionStats: null,
    returnGlowTimer: 0,
    lastBendForward: true,
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
  }),

  endSession: (stats) => set({
    sessionActive: false,
    masterPrint: null,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    returnGlowTimer: 0,
    lastSessionStats: stats,
  }),

  reset: () => set({
    masterPrint: null,
    calibratedShoulderWidth: null,
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
    driftDirection: 1,
  }),
}))

// Re-export for convenience
export { SENSITIVITY_PRESETS }
