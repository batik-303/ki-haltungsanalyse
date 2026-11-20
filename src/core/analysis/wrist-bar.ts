import type { AnchorColor, KnickSide } from '../types'

export interface WristBarInput {
  /** Ein Zustand der Anker-Farbe: blau = gespeicherte Haltung, grau = keine sichere Sicht (#92). */
  color: AnchorColor
  /** Geglättete Knick-Abweichung von der gespeicherten Haltung in Grad. */
  knickDiff: number
  /** Seite der Abweichung aus dem Knick-Tracker, 0 = unbekannt. */
  knickSide: KnickSide
  nowMs: number
}

export interface WristBarState {
  /** Kippwinkel der Hand, wie die Nutzerin den Bildschirm sieht: negativ = links. */
  tiltDeg: number
  /** Einmaliges Leuchten des Ankers nach einer Korrektur (1 → 0), sonst 0. */
  anchorGlow: number
}

// Anzeige leicht übertrieben, damit kleine Knicke lesbar sind (#76).
const TILT_AMPLIFY = 1.5
export const TILT_MAX_DEG = 40
// Sanftes Kippen: Zeitkonstante der Glättung (ms statt Frames).
const TILT_SMOOTH_TAU_MS = 150
// Darunter gilt die Hand im Blau als gerade angekommen (#188).
const TILT_STRAIGHT_DEG = 0.5
// Anzeige-Totzone im Blau: Knick darunter zählt als gerade, damit die Hand
// bei Messrauschen nicht dauerhaft leicht schief steht (#188).
const TILT_BLUE_STRAIGHT_KNICK_DEG = 3
// Seite +1 dreht im ungespiegelten Kamerabild im Uhrzeigersinn; der
// CSS-Spiegel macht daraus gegen den Uhrzeigersinn → Hand kippt nach links.
export const SIDE_TO_SCREEN = -1

/**
 * Knick zum Hals? Hals = links auf dem (gespiegelten) Bildschirm — dieselbe
 * Zuordnung wie die Hand in der Leiste (#94). Seite 0 (unbekannt) zählt
 * nicht als Hals, damit dort die strengere Grenze gilt.
 */
export function isKnickTowardNeck(side: KnickSide): boolean {
  return side * SIDE_TO_SCREEN < 0
}
// Ruhige Richtung: die Seite wechselt erst, wenn die andere Seite so lange
// ohne Unterbrechung anhält. Kürzer als die 0,5 s bis Gelb, damit die Hand
// beim Gelbwerden schon zur richtigen Seite zeigt.
const SIDE_SWITCH_MS = 300
// Belohnung bei Korrektur: nur der Anker leuchtet einmal, wie der Anker im Bild.
const REWARD_GLOW_MS = 800

/**
 * Factory: Zustand der peripheren Leiste (#76) — Kippwinkel der Hand am Anker.
 */
export function createWristBarTilt() {
  let tilt = 0
  let side: KnickSide = 0
  let otherSideMs = 0
  let prevNowMs: number | null = null
  let prevColor: AnchorColor | null = null
  let rewardAtMs: number | null = null

  function update(input: WristBarInput): WristBarState {
    const dtMs = prevNowMs === null ? 0 : Math.max(0, input.nowMs - prevNowMs)
    prevNowMs = input.nowMs

    side = updateSide(input.knickSide, dtMs)
    const screenDir = (side === 0 ? 1 : side) * SIDE_TO_SCREEN

    // Belohnung nur bei gelb → blau; grau → blau ist keine Korrektur, nur wieder Sicht.
    if (prevColor === 'yellow' && input.color === 'blue') rewardAtMs = input.nowMs
    prevColor = input.color
    const anchorGlow = rewardGlow(input.nowMs)

    if (input.color === 'grey') {
      // Grau = keine sichere Sicht → keine Richtung, Hand steht sofort gerade.
      tilt = 0
      return { tiltDeg: 0, anchorGlow }
    }
    const shown = Math.min(TILT_MAX_DEG, input.knickDiff * TILT_AMPLIFY)
    // Gelb: vorzeichenbehaftet geglättet, ein Seitenwechsel schwenkt hinüber.
    // Blau (#188): Die Hand folgt dem Handgelenk weiter, bis es gerade ist,
    // aber nur abnehmend (Ratsche) – kein Wackeln bei Vibrato/Lagenwechsel.
    const blueShown = input.knickDiff < TILT_BLUE_STRAIGHT_KNICK_DEG ? 0 : shown
    const target =
      input.color === 'blue' ? Math.sign(tilt) * Math.min(Math.abs(tilt), blueShown) : screenDir * shown
    tilt += (target - tilt) * (1 - Math.exp(-dtMs / TILT_SMOOTH_TAU_MS))
    // Im Blau angekommen: Hand steht bis zum nächsten Gelb still auf gerade.
    if (input.color === 'blue' && Math.abs(tilt) < TILT_STRAIGHT_DEG) tilt = 0
    return { tiltDeg: tilt, anchorGlow }
  }

  function rewardGlow(nowMs: number): number {
    if (rewardAtMs === null) return 0
    const age = nowMs - rewardAtMs
    if (age >= REWARD_GLOW_MS) {
      rewardAtMs = null
      return 0
    }
    return 1 - age / REWARD_GLOW_MS
  }

  /** Seite mit Haltezeit: 0 (unbekannt) zählt nicht und unterbricht nicht. */
  function updateSide(measured: KnickSide, dtMs: number): KnickSide {
    if (measured === 0) return side
    if (side === 0 || measured === side) {
      otherSideMs = 0
      return measured
    }
    otherSideMs += dtMs
    if (otherSideMs < SIDE_SWITCH_MS) return side
    otherSideMs = 0
    return measured
  }

  function reset() {
    tilt = 0
    side = 0
    otherSideMs = 0
    prevNowMs = null
    prevColor = null
    rewardAtMs = null
  }

  return { update, reset }
}
