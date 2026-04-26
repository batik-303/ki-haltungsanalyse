import { create } from 'zustand'
import type {
  FocusMode,
  SensitivityLevel,
  MasterPrint,
  Layer,
  LayerInfo,
  ZoneCounters,
  SessionStats,
} from '../core/types'
import { SENSITIVITY_PRESETS } from '../core/config/sensitivity'

export interface PoseState {
  // Mode
  focusMode: FocusMode
  sensitivity: SensitivityLevel

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

  // Violin-specific
  driftDirection: number

  // Actions
  setFocusMode: (mode: FocusMode) => void
  setSensitivity: (level: SensitivityLevel) => void
  setDistanceOk: (ok: boolean) => void
  setCalibrating: (calibrating: boolean) => void
  calibrate: (masterPrint: MasterPrint, shoulderWidth: number) => void
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
}

const DEFAULT_LAYER_INFO: LayerInfo = {
  layer: 'flow',
  label: '–',
  statusMessage: 'Kamera wird geladen...',
  statusType: 'good',
}

export const usePoseStore = create<PoseState>((set) => ({
  // Mode
  focusMode: 'violin',
  sensitivity: 'med',

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

  // Violin
  driftDirection: 1,

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

  setDistanceOk: (ok) => set({ distanceOk: ok }),

  setCalibrating: (calibrating) => set({ isCalibrating: calibrating }),

  calibrate: (masterPrint, shoulderWidth) => set({
    masterPrint,
    calibratedShoulderWidth: shoulderWidth,
    isCalibrating: false,
    tensionScore: 0,
    smoothedDeviation: 0,
    rawDeviation: 0,
    sessionActive: true,
    sessionStart: performance.now(),
    sessionZones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    lastSessionStats: null,
    returnGlowTimer: 0,
    lastBendForward: true,
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
