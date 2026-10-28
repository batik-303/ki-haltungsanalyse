import type { MasterPrint, WristMasterPrint } from '../types'
import { SIDE_TO_SCREEN } from '../analysis/wrist-bar'

// Ab diesem gespeicherten Knick (Grad, Hand-Pfad) kommt der Tipp, je Richtung.
// Zur Schnecke streng (#97); zum Hals ist ein leichter Knick erlaubt —
// Messung der Nutzerin: gerade 0–7°, leicht zum Hals 15–22°, zu viel ≈ 35°.
const STRAIGHT_WRIST_TIP_SCROLL_MIN_DEG = 10
const STRAIGHT_WRIST_TIP_NECK_MIN_DEG = 28
// So lange steht der Tipp nach dem Speichern am Rand, dann geht er von selbst.
export const STRAIGHT_WRIST_TIP_DURATION_MS = 8000

const STRAIGHT_WRIST_TIP =
  'Tipp: Halte dein Handgelenk beim Speichern möglichst gerade, dann misst die App genauer. Sag „neu“ oder geh über das Hauptmenü und speichere neu.'

export interface StraightWristTipInput {
  masterPrint: MasterPrint | null
  calibratedAt: number | null
  now: number
}

/**
 * Freundlicher Tipp nach dem Speichern einer deutlich geknickten Haltung (#101),
 * mit eigener Grenze je Richtung (Hals großzügiger als Schnecke).
 * Gemessen wird die Abweichung von der gespeicherten Haltung — schief
 * gespeichert reagiert eine Seite träger. Nur Hinweis, die Analyse läuft weiter
 * (kein Modal); `null` = nichts zeigen.
 */
export function computeStraightWristTip(input: StraightWristTipInput): string | null {
  const mp = freshWristPrint(input)
  if (!mp) return null
  const minDeg = isTowardNeck(mp) ? STRAIGHT_WRIST_TIP_NECK_MIN_DEG : STRAIGHT_WRIST_TIP_SCROLL_MIN_DEG
  if (mp.calibKnick <= minDeg) return null
  return STRAIGHT_WRIST_TIP
}

/**
 * Gespeicherte Gradzahl für die Entwickler-Ansicht (#101): bei jedem Speichern
 * kurz sichtbar — auch unter der Grenze —, mit Richtung (Hals/Schnecke
 * verschieden streng), um die Grenzen zu prüfen.
 */
export function computeSavedKnickLabel(input: StraightWristTipInput): string | null {
  const mp = freshWristPrint(input)
  if (!mp) return null
  const deg = `gespeichert: ${mp.calibKnick.toFixed(1).replace('.', ',')}°`
  if (mp.calibKnickSide === 0) return deg
  return `${deg} · ${isTowardNeck(mp) ? 'links' : 'rechts'}`
}

/**
 * Knick zum Hals? Hals = links auf dem (gespiegelten) Bildschirm — dieselbe
 * Zuordnung wie die Hand in der Leiste (#94), von der Nutzerin bestätigt.
 */
function isTowardNeck(mp: WristMasterPrint): boolean {
  return mp.calibKnickSide * SIDE_TO_SCREEN < 0
}

/** Handgelenk-Kalibrierung, aber nur in den ersten Sekunden nach dem Speichern. */
function freshWristPrint({ masterPrint: mp, calibratedAt, now }: StraightWristTipInput): WristMasterPrint | null {
  if (calibratedAt === null || now - calibratedAt >= STRAIGHT_WRIST_TIP_DURATION_MS) return null
  if (!mp || mp.mode !== 'wrist') return null
  return mp
}
