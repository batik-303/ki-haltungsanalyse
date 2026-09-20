/**
 * Reine Ton-Wahl für die ambiente Distanz-Rand-Führung („Randglühen", T4 #60,
 * Karte #56, Variante A aus T1 #57).
 *
 * Ersetzt die frühere grüne „✓ Abstand OK"-Pille durch ein ruhiges
 * Bildrand-Leuchten. Grundsatz „kein Rot": passt der Abstand noch nicht,
 * **führt** Sapphire ruhig (kein Fehler-Rot); passt er, bestätigt Grün leise.
 * React/DOM-frei — die Komponente übersetzt den Ton in die konkrete Glut-Farbe.
 */

import type { CalibrationTone } from './overlay-view'

/** Nur die beiden geführten Töne — nie ein Fehler-/Rot-Ton. */
export type DistanceGlowTone = Extract<CalibrationTone, 'sapphire' | 'success'>

/** Sapphire führt, solange der Abstand nicht passt; Grün bestätigt „passt". */
export function computeDistanceGlowTone(distanceOk: boolean): DistanceGlowTone {
  return distanceOk ? 'success' : 'sapphire'
}
