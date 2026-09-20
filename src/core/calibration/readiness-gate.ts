/**
 * Kalibrier-Auslöser: Distanz-Gate mit Auto-Start (Ticket #59, Karte #56).
 *
 * Kein Auto-Arm: der Countdown startet **nur auf bewussten Auslöser**
 * (`requestArm()` — aus Stimme „bereit" / Knopf „Haltung speichern"). Das Tor
 * ist ein Distanz-Gate: löst man bei nicht passendem Abstand aus, **wartet** es
 * (sanfte Führung) und feuert **automatisch**, sobald der Abstand passt — kein
 * erneutes Drücken.
 *
 * Ablauf: idle → (requestArm) → waiting → (distanceOk) → armed (→ Countdown).
 *
 * Die **Spielhaltung** (`computeWristAxisOk`) prüft nicht mehr dieses Tor,
 * sondern der **Erfassungsmoment** (Snapshot bei 0, siehe `use-calibration`):
 * sitzt sie dort nicht, wird nichts gespeichert und es lädt sanft neu ein
 * (weiche Erfassung). Bewusste V1-Grenze: **keine echte Geigen-Erkennung** —
 * MediaPipe Pose sieht nur den Körper; der angehobene Unterarm ist der Ersatz.
 * Reine, testbare Logik — kein React, kein DOM.
 */

import type { Landmark } from '../types'
import type { CalibrationTone } from './overlay-view'

// ── Achsen-Check (Ersatz für Geigen-Erkennung) ──────────────────────

/**
 * Weiche, kinderfreundliche Schwelle für die Unterarm-Elevation (Grad über der
 * Waagerechten, positiv = Handgelenk über dem Ellbogen). Absichtlich niedrig:
 * Frust-Vermeidung vor Präzision. Später justierbar.
 */
export const WRIST_AXIS_MIN_ELEVATION_DEG = 15

/** Mindest-Sichtbarkeit für Ellbogen und Handgelenk, damit die Achse zählt. */
export const WRIST_AXIS_MIN_VISIBILITY = 0.5

export interface WristAxisResult {
  /** Bereit: Arm sichtbar **und** ausreichend angehoben. */
  ok: boolean
  /** Elevation des Unterarms über der Waagerechten in Grad (Handgelenk über Ellbogen = positiv). */
  elevationDeg: number
  /** Ob Ellbogen und Handgelenk sichtbar genug für eine Aussage sind. */
  visible: boolean
}

/**
 * Prüft aus vorhandenen Pose-Landmarks, ob der linke Unterarm in Spielhaltung
 * angehoben ist. `aspect` (Breite/Höhe) macht die Horizontale isotrop, damit
 * derselbe physische Winkel unabhängig vom Canvas-Format gemessen wird.
 */
export function computeWristAxisOk(
  elbow: Landmark,
  wrist: Landmark,
  aspect = 1,
): WristAxisResult {
  const visible =
    elbow.visibility >= WRIST_AXIS_MIN_VISIBILITY &&
    wrist.visibility >= WRIST_AXIS_MIN_VISIBILITY

  const dx = (wrist.x - elbow.x) * aspect
  // Bildkoordinaten: y wächst nach unten → Anhebung = negatives dy.
  const rise = elbow.y - wrist.y
  const elevationDeg = (Math.atan2(rise, Math.abs(dx)) * 180) / Math.PI

  const ok = visible && elevationDeg >= WRIST_AXIS_MIN_ELEVATION_DEG
  return { ok, elevationDeg, visible }
}

// ── Auslöse-Zustandsmaschine (Distanz-Gate mit Auto-Start) ──────────

/**
 * Phasen des Kalibrier-Auslösers (Ticket #59):
 * - `idle`: ruhig, kein bewusster Auslöser — nur die Distanz-Ampel führt.
 * - `waiting`: Auslöser kam, aber der Abstand passt noch nicht → sanfte Führung;
 *   der Countdown startet **automatisch**, sobald `distanceOk`.
 * - `armed`: scharf — der Countdown feuert (Kante `justArmed`) und bleibt bis
 *   `reset()` verriegelt.
 */
export type ReadinessPhase = 'idle' | 'waiting' | 'armed'

export interface ReadinessInput {
  /** Distanz zur Kamera passt (Store-`distanceOk`). */
  distanceOk: boolean
  /** Vergangene Zeit seit dem letzten Frame in Millisekunden. */
  dtMs: number
}

