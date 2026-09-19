/**
 * Gestuftes Bereitschafts-Tor vor dem Kalibrier-Countdown (Ticket #36).
 *
 * Statt eines Sofort-Countdowns (der beim Griff zum Bildschirm die Haltung
 * verschiebt und einen falschen Master-Print speichert) prüft dieses Tor
 * **die Haltung** und nicht *wer ausgelöst hat* — eine Mechanik deckt alle
 * Auslöser ab (Stimme, eigener Klick, Eltern/Lehrer).
 *
 * Ablauf: positioning → (Distanz ok) → posture → (Spielhaltung kurz gehalten)
 * → holding → armed (→ Countdown auslösen).
 *
 * Bewusste V1-Grenze: **keine echte Geigen-Erkennung**. MediaPipe Pose sieht
 * nur den Körper, keine Objekte. Als Ersatz dient die **Spielhaltung**: der
 * angehobene Unterarm (`computeWristAxisOk`) entsteht praktisch nur mit
 * Instrument oben und ist damit ein guter Indikator. Reine, testbare Logik —
 * kein React, kein DOM.
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

// ── Bereitschafts-Zustandsmaschine ──────────────────────────────────

export type ReadinessPhase = 'positioning' | 'posture' | 'holding' | 'armed'

export interface ReadinessInput {
  /** Distanz zur Kamera passt (Store-`distanceOk`). */
  distanceOk: boolean
  /** Spielhaltung erkannt (`computeWristAxisOk(...).ok`). */
  wristAxisOk: boolean
  /** Vergangene Zeit seit dem letzten Frame in Millisekunden. */
  dtMs: number
}

export interface ReadinessState {
  phase: ReadinessPhase
  /** Bisher gehaltene Zeit in Spielhaltung (ms). */
  holdMs: number
  /** Fortschritt zur nötigen Haltezeit, 0..1. */
  holdProgress: number
  /** Nur auf der Frame true, in der das Tor scharf wird (Kante). */
  justArmed: boolean
  /** Bereitschaft dauert ungewöhnlich lange — nur Hinweis, **kein** Sperren. */
  timedOut: boolean
}

export interface ReadinessGateOptions {
  /** Nötige Haltezeit der Spielhaltung, bis der Countdown startet (~1 s). */
  holdDurationMs?: number
  /** Zeit in Bereitschaft ohne Scharfschaltung, ab der `timedOut` meldet. */
  timeoutMs?: number
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

export interface ReadinessGate {
  update(input: ReadinessInput): ReadinessState
  reset(): void
  state(): ReadinessState
}

/**
 * Factory mit Closure-Zustand (Projektmuster: als `useRef` im Hook halten,
 * nie in Zustand/Store). `armed` ist verriegelt bis `reset()`, damit ein
 * kurzes Wackeln während des Countdowns die Scharfschaltung nicht aufhebt.
 */
export function createReadinessGate(options: ReadinessGateOptions = {}): ReadinessGate {
  const holdDurationMs = options.holdDurationMs ?? 1000
  const timeoutMs = options.timeoutMs ?? 20000

  let phase: ReadinessPhase = 'positioning'
  let holdMs = 0
  let sinceReadyMs = 0
  let armed = false
  let justArmed = false

  function snapshot(): ReadinessState {
    return {
      phase,
      holdMs,
      holdProgress: clamp01(holdMs / holdDurationMs),
      justArmed,
      timedOut: !armed && sinceReadyMs >= timeoutMs,
    }
  }

  function reset(): void {
    phase = 'positioning'
    holdMs = 0
    sinceReadyMs = 0
    armed = false
    justArmed = false
  }

  function update(input: ReadinessInput): ReadinessState {
    // Verriegelt: einmal scharf, bleibt scharf bis reset().
    if (armed) {
      justArmed = false
      return snapshot()
    }

    if (!input.distanceOk) {
      phase = 'positioning'
      holdMs = 0
      sinceReadyMs = 0
      justArmed = false
      return snapshot()
    }

    sinceReadyMs += input.dtMs

    if (input.wristAxisOk) {
      holdMs += input.dtMs
      if (holdMs >= holdDurationMs) {
        armed = true
        justArmed = true
        phase = 'armed'
      } else {
        phase = 'holding'
      }
    } else {
      // Haltung verloren → Haltezeit zurücksetzen (kurz halten, kein Zufall).
      holdMs = 0
      phase = 'posture'
    }

    return snapshot()
  }

  return { update, reset, state: snapshot }
}

// ── Ansichtsmodell für das Canvas-Rand-Feedback ─────────────────────

export interface ReadinessView {
  hint: string
  tone: CalibrationTone
  /** Ring-/Balken-Füllung 0..1 (Haltezeit-Fortschritt). */
  progress: number
}

/**
 * Bildet den Bereitschafts-Zustand auf ein Ansichtsmodell ab. Ehrliche Sprache
 * („Spielhaltung", nie „Geige erkannt") und positive, ermutigende Töne — kein
 * Rot, im Einklang mit der Feedback-Philosophie.
 *
 * Bei `timedOut` (die Spielhaltung wird ungewöhnlich lange nicht erreicht) lenkt
 * der Hinweis sanft auf den manuellen „Kalibrieren"-Rückfall — kein Druck, kein
 * Einsperren, nur ein freundlicher Ausweg.
 */
export function computeReadinessView(
  state: Pick<ReadinessState, 'phase' | 'holdProgress' | 'timedOut'>,
): ReadinessView {
  switch (state.phase) {
    case 'positioning':
      return {
        hint: 'Stell dich mittig vor die Kamera',
        tone: 'sapphire',
        progress: 0,
      }
    case 'posture':
      return {
        hint: state.timedOut
          ? 'Klappt nicht? Tippe unten auf „Kalibrieren“'
          : 'Jetzt halte dein Instrument in Spielhaltung',
        tone: 'sapphire',
        progress: 0,
      }
    case 'holding':
      return {
        hint: 'Super — kurz so halten',
        tone: 'sapphire',
        progress: clamp01(state.holdProgress),
      }
    case 'armed':
      return {
        hint: 'Los geht’s',
        tone: 'success',
        progress: 1,
      }
  }
}
