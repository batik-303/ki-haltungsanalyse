/**
 * #210: „Gerät steht gerade" vor der Kalibrierung (Lagesensor).
 *
 * Reine Logik ohne Browser-API: Neigung aus `deviceorientation` (beta/gamma)
 * plus Bildschirm-Drehung, und ein kleiner Ablauf für das Kärtchen. Zuerst kommt
 * nur das Gerät-Kärtchen; der Abstands-Hinweis folgt, sobald das Gerät gerade
 * steht. Nie blockieren: nach kurzer Wartezeit kommt der Abstand trotzdem. Das
 * Kärtchen bleibt bis zum Speichern sichtbar und reagiert live auf die Lage.
 */

/** Ab dieser Neigung (Grad) gilt das Gerät als gerade. */
export const TILT_LEVEL_ENTER_DEG = 10
/** Erst über dieser Neigung gilt es wieder als schief (Hysterese gegen Flackern). */
export const TILT_LEVEL_EXIT_DEG = 12
/** Steht das Gerät bis dahin nicht gerade, kommt der Abstands-Hinweis trotzdem dazu. */
export const TILT_DISTANCE_AFTER_MS = 5000
/** Kommt so lange keine Sensor-Messung, gilt: kein Sensor/keine Erlaubnis → Abstand sofort. */
export const TILT_NO_SENSOR_GRACE_MS = 500

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

/** #147: kurzer Kärtchen-Text, aus Spiel-Entfernung lesbar; Häkchen, sobald es passt. */
export function computeDeviceTiltMessage(view: 'tilted' | 'level'): string {
  return view === 'level' ? 'Gerät gerade ✓' : 'Gerät gerade stellen'
}

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
  /** Stand das Gerät beim letzten Schritt gerade? (für die Hysterese) */
  level: boolean
  /** Einmal erledigt (kein Sensor oder abgelehnt), bleibt das Kärtchen weg. */
  done: boolean
}

export function createDeviceTiltHintState(): DeviceTiltHintState {
  return { view: 'hidden', distanceAllowed: false, startedAt: null, level: false, done: false }
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
    // Schon echte Werte gesehen: eine leere Meldung zwischendurch ignorieren.
    if (state.view !== 'hidden') return state
    // Kein Sensor oder keine Erlaubnis: nichts zeigen, Abstand nicht aufhalten.
    const noSensor = elapsed >= TILT_NO_SENSOR_GRACE_MS
    return { ...state, view: 'hidden', startedAt, distanceAllowed: state.distanceAllowed || noSensor, done: noSensor }
  }

  const isLevel = state.level ? tiltDeg <= TILT_LEVEL_EXIT_DEG : tiltDeg <= TILT_LEVEL_ENTER_DEG

  return {
    view: isLevel ? 'level' : 'tilted',
    distanceAllowed: state.distanceAllowed || isLevel || elapsed >= TILT_DISTANCE_AFTER_MS,
    startedAt,
    level: isLevel,
    done: false,
  }
}