export interface ReadinessState {
  phase: ReadinessPhase
  /** Nur auf der Frame true, in der das Tor scharf wird (Kante → Countdown). */
  justArmed: boolean
  /** Warten auf den Abstand dauert ungewöhnlich lange — Hinweis, **kein** Sperren. */
  timedOut: boolean
}

export interface ReadinessGateOptions {
  /** Wartezeit auf den Abstand, ab der `timedOut` sanft auf den Knopf lenkt. */
  timeoutMs?: number
}

export interface ReadinessGate {
  /**
   * Bewusster Auslöser (Stimme „bereit" / Knopf „Haltung speichern", T4).
   * Latcht den Wunsch; `update` schaltet scharf, sobald der Abstand passt.
   * Einmal scharf, ist ein weiterer Aufruf wirkungslos (idempotent bis `reset`).
   */
  requestArm(): void
  update(input: ReadinessInput): ReadinessState
  reset(): void
  state(): ReadinessState
}

/**
 * Factory mit Closure-Zustand (Projektmuster: als `useRef` im Hook halten,
 * nie in Zustand/Store). Kein Auto-Arm: es passiert nichts ohne `requestArm()`.
 * `armed` ist verriegelt bis `reset()`, damit ein kurzes Wackeln des Abstands
 * während des Countdowns die Scharfschaltung nicht aufhebt.
 */
export function createReadinessGate(options: ReadinessGateOptions = {}): ReadinessGate {
  const timeoutMs = options.timeoutMs ?? 20000

  let phase: ReadinessPhase = 'idle'
  let armRequested = false
  let armed = false
  let justArmed = false
  let waitingMs = 0

  function snapshot(): ReadinessState {
    return {
      phase,
      justArmed,
      timedOut: phase === 'waiting' && waitingMs >= timeoutMs,
    }
  }

  function reset(): void {
    phase = 'idle'
    armRequested = false
    armed = false
    justArmed = false
    waitingMs = 0
  }

  function requestArm(): void {
    if (armed) return
    armRequested = true
  }

  function update(input: ReadinessInput): ReadinessState {
    // Verriegelt: einmal scharf, bleibt scharf bis reset().
    if (armed) {
      justArmed = false
      return snapshot()
    }

    // Ruhig, solange kein bewusster Auslöser kam.
    if (!armRequested) {
      phase = 'idle'
      justArmed = false
      waitingMs = 0
      return snapshot()
    }

    if (input.distanceOk) {
      // Abstand passt → Countdown feuert von selbst (kein erneutes Drücken).
      armed = true
      justArmed = true
      phase = 'armed'
      waitingMs = 0
    } else {
      // Auslöser kam, Abstand noch nicht → warten und sanft führen.
      phase = 'waiting'
      justArmed = false
      waitingMs += input.dtMs
    }

    return snapshot()
  }

  return { requestArm, update, reset, state: snapshot }
}

// ── Ansichtsmodell für das Distanz-/Bereitschafts-Feedback ──────────

export interface ReadinessView {
  hint: string
  tone: CalibrationTone
}

/**
 * Bildet die Auslöse-Phase auf ein Ansichtsmodell ab. Ehrliche Sprache (nie
 * „Geige erkannt" — Pose sieht keine Objekte) und positive, ermutigende Töne —
 * **kein Rot**, im Einklang mit der Feedback-Philosophie.
 *
 * Bei `timedOut` (der Abstand passt ungewöhnlich lange nicht) lenkt der Hinweis
 * sanft auf den Knopf „Haltung speichern" — kein Druck, kein Einsperren, nur ein
 * freundlicher Ausweg.
 */
export function computeReadinessView(
  state: Pick<ReadinessState, 'phase' | 'timedOut'>,
): ReadinessView {
  switch (state.phase) {
    case 'idle':
      return {
        hint: 'Sag „bereit“, wenn du so weit bist',
        tone: 'sapphire',
      }
    case 'waiting':
      return {
        hint: state.timedOut
          ? 'Klappt der Abstand nicht? Tippe auf „Haltung speichern“'
          : 'Rück dich in den guten Abstand — es startet dann von selbst',
        tone: 'sapphire',
      }
    case 'armed':
      return {
        hint: 'Los geht’s',
        tone: 'success',
      }
  }
}
