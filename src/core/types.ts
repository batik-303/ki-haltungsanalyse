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

// MediaPipe HandLandmarker hand-landmark indices (21 per hand).
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const

// ── Master Print (discriminated union) ──
export interface ShoulderMasterPrint {
  mode: 'shoulder'
  earShoulderDist: number
}

/** Seite des Knicks im Bild: +1 / −1, 0 = unbekannt (nah an der Geraden). */
export type KnickSide = -1 | 0 | 1

export interface WristMasterPrint {
  mode: 'wrist'
  flexAngle: number           // Projected flexion/extension angle at calibration
  flexBendDir: number         // Hand-path bend sign (palm-normal · forearm) at calibration
  calibArmLength2D: number    // 2D-Unterarmlänge bei der Kalibrierung (normiert, mit aspect)
  calibKnick: number          // Knick-Baseline Hand-Pfad (2D-Winkel in Grad, ADR 0003)
  calibKnickSide: KnickSide   // Seite der gespeicherten Haltung (#91), 0 = nah an der Geraden
  // Pose-only fallback baselines — computed at calibration so runtime can
  // switch to the fallback path without a baseline mismatch when the hand
  // briefly disappears.
  flexBendDirFallback?: number
  calibKnickFallback: number  // Knick-Baseline Pose-Fallback (2D-Winkel in Grad)
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
