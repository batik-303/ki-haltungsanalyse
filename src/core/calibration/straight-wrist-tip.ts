import type { MasterPrint, WristMasterPrint } from '../types'

// Ab diesem gespeicherten Knick (Grad, Hand-Pfad) kommt der Tipp; darunter nie (#101, Grenze aus #97).
const STRAIGHT_WRIST_TIP_MIN_DEG = 10
// So lange steht der Tipp nach dem Speichern am Rand, dann geht er von selbst.
export const STRAIGHT_WRIST_TIP_DURATION_MS = 8000

const STRAIGHT_WRIST_TIP =
  'Tipp: Halte dein Handgelenk beim Speichern möglichst gerade, dann misst die App genauer. Sag „neu“, um neu zu speichern.'

export interface StraightWristTipInput {
  masterPrint: MasterPrint | null
  calibratedAt: number | null
  now: number
}

/**
 * Freundlicher Tipp nach dem Speichern einer deutlich geknickten Haltung (#101).
 * Gemessen wird die Abweichung von der gespeicherten Haltung — schief
 * gespeichert reagiert eine Seite träger. Nur Hinweis, die Analyse läuft weiter
 * (kein Modal); `null` = nichts zeigen.
 */
export function computeStraightWristTip(input: StraightWristTipInput): string | null {
  const mp = freshWristPrint(input)
  if (!mp || mp.calibKnick <= STRAIGHT_WRIST_TIP_MIN_DEG) return null
  return STRAIGHT_WRIST_TIP
}

/**
 * Gespeicherte Gradzahl für die Entwickler-Ansicht (#101): bei jedem Speichern
 * kurz sichtbar — auch unter der Grenze —, um die 10°-Grenze zu prüfen.
 */
export function computeSavedKnickLabel(input: StraightWristTipInput): string | null {
  const mp = freshWristPrint(input)
  if (!mp) return null
  return `gespeichert: ${mp.calibKnick.toFixed(1).replace('.', ',')}°`
}

/** Handgelenk-Kalibrierung, aber nur in den ersten Sekunden nach dem Speichern. */
function freshWristPrint({ masterPrint: mp, calibratedAt, now }: StraightWristTipInput): WristMasterPrint | null {
  if (calibratedAt === null || now - calibratedAt >= STRAIGHT_WRIST_TIP_DURATION_MS) return null
  if (!mp || mp.mode !== 'wrist') return null
  return mp
}
