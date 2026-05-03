// ── App Navigation ──
export type AppScreen = 'home' | 'setup' | 'session' | 'results'

// ── Instruments ──
export type Instrument = 'violin'

export interface InstrumentMeta {
  id: Instrument
  name: string
  icon: string
  description: string
  modes: FocusMode[]
}

// ── Focus Modes ──
export type FocusMode = 'violin' | 'shoulder' | 'wrist'

// ── View Modes ──
export type ViewMode = 'flow' | 'analyse'

// ── Sensitivity ──
export type SensitivityLevel = 'low' | 'med' | 'high'

export interface SensitivityPreset {
  startThresh: number
  fullThresh: number
  tensionRate: number
  decayRate: number
  wristStart: number
  wristFull: number
}

// ── Layers ──
export type Layer = 'flow' | 'bewusst' | 'achtung' | 'limit'

export interface LayerInfo {
  layer: Layer
  label: string
  statusMessage: string
  statusType: 'good' | 'yellow' | 'purple'
}

// ── Landmarks ──
export interface Landmark {
  x: number
  y: number
  z: number
  visibility: number
}

// MediaPipe landmark indices used by the system
export const LANDMARKS = {
  LEFT_EAR: 7,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  LEFT_WRIST: 15,
  LEFT_PINKY: 17,
  LEFT_INDEX: 19,
} as const

// ── Master Print (discriminated union) ──
export interface ShoulderMasterPrint {
  mode: 'shoulder'
  earShoulderDist: number
}

export interface WristMasterPrint {
  mode: 'wrist'
  flexAngle: number           // Projected flexion/extension angle at calibration
  flexBendDir: number         // Bend direction sign at calibration
  calibArmLength2D: number    // 2D elbow-wrist distance at calibration (normalized)
  calib2DAngle?: number       // 2D collinearity angle at calibration (backward-compatible)
}

export interface ViolinMasterPrint {
  mode: 'violin'
  calibWristX: number
  calibWristY: number
}

export type MasterPrint = ShoulderMasterPrint | WristMasterPrint | ViolinMasterPrint

// ── Frame Analysis Result ──
export interface FrameAnalysis {
  rawDeviation: number
  smoothedDeviation: number
  tensionScore: number
  layerInfo: LayerInfo
  returnGlowTimer: number
  // Mode-specific extras
  bendDirection?: number       // wrist: locked bend direction sign
  lastBendForward?: boolean    // wrist: locked direction flag
  driftDirection?: number      // violin: 1 = sinking, -1 = too high
}

// ── Session ──
export interface ZoneCounters {
  flow: number
  bewusst: number
  achtung: number
  limit: number
}

export interface TensionTimelineEntry {
  t: number
  tension: number
  layer: Layer
}

export interface SessionStats {
  durationMs: number
  durationMinutes: number
  durationSeconds: number
  totalFrames: number
  zones: ZoneCounters
  zonePercentages: {
    flow: number
    bewusst: number
    achtung: number
    limit: number
  }
  tensionTimeline: TensionTimelineEntry[]
  maxFlowStreak: number
  // Ankerpunkte und aufsummierte Reparaturzeit
  anchorPoints?: number
  repairedTime?: number
  // Progressive Haltungs-Meilensteine
  holdMilestones?: number
  bestMilestoneLevel?: number
}

export interface StoredSession {
  id: string
  timestamp: number
  instrument: Instrument
  focusMode: FocusMode
  sensitivity: SensitivityLevel
  durationMs: number
  zones: ZoneCounters
  zonePercentages: {
    flow: number
    bewusst: number
    achtung: number
    limit: number
  }
  tensionTimeline: TensionTimelineEntry[]
  maxFlowStreak: number
  holdMilestones?: number
  bestMilestoneLevel?: number
}

// ── Canvas Rendering Context ──
export interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  now: number
}
