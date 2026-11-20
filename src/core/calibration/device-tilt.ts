/**
 * #210: „Gerät steht gerade" vor der Kalibrierung (Lagesensor).
 *
 * Reine Logik ohne Browser-API: Neigung aus `deviceorientation` (beta/gamma)
 * plus Bildschirm-Drehung, und ein kleiner Ablauf für das Kärtchen. Der Hinweis
 * blockiert nie: Steht das Gerät nach kurzer Zeit nicht gerade, verschwindet er.
 */

/** Ab dieser Neigung (Grad) gilt das Gerät als gerade. */
export const TILT_LEVEL_ENTER_DEG = 5
/** Erst über dieser Neigung gilt es wieder als schief (Hysterese gegen Flackern). */
export const TILT_LEVEL_EXIT_DEG = 7
/** Nach dieser Zeit ohne Geradestehen verschwindet das Kärtchen; nichts hält fest. */
export const TILT_HINT_TIMEOUT_MS = 3000
/** So lange zeigt das Kärtchen „Gerät steht gerade", bevor es verschwindet. */
export const TILT_LEVEL_HOLD_MS = 1000

export interface OrientationReading {
  beta: number | null
  gamma: number | null
}

const RAD = Math.PI / 180

/**
 * Winkel (Grad) zwischen der Oben-Richtung des Bildschirms und der echten
 * Senkrechten. 0° = Gerät steht gerade; Vor-/Zurücklehnen und seitliches
 * Kippen zählen gleich. `screenAngle` = `screen.orientation.angle` (0/90/180/270).
 * Ohne Sensorwerte `null`.
 */
export function computeDeviceTiltDeg(reading: OrientationReading, screenAngle: number): number | null {
  const { beta, gamma } = reading
  if (beta === null || gamma === null) return null

  // Oben-Vektor (Gegenrichtung der Schwerkraft) in Geräte-Koordinaten (W3C, Euler Z-X'-Y'').
  const upX = -Math.cos(beta * RAD) * Math.sin(gamma * RAD)
  const upY = Math.sin(beta * RAD)

  // Oben-Richtung des Bildschirms in Geräte-Koordinaten.
  const screenUpX = Math.sin(screenAngle * RAD)
  const screenUpY = Math.cos(screenAngle * RAD)

  const dot = Math.max(-1, Math.min(1, upX * screenUpX + upY * screenUpY))
  return Math.acos(dot) / RAD
}

export type DeviceTiltView = 'hidden' | 'tilted' | 'level'

export interface DeviceTiltHintState {
  view: DeviceTiltView
  /** Zeitpunkt der ersten Messung; davor läuft keine Uhr. */
  startedAt: number | null
  /** Seit wann das Gerät ununterbrochen gerade steht. */
  levelSince: number | null
  /** Einmal verschwunden, bleibt das Kärtchen weg. */
  done: boolean
}

export function createDeviceTiltHintState(): DeviceTiltHintState {
  return { view: 'hidden', startedAt: null, levelSince: null, done: false }
}

/**
 * Ein Schritt des Kärtchen-Ablaufs. `tiltDeg` = Ergebnis von
 * `computeDeviceTiltDeg` (`null` = kein Sensor/keine Erlaubnis → nichts zeigen).
 */
export function stepDeviceTiltHint(
  state: DeviceTiltHintState,
  tiltDeg: number | null,
  nowMs: number,
): DeviceTiltHintState {
  if (state.done) return state
  if (tiltDeg === null) return { ...state, view: 'hidden' }

  const startedAt = state.startedAt ?? nowMs
  const wasLevel = state.levelSince !== null
  const isLevel = wasLevel ? tiltDeg <= TILT_LEVEL_EXIT_DEG : tiltDeg <= TILT_LEVEL_ENTER_DEG
  const levelSince = isLevel ? (state.levelSince ?? nowMs) : null

  const confirmed = levelSince !== null && nowMs - levelSince >= TILT_LEVEL_HOLD_MS
  const timedOut = levelSince === null && nowMs - startedAt >= TILT_HINT_TIMEOUT_MS
  if (confirmed || timedOut) {
    return { view: 'hidden', startedAt, levelSince, done: true }
  }

  return { view: isLevel ? 'level' : 'tilted', startedAt, levelSince, done: false }
}
