import type { PoseState } from './pose-store'

// ── Session phase (derived from existing state) ──
// Die Kalibrierung geht direkt in die Analyse über (#58): sobald ein
// MasterPrint existiert, läuft die Session sofort — es gibt keinen bewussten
// „Start"-Schritt und damit keine Zwischen-Phase `ready-to-start` mehr.
export type SessionPhase = 'positioning' | 'ready-to-calibrate' | 'calibrating' | 'tracking'

export function selectSessionPhase(state: PoseState): SessionPhase {
  if (state.isCalibrating) return 'calibrating'
  if (!state.masterPrint && !state.distanceOk) return 'positioning'
  if (!state.masterPrint && state.distanceOk) return 'ready-to-calibrate'
  return 'tracking'
}

// ── Session phase hint text ──
export function selectPhaseHint(state: PoseState): string {
  switch (selectSessionPhase(state)) {
    case 'positioning': return 'Positioniere dich vor der Kamera'
    case 'ready-to-calibrate': return 'Sag „bereit“ – oder tippe „Haltung speichern“'
    case 'calibrating': return 'Einen Moment …'
    case 'tracking': return "Sage 'Stop' zum Beenden"
  }
}

// ── Status color from layer ──
export function selectStatusColor(state: PoseState): string {
  if (!state.masterPrint) return '#5b9bd5' // ready blue
  switch (state.currentLayerInfo.statusType) {
    case 'good': return '#2ecc71'
    case 'yellow': return '#f1c40f'
    case 'purple': return '#9b59b6'
  }
}

// ── Status message ──
export function selectStatusMessage(state: PoseState): string {
  if (state.isCalibrating) return 'Kalibrierung läuft...'
  if (!state.masterPrint) {
    const modeMessages: Record<string, string> = {
      shoulder: 'Schulter-Modus – stell dich vor die Kamera',
      wrist: 'Handgelenk-Modus – linker Arm sichtbar halten',
      violin: 'Geigen-Modus – Geige in Spielposition halten',
    }
    return modeMessages[state.focusMode] ?? 'Bereit'
  }
  return state.currentLayerInfo.statusMessage
}

// ── Whether calibration button should be locked ──
export function selectIsCalibrationLocked(state: PoseState): boolean {
  return !state.distanceOk || state.isCalibrating
}

// ── Session duration as formatted string ──
export function selectSessionDuration(state: PoseState): string {
  if (!state.sessionActive) return '0:00'
  const elapsed = (performance.now() - state.sessionStart) / 1000
  const min = Math.floor(elapsed / 60)
  const sec = Math.floor(elapsed % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// ── HUD fade: true when tension has been low for sustained period ──
// Uses flowStreak as proxy — if streak > 2s, tension has been < 5 for 2+ seconds
export function selectHudFaded(state: PoseState): boolean {
  if (!state.masterPrint) return false
  if (!state.sessionActive && !state.masterPrint) return false
  return state.flowStreak > 2
}
