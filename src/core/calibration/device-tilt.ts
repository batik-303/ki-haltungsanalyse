/**
 * #210: „Gerät steht gerade" vor der Kalibrierung (Lagesensor).
 *
 * Reine Logik ohne Browser-API: Neigung aus `deviceorientation` (beta/gamma)
 * plus Bildschirm-Drehung, und ein kleiner Ablauf für das Kärtchen. Zuerst kommt
 * nur das Gerät-Kärtchen; der Abstands-Hinweis folgt, sobald das Gerät gerade
 * steht. Nie blockieren: nach kurzer Wartezeit kommt der Abstand trotzdem. Das
 * Kärtchen bleibt bis zum Speichern sichtbar und reagiert live auf die Lage.
 */

/** Bis zu dieser Neigung (Grad, Zurück-/Vorlehnen) gilt das Gerät als gerade; #215: Notenständer-Messung der Nutzerin. */
export const TILT_LEVEL_ENTER_DEG = 25
/** Erst über dieser Neigung gilt es wieder als schief (Hysterese gegen Flackern). */
export const TILT_LEVEL_EXIT_DEG = 27
/** Steht das Gerät bis dahin nicht gerade, kommt der Abstands-Hinweis trotzdem dazu. */
export const TILT_DISTANCE_AFTER_MS = 5000
/** Kommt so lange keine Sensor-Messung, gilt: kein Sensor/keine Erlaubnis → Abstand sofort. */
export const TILT_NO_SENSOR_GRACE_MS = 500
/**
 * #215: Kommt so lange nach dem ersten Wert kein abweichender, gilt der Sensor
 * als eingefroren (iPad: nur ein einzelner Wert): Kärtchen weg, Abstand frei.
 * Nicht endgültig: kommen später neue Werte, erscheint es wieder. Hat er
 * einmal gelebt, bleibt er an, auch wenn das Gerät ruhig steht.
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
 * Neigung (Grad) der Bildschirm-Ebene zur Senkrechten: Vor- und Zurücklehnen,
 * hochkant wie quer. 0° = Gerät steht aufrecht. #215: ohne Bildschirm-Winkel
 * (iPadOS meldet hochkant 90°); seitliches Drehen in der Bildebene zählt nicht,
 * die Knick-Messung ist handlokal. Ohne Sensorwerte `null`.
 */
export function computeDeviceTiltDeg(reading: OrientationReading): number | null {
  const { beta, gamma } = reading
  if (beta === null || gamma === null) return null
  // Schwerkraft-Anteil senkrecht zum Bildschirm (W3C, Euler Z-X'-Y'').
  const normal = Math.min(1, Math.abs(Math.cos(beta * RAD) * Math.cos(gamma * RAD)))
  return Math.asin(normal) / RAD
}

/** `ask` = Einladung zum Tippen für die iOS-Sensor-Frage (#215). */
export type DeviceTiltView = 'hidden' | 'ask' | 'tilted' | 'level'

/** #147: kurzer Kärtchen-Text, aus Spiel-Entfernung lesbar; Häkchen, sobald es passt. */
export function computeDeviceTiltMessage(view: 'ask' | 'tilted' | 'level'): string {
  if (view === 'ask') return 'Tippe hier: Steht dein Gerät gerade?'
  return view === 'level' ? 'Gerät gerade ✓' : 'Gerät gerade stellen'
}

/**
 * Stand der Sensor-Erlaubnis. iOS/iPadOS: zuerst `prompt` (das Kärtchen lädt
 * zum Tippen ein, #215), nach dem Tipp `pending`, bis die Antwort da ist.
 * Andere Systeme brauchen keine Frage (`granted`).
 */
export type DeviceTiltPermission = 'prompt' | 'pending' | 'granted' | 'denied'

/** Start-Zustand: Gibt es `DeviceOrientationEvent.requestPermission`, muss erst getippt werden. */
export function initialDeviceTiltPermission(hasRequestPermission: boolean): DeviceTiltPermission {
  return hasRequestPermission ? 'prompt' : 'granted'
}

export interface DeviceTiltHintState {
  view: DeviceTiltView
  /** Darf der Abstands-Hinweis schon erscheinen? */
  distanceAllowed: boolean
  /** Zeitpunkt des ersten Schritts mit Erlaubnis; davor läuft keine Sensor-Uhr. */
  startedAt: number | null
  /** Seit wann die Einladung zum Tippen steht (#215); für die 5-s-Frist zum Abstand. */
  askedAt: number | null
  /** Stand das Gerät beim letzten Schritt gerade? (für die Hysterese) */
  level: boolean
  /** Einmal erledigt (kein Sensor, abgelehnt, eingefroren), bleibt das Kärtchen weg. */
  done: boolean
  /** Warum erledigt bzw. pausiert (`stale`, fürs Diagnose-Log); `null`, solange das Kärtchen läuft. */
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
    askedAt: null,
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
  if (permission === 'prompt') {
    // Nie blockieren: ignoriert man die Einladung, kommt der Abstand trotzdem.
    const askedAt = state.askedAt ?? nowMs
    const distanceAllowed = state.distanceAllowed || nowMs - askedAt >= TILT_DISTANCE_AFTER_MS
    return { ...state, view: 'ask', askedAt, distanceAllowed }
  }
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

  if (!next.live) {
    // #215: nie ein abweichender Wert (z. B. nur ein einzelner) → vorerst wie kein Sensor.
    if (nowMs - lastChangeAt >= TILT_STALE_MS) {
      return { ...next, view: 'hidden', distanceAllowed: true, doneReason: 'stale' }
    }
    // Erst ein sich ändernder Wert zeigt, dass der Sensor lebt: vorher kein „schief“.
    return { ...next, view: 'hidden' }
  }

  const isLevel = state.level ? tilt <= TILT_LEVEL_EXIT_DEG : tilt <= TILT_LEVEL_ENTER_DEG

  return {
    ...next,
    view: isLevel ? 'level' : 'tilted',
    distanceAllowed: state.distanceAllowed || isLevel || elapsed >= TILT_DISTANCE_AFTER_MS,
    level: isLevel,
    doneReason: null,
  }
}
