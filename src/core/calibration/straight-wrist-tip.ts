import type { MasterPrint, WristMasterPrint } from '../types'
import { isKnickTowardNeck } from '../analysis/wrist-bar'
import { CALIB_STRAIGHT_SNAP_DEG, knickSideOf } from './master-print'

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
 * Freundlicher Tipp nach dem Speichern einer deutlich geknickten Haltung (#101).
 * Grenze = Gerade-Fang (#189): darunter gilt die Haltung als gerade, ab dort
 * kommt der Tipp, zum Hals und zur Schnecke gleich.
 * Gemessen wird die Abweichung von der gespeicherten Haltung — schief
 * gespeichert reagiert eine Seite träger. Nur Hinweis, die Analyse läuft weiter
 * (kein Modal); `null` = nichts zeigen.
 */
export function computeStraightWristTip(input: StraightWristTipInput): string | null {
  const mp = freshWristPrint(input)
  if (!mp) return null
  if (mp.calibKnick < CALIB_STRAIGHT_SNAP_DEG) return null
  return STRAIGHT_WRIST_TIP
}

/**
 * Gespeicherte Gradzahl für die Entwickler-Ansicht (#101): bei jedem Speichern
 * kurz sichtbar, der gemessene Wert mit Richtung wie auf dem (gespiegelten)
 * Bildschirm (Hals = links, #94) und „→ 0°“, wenn der Gerade-Fang griff (#189).
 */
export function computeSavedKnickLabel(input: StraightWristTipInput): string | null {
  const mp = freshWristPrint(input)
  if (!mp) return null
  const measured = mp.calibKnickMeasured
  const side = knickSideOf(measured)
  const deg = `gespeichert: ${Math.abs(measured).toFixed(1).replace('.', ',')}°`
  const direction = side === 0 ? '' : ` · ${isKnickTowardNeck(side) ? 'links' : 'rechts'}`
  const snapped = mp.calibKnick < CALIB_STRAIGHT_SNAP_DEG ? ' → 0°' : ''
  return `${deg}${direction}${snapped}`
}

/** Handgelenk-Kalibrierung, aber nur in den ersten Sekunden nach dem Speichern. */
function freshWristPrint({ masterPrint: mp, calibratedAt, now }: StraightWristTipInput): WristMasterPrint | null {
  if (calibratedAt === null || now - calibratedAt >= STRAIGHT_WRIST_TIP_DURATION_MS) return null
  if (!mp || mp.mode !== 'wrist') return null
  return mp
}
