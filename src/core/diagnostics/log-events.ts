// Die Ereignisse im Diagnose-Log (docs/spec/stabilisierung.md, Abschnitt 6).
// Nie im Log: Kamerabilder, Video, Punkte je Bild, Personendaten.
import type { WristMasterPrint } from '../types'
import { isKnickTowardNeck } from '../analysis/wrist-bar'
import { formatLogMessage } from './log-message'

export type ErrorSource = 'onerror' | 'unhandledrejection' | 'console.error' | 'console.warn'

export type DiagnosticEvent =
  | { kind: 'error' | 'warning'; source: ErrorSource; message: string; stack?: string }
  | { kind: 'model-load'; model: 'pose' | 'hand'; ms: number; ok: boolean }
  | { kind: 'fps'; fps: number }
  | { kind: 'calibration-saved'; knick: number; flexAngle: number; side: 'hals' | 'schnecke' | 'gerade' }
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

const oneDecimal = (value: number): number => Math.round(value * 10) / 10

/**
 * Gespeicherte Handgelenk-Haltung: nur abgeleitete Zahlen (Grad) und die Richtung,
 * damit sich der Durchschnitt mehrerer Speicher-Vorgänge bilden lässt. Keine Punkte.
 */
export function createCalibrationSavedEvent(mp: WristMasterPrint): DiagnosticEvent {
  return {
    kind: 'calibration-saved',
    knick: oneDecimal(mp.calibKnick),
    flexAngle: oneDecimal(mp.flexAngle),
    side: mp.calibKnickSide === 0 ? 'gerade' : isKnickTowardNeck(mp.calibKnickSide) ? 'hals' : 'schnecke',
  }
}
