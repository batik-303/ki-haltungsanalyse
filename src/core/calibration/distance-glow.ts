/**
 * Reine Ton-Wahl für die ambiente Distanz-Rand-Führung („Randglühen", T4 #60,
 * Karte #56, Variante A aus T1 #57; Farben und Stärke neu in #115).
 *
 * Gleiche Farb-Regel wie beim Anker (#104, Entscheidung 7): passt der Abstand
 * noch nicht, **führt** Gelb („hinsehen"); passt er, bestätigt Blau. Kein Grün,
 * nie Rot. React/DOM-frei — die Komponente setzt nur den fertigen Schatten.
 */

import type { AnchorColor } from '../types'

/** Nur die beiden geführten Töne — nie ein Fehler-/Rot-Ton. */
export type DistanceGlowTone = Extract<AnchorColor, 'blue' | 'yellow'>

/** Dieselben Farben wie Anker und Leiste im Bild (`wrist-side-view.ts`). */
export const DISTANCE_GLOW_COLORS: Record<DistanceGlowTone, string> = {
  blue: '#2196F3',
  yellow: '#F5C842',
}

/**
 * Deckkraft der beiden Schatten-Schichten (0–1). Etwa doppelt so deutlich wie
 * in T4 (≈ 27 % / 18 %), weil das Glühen kaum bemerkt wurde (#104, Entscheidung 8).
 * Beim Geräte-Test feinstellen.
 */
export const DISTANCE_GLOW_OUTER_ALPHA = 0.54
export const DISTANCE_GLOW_INNER_ALPHA = 0.36

/** Gelb führt, solange der Abstand nicht passt; Blau bestätigt „passt". */
export function computeDistanceGlowTone(distanceOk: boolean): DistanceGlowTone {
  return distanceOk ? 'blue' : 'yellow'
}

function alphaHex(alpha: number): string {
  return Math.round(alpha * 255).toString(16).padStart(2, '0')
}

/**
 * Zwei geschichtete Inset-Schatten: ein weicher, breiter Rand-Schein plus eine
 * innere Kontur — beide in der Glühfarbe.
 */
export function computeDistanceGlowShadow(tone: DistanceGlowTone): string {
  const color = DISTANCE_GLOW_COLORS[tone]
  return `inset 0 0 140px 28px ${color}${alphaHex(DISTANCE_GLOW_OUTER_ALPHA)}, inset 0 0 48px 6px ${color}${alphaHex(DISTANCE_GLOW_INNER_ALPHA)}`
}
