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
/**
 * #215: Ändert sich der Sensor-Wert so lange nicht, gilt er als eingefroren
 * (iPad: nur ein einzelner Wert) → wie „kein Sensor“. Ein lebender Sensor
 * rauscht immer ein wenig.
 */
export const TILT_STALE_MS = 3000

export interface OrientationReading {
  beta: number | null
  gamma: number | null
}

const RAD = Math.PI / 180

/**
 * Bildschirm-Drehung in Grad (0/90/180/270). Bevorzugt `screen.orientation.angle`;
 * ältere Safari-Versionen kennen nur `window.orientation` (−90/0/90/180).
 */
export function normalizeScreenAngle(
  orientationAngle: number | undefined,
  windowOrientation: number | undefined,
): number {
  const angle = orientationAngle ?? windowOrientation ?? 0
  return ((angle % 360) + 360) % 360
}

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
  /** Einmal erledigt (kein Sensor, abgelehnt, eingefroren), bleibt das Kärtchen weg. */
  done: boolean
  /** Warum erledigt (fürs Diagnose-Log); `null`, solange das Kärtchen läuft. */
  doneReason: DeviceTiltDoneReason | null
  /** Letzter Messwert; `null` = noch keiner. */
  lastTilt: number | null
  /** Zeitpunkt der letzten Wert-Änderung (#215). */
  lastChangeAt: number | null
  /** Hat sich ein Wert schon einmal geändert? Erst dann zeigt das Kärtchen etwas. */
  live: boolean
}

export type DeviceTiltDoneReason = 'no-sensor' | 'denied' | 'stale'

export function createDeviceTiltHintState(): DeviceTiltHintState {
  return {
    view: 'hidden',
    distanceAllowed: false,
    startedAt: null,
    level: false,
    done: false,
    doneReason: null,
    lastTilt: null,
    lastChangeAt: null,
    live: false,
  }
}

function finish(state: DeviceTiltHintState, reason: DeviceTiltDoneReason): DeviceTiltHintState {
  return { ...state, view: 'hidden', distanceAllowed: true, done: true, doneReason: reason }
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
  if (permission === 'denied') return finish(state, 'denied')
  if (permission === 'pending') return { ...state, view: 'hidden' }

  const startedAt = state.startedAt ?? nowMs
  const elapsed = nowMs - startedAt

  // Leere Meldung nach echten Werten: letzten Wert behalten (zählt nicht als Änderung).
  const tilt = tiltDeg ?? state.lastTilt
  if (tilt === null) {
    // Kein Sensor oder keine Erlaubnis: nichts zeigen, Abstand nicht aufhalten.
    if (elapsed >= TILT_NO_SENSOR_GRACE_MS) return finish({ ...state, startedAt }, 'no-sensor')
    return { ...state, view: 'hidden', startedAt }
  }

  const changed = state.lastTilt !== null && tilt !== state.lastTilt
  const lastChangeAt = state.lastChangeAt === null || changed ? nowMs : state.lastChangeAt
  const next = { ...state, startedAt, lastTilt: tilt, lastChangeAt, live: state.live || changed }

  // #215: Werte eingefroren (z. B. nur ein einzelner Wert) → wie kein Sensor.
  if (nowMs - lastChangeAt >= TILT_STALE_MS) return finish(next, 'stale')
  // Erst ein sich ändernder Wert zeigt, dass der Sensor lebt: vorher kein „schief“.
  if (!next.live) return { ...next, view: 'hidden' }

  const isLevel = state.level ? tilt <= TILT_LEVEL_EXIT_DEG : tilt <= TILT_LEVEL_ENTER_DEG

  return {
    ...next,
    view: isLevel ? 'level' : 'tilted',
    distanceAllowed: state.distanceAllowed || isLevel || elapsed >= TILT_DISTANCE_AFTER_MS,
    level: isLevel,
  }
}
