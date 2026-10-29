import { computeDistanceGuidance, type PositioningStatus } from './distance-guidance'
import type { DistanceGlowTone } from './distance-glow'

/**
 * Ruhiges, begleitetes Speichern der Haltung (#118, Entscheidungen aus #116).
 *
 * Nach „speichern“/Tippen läuft nicht sofort 3 – 2 – 1, sondern:
 *   reading  – Lesezeit, in der nichts passiert (das Kärtchen lesen können)
 *   settling – warten, bis das Handgelenk eine Weile ruhig ist; Sicherheitsnetz:
 *              nach einer Höchstzeit wird trotzdem gezählt
 *   counting – 3 – 2 – 1; nur hier wird der Knick für die Vorlage gesammelt
 *   done     – die Erfassung wurde genau einmal ausgelöst (`capture`)
 * Passt der Abstand unterwegs nicht mehr, wird ruhig pausiert (`paused`, gelb,
 * mit Richtung). Passt er wieder, geht es mit „Halte still“ weiter — kein
 * Neustart, keine Lesezeit mehr, die Zahl beginnt wieder bei 3.
 *
 * Reine Zustandsmaschine (Factory mit Closure), Bild für Bild aus dem rAF-Loop
 * gefüttert. Die Zeiten sind Startwerte — beim Geigen-Test feinstellen.
 */

/** Lesezeit nach dem Auslösen (ms). */
export const SAVE_READ_MS = 2000
/** So lange muss das Handgelenk ruhig sein, bevor gezählt wird (ms). */
export const SAVE_STILL_MS = 1000
/** Sicherheitsnetz: nach so langer Wartezeit ohne Ruhe trotzdem zählen (ms). */
export const SAVE_SETTLE_TIMEOUT_MS = 5000
/** Länge von 3 – 2 – 1 (Sekunden). */
export const SAVE_COUNT_SECONDS = 3
/**
 * Ruhe-Schwelle: wandert das Handgelenk weiter als dieser Anteil der
 * Schulterbreite vom Bezugspunkt weg, beginnt die Ruhe von vorn. Über die
 * Schulterbreite gemessen, damit es auf allen Geräten und Abständen gleich wirkt.
 */
export const SAVE_STILL_RADIUS = 0.1
/** Toleranz gegen Hin-und-her-Springen: so lange darf der Abstand kurz nicht passen (ms). */
export const SAVE_PAUSE_GRACE_MS = 300
/** So lange muss der Abstand wieder passen, bevor es nach der Pause weitergeht (ms). */
export const SAVE_RESUME_MS = 500

export type SaveStep = 'reading' | 'settling' | 'counting' | 'paused' | 'done'

/** Richtung, warum pausiert wird — die Fälle, in denen der Abstand nicht passt. */
export type SavePauseStatus = Exclude<PositioningStatus, 'good' | 'drifted'>

export interface SaveSequenceInput {
  dtMs: number
  distanceStatus: PositioningStatus
  /** Handgelenk im Bild (normiert 0–1), `null` wenn nicht sichtbar. */
  wrist: { x: number; y: number } | null
  /** Bildbreite / Bildhöhe — damit x und y in derselben Einheit gemessen werden. */
  aspect: number
  /** Schulterbreite (normiert auf die Bildbreite) als Maßstab für die Ruhe. */
  shoulderWidth: number
}

export interface SaveSequenceState {
  step: SaveStep
  /** 3 / 2 / 1 während `counting`, sonst `null`. */
  count: number | null
  pauseStatus: SavePauseStatus | null
  /** Ob dieses Bild in den Knick-Mittelwert der Vorlage eingeht. */
  sampling: boolean
  /** Kante: genau in diesem Bild die Haltung erfassen. */
  capture: boolean
}

