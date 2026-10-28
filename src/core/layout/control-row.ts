import type { ViewMode } from '../types'

// ─────────────────────────────────────────────────────────────
//  KNOPF-ZEILE UNTER DEM RAHMEN (#114, Entscheidung 4 aus #104)
// ─────────────────────────────────────────────────────────────
//  Feste Plätze [🎤] [Hauptknopf] [Ansicht], auf allen Geräten gleich —
//  im Flow an derselben Stelle, nur farblos. Das Mikro bleibt immer
//  sichtbar, damit nichts verrutscht und man sieht, ob die Sprache zuhört.
// ─────────────────────────────────────────────────────────────

export interface ControlRowInput {
  /** Abgeleitete Session-Phase (`selectSessionPhase`). */
  phase: 'positioning' | 'ready-to-calibrate' | 'calibrating' | 'tracking'
  viewMode: ViewMode
  /** Kalibrier-Kärtchen (Countdown/„Erneut versuchen") ist sichtbar. */
  calibrating: boolean
}

export interface ControlRow {
  mic: boolean
  /** Hauptknopf in der Mitte: Haltung speichern / Beenden. */
  main: 'save' | 'stop' | null
  /** Ansicht-Knopf rechts: zum Flow / zurück zum Spiegel. */
  view: 'to-flow' | 'to-mirror' | null
  /** Flow: farblos, ohne Hintergrund. */
  discreet: boolean
}

/** Was an welchem Platz der Knopf-Zeile steht. */
export function computeControlRow(input: ControlRowInput): ControlRow {
  const { phase, viewMode, calibrating } = input
  if (calibrating) return { mic: true, main: null, view: null, discreet: false }
  if (phase === 'ready-to-calibrate') return { mic: true, main: 'save', view: null, discreet: false }
  if (phase === 'tracking') {
    const isFlow = viewMode === 'flow'
    return { mic: true, main: 'stop', view: isFlow ? 'to-mirror' : 'to-flow', discreet: isFlow }
  }
  return { mic: true, main: null, view: null, discreet: false }
}
