import type { Landmark, WristMasterPrint } from '../types'
import { selectAnalysisPath, type AnalysisPath } from './analysis-path'
import {
  computeArmLength2D,
  computeCollinearityAngle2D,
  computeCorrectedKnick,
  computeMCP,
  computeSignedKnick2D,
} from './wrist-analyzer'

// Höchster Sprung im ersten Frame nach einem Pfadwechsel Hand ↔ Pose.
const PATH_SWITCH_MAX_DELTA_DEG = 3
// EMA-Glättung (≈ 100 ms Zeitkonstante bei 30 fps).
const KNICK_EMA_ALPHA = 0.25

export interface KnickFrameInput {
  pose: Landmark[]
  world?: Landmark[]
  hand: Landmark[] | null
  aspect: number
  masterPrint: WristMasterPrint
}

export interface KnickFrameResult {
  path: AnalysisPath
  justSwitchedPath: boolean
  /** 2D-Unterarmlänge (mit aspect) — auch für die Foreshortening-Konfidenz. */
  armLength2D: number
  /** Geglättete Knick-Abweichung von der gespeicherten Haltung in Grad. */
  effectiveKnickDiff: number
}

/**
 * Knick-Abweichung von der gespeicherten Haltung für einen Frame, ungeglättet
 * (ADR 0003): 2D-Bildwinkel, korrigiert um die Verkürzung des Unterarms.
 * Nutzt **kein z** — geschätzte Tiefe rauscht und ließ den Anker im
 * Stillstand springen.
 */
export function measureKnickDeviation(input: KnickFrameInput, path: AnalysisPath): { knickDiff: number; armLength2D: number } {
  const { pose, world, hand, aspect, masterPrint } = input
  const elbow = pose[13]!
  const wrist = pose[15]!
  const armLength2D = computeArmLength2D(elbow, wrist, aspect)
  const calib = masterPrint.calibArmLength2D
  // Verkürzung gegenüber der Kalibrierung ≈ cos(Neigung aus der Bildebene)
  const forearmLengthRatio = calib > 0 ? armLength2D / calib : 1

  if (path === 'hand' && hand) {
    const signed2D = computeSignedKnick2D(elbow, hand[0]!, hand[9]!, aspect)
    const knick = computeCorrectedKnick(Math.abs(signed2D), forearmLengthRatio)
    // Seite (#91): Liegt der Knick auf der anderen Seite der Geraden als die
    // gespeicherte Haltung, addieren sich beide Beträge. Pose-Fallback bleibt
    // ohne Seite (grobe Punkte, Seite zu unsicher).
    const side = Math.sign(signed2D)
    const otherSide = side !== 0 && masterPrint.calibKnickSide !== 0 && side !== masterPrint.calibKnickSide
    const knickDiff = otherSide ? knick + masterPrint.calibKnick : Math.abs(knick - masterPrint.calibKnick)
    return { knickDiff, armLength2D }
  }

  // Pose-Fallback: worldLandmarks, sonst Bildkoordinaten — exakt wie die
  // Baseline in createMasterPrint (dort ebenfalls ohne aspect).
  const src = world ?? pose
  const angle2D = computeCollinearityAngle2D(src[13]!, src[15]!, computeMCP(src[17]!, src[19]!))
  const knick = computeCorrectedKnick(angle2D, forearmLengthRatio)
  return { knickDiff: Math.abs(knick - masterPrint.calibKnickFallback), armLength2D }
}

/**
 * Factory: Knick-Verlauf über Frames — Pfadwahl, Messung, Sprungbegrenzung
 * beim Pfadwechsel und EMA-Glättung. Keine „nur-steigen"-Sperre: schlechte
 * Sicht soll grau zeigen (#74), nicht Gelb festhalten.
 */
export function createKnickTracker() {
  let ema = 0
  let prevPath: AnalysisPath | null = null

  function update(input: KnickFrameInput): KnickFrameResult {
    const path = selectAnalysisPath(input.hand)
    const justSwitchedPath = prevPath !== null && prevPath !== path
    prevPath = path

    const { knickDiff, armLength2D } = measureKnickDeviation(input, path)
    // Erster Frame nach Pfadwechsel: Sprung begrenzen, damit die Glättung
    // stetig bleibt, wenn beide Pfade leicht verschieden messen.
    const clamped = justSwitchedPath
      ? Math.max(ema - PATH_SWITCH_MAX_DELTA_DEG, Math.min(ema + PATH_SWITCH_MAX_DELTA_DEG, knickDiff))
      : knickDiff
    ema = ema * (1 - KNICK_EMA_ALPHA) + clamped * KNICK_EMA_ALPHA

    return { path, justSwitchedPath, armLength2D, effectiveKnickDiff: ema }
  }

  function reset() {
    ema = 0
    prevPath = null
  }

  return { update, reset }
}