export function createSaveSequence() {
  let step: SaveStep = 'reading'
  let stepMs = 0
  let countMs = 0
  let stillMs = 0
  let stillRef: { x: number; y: number } | null = null
  let offMs = 0
  let onMs = 0
  let pauseStatus: SavePauseStatus | null = null
  let capture = false

  function reset() {
    step = 'reading'
    stepMs = 0
    countMs = 0
    stillMs = 0
    stillRef = null
    offMs = 0
    onMs = 0
    pauseStatus = null
    capture = false
  }

  function state(): SaveSequenceState {
    return {
      step,
      count: step === 'counting' ? Math.max(1, Math.ceil((SAVE_COUNT_SECONDS * 1000 - countMs) / 1000)) : null,
      pauseStatus: step === 'paused' ? pauseStatus : null,
      sampling: step === 'counting',
      capture,
    }
  }

  function enter(next: SaveStep) {
    step = next
    stepMs = 0
    countMs = 0
  }

  function trackStillness(input: SaveSequenceInput) {
    const { wrist, aspect, shoulderWidth, dtMs } = input
    if (!wrist || shoulderWidth <= 0) {
      stillRef = null
      stillMs = 0
      return
    }
    if (!stillRef) {
      stillRef = wrist
      stillMs = 0
      return
    }
    // y in Bildbreiten-Einheiten umrechnen, damit die Schwelle rund ist.
    const moved = Math.hypot(wrist.x - stillRef.x, (wrist.y - stillRef.y) / aspect) / shoulderWidth
    if (moved > SAVE_STILL_RADIUS) {
      stillRef = wrist
      stillMs = 0
    } else {
      stillMs += dtMs
    }
  }

  function update(input: SaveSequenceInput): SaveSequenceState {
    capture = false
    if (step === 'done') return state()

    const distanceGood = input.distanceStatus === 'good'
    trackStillness(input)

    if (step === 'paused') {
      if (distanceGood) {
        onMs += input.dtMs
        if (onMs >= SAVE_RESUME_MS) {
          // Die Ruhe läuft während der Pause weiter: wer schon stillhält,
          // muss danach nicht noch einmal warten.
          offMs = 0
          onMs = 0
          enter('settling')
        }
      } else {
        onMs = 0
        pauseStatus = input.distanceStatus as SavePauseStatus
      }
      return state()
    }

    if (!distanceGood) {
      offMs += input.dtMs
      if (offMs >= SAVE_PAUSE_GRACE_MS) {
        pauseStatus = input.distanceStatus as SavePauseStatus
        onMs = 0
        enter('paused')
        return state()
      }
    } else {
      offMs = 0
    }

    stepMs += input.dtMs
    if (step === 'reading') {
      if (stepMs >= SAVE_READ_MS) enter('settling')
    }
    if (step === 'settling') {
      if (stillMs >= SAVE_STILL_MS || stepMs >= SAVE_SETTLE_TIMEOUT_MS) enter('counting')
    } else if (step === 'counting') {
      countMs += input.dtMs
      if (countMs >= SAVE_COUNT_SECONDS * 1000) {
        enter('done')
        capture = true
      }
    }
    return state()
  }

  return { update, reset, state }
}

export interface SaveSequenceView {
  message: string
  detail: string
  tone: DistanceGlowTone
  /** Zahl groß in der Mitte — nur beim Zählen, sonst `null` (kein Text dort). */
  glyph: string | null
}

/** Kärtchen-Text, Farbe und Zahl für den aktuellen Schritt (Prototyp-Variante B). */
export function computeSaveSequenceView(s: Pick<SaveSequenceState, 'step' | 'count' | 'pauseStatus'>): SaveSequenceView {
  if (s.step === 'paused') {
    const guidance = computeDistanceGuidance(s.pauseStatus ?? 'no-body')
    return { message: guidance.message, detail: '', tone: 'yellow', glyph: null }
  }
  if (s.step === 'reading' || s.step === 'settling') {
    return { message: 'Halte still', detail: 'gleich wird gespeichert', tone: 'blue', glyph: null }
  }
  return {
    message: 'Halte still',
    detail: 'wird gespeichert …',
    tone: 'blue',
    glyph: s.step === 'counting' && s.count !== null ? String(s.count) : null,
  }
}
