import type { PoseState } from './pose-store'

// ── Session phase (derived from existing state) ──
export type SessionPhase = 'positioning' | 'ready-to-calibrate' | 'calibrating' | 'ready-to-start' | 'tracking'

export function selectSessionPhase(state: PoseState): SessionPhase {
  if (state.isCalibrating) return 'calibrating'
  if (!state.masterPrint && !state.distanceOk) return 'positioning'
  if (!state.masterPrint && state.distanceOk) return 'ready-to-calibrate'
  if (state.masterPrint && !state.sessionActive) return 'ready-to-start'
  return 'tracking'
}

// ── Session phase hint text ──
export function selectPhaseHint(state: PoseState): string {
  switch (selectSessionPhase(state)) {
    case 'positioning': return 'Positioniere dich vor der Kamera'
    case 'ready-to-calibrate': return "Sage 'Kalibrieren' wenn bereit"
    case 'calibrating': return 'Kalibrierung läuft...'
    case 'ready-to-start': return "Sage 'Start' um die Session zu starten"
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
