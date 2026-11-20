/**
 * #210: „Gerät steht gerade" vor der Kalibrierung (Lagesensor).
 *
 * Reine Logik ohne Browser-API: Neigung aus `deviceorientation` (beta/gamma)
 * plus Bildschirm-Drehung, und ein kleiner Ablauf für das Kärtchen. Zuerst kommt
 * nur das Gerät-Kärtchen; der Abstands-Hinweis folgt, sobald das Gerät gerade
 * steht. Nie blockieren: nach kurzer Wartezeit kommt der Abstand trotzdem.
 */

/** Ab dieser Neigung (Grad) gilt das Gerät als gerade. */
export const TILT_LEVEL_ENTER_DEG = 10
/** Erst über dieser Neigung gilt es wieder als schief (Hysterese gegen Flackern). */
export const TILT_LEVEL_EXIT_DEG = 12
/** Steht das Gerät bis dahin nicht gerade, kommt der Abstands-Hinweis trotzdem dazu. */
export const TILT_DISTANCE_AFTER_MS = 5000
/** Kommt so lange keine Sensor-Messung, gilt: kein Sensor/keine Erlaubnis → Abstand sofort. */
export const TILT_NO_SENSOR_GRACE_MS = 500
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

/**
 * Stand der Sensor-Erlaubnis. iOS fragt beim Start-Tippen (`pending`, bis die
 * Antwort da ist); andere Systeme brauchen keine Frage (`granted`).
 */
export type DeviceTiltPermission = 'pending' | 'granted' | 'denied'

export interface DeviceTiltHintState {
  view: DeviceTiltView
  /** Darf der Abstands-Hinweis schon erscheinen? */
  distanceAllowed: boolean
  /** Zeitpunkt des ersten Schritts; davor läuft keine Uhr. */
  startedAt: number | null
  /** Seit wann das Gerät ununterbrochen gerade steht. */
  levelSince: number | null
  /** Einmal erledigt (gerade bestätigt oder kein Sensor), bleibt das Kärtchen weg. */
  done: boolean
}

export function createDeviceTiltHintState(): DeviceTiltHintState {
  return { view: 'hidden', distanceAllowed: false, startedAt: null, levelSince: null, done: false }
}

/**
 * Ein Schritt des Kärtchen-Ablaufs. `tiltDeg` = Ergebnis von
 * `computeDeviceTiltDeg` (`null` = noch keine Messung). Solange die
 * Erlaubnis-Frage offen ist, läuft keine Uhr; abgelehnt → sofort Abstand.
 */
export function stepDeviceTiltHint(
  state: DeviceTiltHintState,
  tiltDeg: number | null,
  nowMs: number,
  permission: DeviceTiltPermission = 'granted',
): DeviceTiltHintState {
  if (state.done) return state
  if (permission === 'denied') {
    return { ...state, view: 'hidden', distanceAllowed: true, done: true }
  }
  if (permission === 'pending') return { ...state, view: 'hidden' }

  const startedAt = state.startedAt ?? nowMs
  const elapsed = nowMs - startedAt

  if (tiltDeg === null) {
    // Kein Sensor oder keine Erlaubnis: nichts zeigen, Abstand nicht aufhalten.
    const noSensor = elapsed >= TILT_NO_SENSOR_GRACE_MS
    return { ...state, view: 'hidden', startedAt, distanceAllowed: state.distanceAllowed || noSensor, done: noSensor }
  }

  const wasLevel = state.levelSince !== null
  const isLevel = wasLevel ? tiltDeg <= TILT_LEVEL_EXIT_DEG : tiltDeg <= TILT_LEVEL_ENTER_DEG
  const levelSince = isLevel ? (state.levelSince ?? nowMs) : null

  if (levelSince !== null && nowMs - levelSince >= TILT_LEVEL_HOLD_MS) {
    return { view: 'hidden', distanceAllowed: true, startedAt, levelSince, done: true }
  }

  return {
    view: isLevel ? 'level' : 'tilted',
    distanceAllowed: state.distanceAllowed || elapsed >= TILT_DISTANCE_AFTER_MS,
    startedAt,
    levelSince,
    done: false,
  }
}
