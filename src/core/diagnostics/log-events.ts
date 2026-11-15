// Die Ereignisse im Diagnose-Log (docs/spec/stabilisierung.md, Abschnitt 6).
// Nie im Log: Kamerabilder, Video, Punkte je Bild, Personendaten.
import type { AnchorColor, KnickSide, WristMasterPrint } from '../types'
import { isKnickTowardNeck } from '../analysis/wrist-bar'
import { formatLogMessage } from './log-message'
import type { HandSelection } from '../analysis/hand-landmarker'
import type { AnchorHiddenReason } from '../analysis/anchor-visibility'

export type KnickSideLabel = 'hals' | 'schnecke' | 'gerade'

/** Grund für Grau: aus dem Sicht-Tor, oder kein Körper im Bild. */
export type GreyReason = AnchorHiddenReason | 'no-body'

export type ErrorSource = 'onerror' | 'unhandledrejection' | 'console.error' | 'console.warn'

export type DiagnosticEvent =
  | { kind: 'error' | 'warning'; source: ErrorSource; message: string; stack?: string }
  | { kind: 'model-load'; model: 'pose' | 'hand'; ms: number; ok: boolean }
  | { kind: 'fps'; fps: number }
  | { kind: 'calibration-saved'; knick: number; flexAngle: number; side: KnickSideLabel }
  | {
      kind: 'color-change'
      from: AnchorColor
      to: AnchorColor
      knick: number | null
      side: KnickSideLabel | null
      msSinceLast: number
      /** Nur beim Wechsel nach Grau: warum die Sicht nicht sicher war (#199). */
      reason?: GreyReason
    }
  | { kind: 'hand-pick'; hands: number; labels: string[]; distances: (number | null)[]; chosen: number | null }
  | {
      kind: 'device'
      userAgent: string
      screen: { width: number; height: number }
      devicePixelRatio: number
      orientation: string
    }

/**
 * Fehler oder Warnung fürs Log. `console.warn` (z. B. die vielen MediaPipe-Hinweise)
 * läuft als `warning`, damit echte Fehler (`error`) auffallen.
 */
export function createProblemEvent(source: ErrorSource, parts: readonly unknown[]): DiagnosticEvent {
  const error = parts.find((part): part is Error => part instanceof Error)
  return {
    kind: source === 'console.warn' ? 'warning' : 'error',
    source,
    message: formatLogMessage(parts),
    ...(error?.stack !== undefined && { stack: formatLogMessage([error.stack]) }),
  }
}

export const oneDecimal = (value: number): number => Math.round(value * 10) / 10

/** Richtung als Wort: Hals = links auf dem Bildschirm (wie in der Entwickler-Ansicht, #101). */
export function knickSideLabel(side: KnickSide): KnickSideLabel {
  return side === 0 ? 'gerade' : isKnickTowardNeck(side) ? 'hals' : 'schnecke'
}

/**
 * Gespeicherte Handgelenk-Haltung: nur abgeleitete Zahlen (Grad) und die Richtung,
 * damit sich der Durchschnitt mehrerer Speicher-Vorgänge bilden lässt. Keine Punkte.
 */
export function createCalibrationSavedEvent(mp: WristMasterPrint): DiagnosticEvent {
  return {
    kind: 'calibration-saved',
    knick: oneDecimal(mp.calibKnick),
    flexAngle: oneDecimal(mp.flexAngle),
    side: knickSideLabel(mp.calibKnickSide),
  }
}

const twoDecimals = (value: number): number => Math.round(value * 100) / 100

/**
 * Hand-Auswahl (#199): wie viele Hände, welche Etiketten, Abstand jeder Hand zum
 * Körper-Handgelenk (in Unterarm-Längen) und welche gewählt wurde. Keine Punkte.
 */
export function createHandPickEvent(selection: HandSelection): DiagnosticEvent {
  return {
    kind: 'hand-pick',
    hands: selection.candidates.length,
    labels: selection.candidates.map((c) => c.label),
    distances: selection.candidates.map((c) => (c.distance === null ? null : twoDecimals(c.distance))),
    chosen: selection.chosen < 0 ? null : selection.chosen,
  }
}
