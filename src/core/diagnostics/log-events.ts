// Die Ereignisse im Diagnose-Log (docs/spec/stabilisierung.md, Abschnitt 6).
// Nie im Log: Kamerabilder, Video, Punkte je Bild, Personendaten.
import type { AnchorColor, KnickSide, WristMasterPrint } from '../types'
import { isKnickTowardNeck } from '../analysis/wrist-bar'
import { formatLogMessage } from './log-message'
import { knickSideOf } from '../calibration/master-print'
import type { HandSelection } from '../analysis/hand-landmarker'
import type { AnchorHiddenReason } from '../analysis/anchor-visibility'

export type KnickSideLabel = 'hals' | 'schnecke' | 'gerade'

/** Grund für Grau: aus dem Sicht-Tor, oder kein Körper im Bild. */
export type GreyReason = AnchorHiddenReason | 'no-body'

/** Ergebnis der iOS-Frage „Bewegung und Ausrichtung“; `none` = keine Frage nötig. */
export type TiltPermissionResult = 'granted' | 'denied' | 'error' | 'none'

export type ErrorSource = 'onerror' | 'unhandledrejection' | 'console.error' | 'console.warn'

export type DiagnosticEvent =
  | { kind: 'error' | 'warning'; source: ErrorSource; message: string; stack?: string }
  | { kind: 'model-load'; model: 'pose' | 'hand'; ms: number; ok: boolean }
  | { kind: 'fps'; fps: number }
  | {
      kind: 'calibration-saved'
      knick: number
      flexAngle: number
      side: KnickSideLabel
      /** Gemessener Knick vor dem Gerade-Fang (#189), um die Fang-Grenze zu prüfen. */
      knickRaw: number
      sideRaw: KnickSideLabel
      /** Unterarmlänge (2D, mit Seitenverhältnis) im Erfassungs-Bild — so wird sie gespeichert. */
      armLength: number
      /** Median der Unterarmlänge über 3 – 2 – 1; `null` ohne Countdown-Bilder (#199). */
      armLengthMedian: number | null
    }
  | {
      kind: 'color-change'
      from: AnchorColor
      to: AnchorColor
      knick: number | null
      side: KnickSideLabel | null
      msSinceLast: number
      /** Nur beim Wechsel nach Grau: warum die Sicht nicht sicher war (#199). */
      reason?: GreyReason
      /** Unterarm aktuell / gespeichert; `null` ohne Körper (#199). */
      armRatio: number | null
    }
  | { kind: 'hand-pick'; hands: number; labels: string[]; distances: (number | null)[]; chosen: number | null }
  | { kind: 'tilt-permission'; hasRequestPermission: boolean; result: TiltPermissionResult }
  | {
      kind: 'tilt-samples'
      screenAngle: number
      samples: { beta: number | null; gamma: number | null }[]
      /** Wie das Kärtchen endete (#215); `null` = läuft noch. */
      outcome: string | null
    }
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
export function createCalibrationSavedEvent(mp: WristMasterPrint, armLengthSamples: readonly number[] = []): DiagnosticEvent {
  return {
    kind: 'calibration-saved',
    knick: oneDecimal(mp.calibKnick),
    flexAngle: oneDecimal(mp.flexAngle),
    side: knickSideLabel(mp.calibKnickSide),
    knickRaw: oneDecimal(Math.abs(mp.calibKnickMeasured)),
    sideRaw: knickSideLabel(knickSideOf(mp.calibKnickMeasured)),
    armLength: threeDecimals(mp.calibArmLength2D),
    armLengthMedian: armLengthSamples.length > 0 ? threeDecimals(median(armLengthSamples)) : null,
  }
}

export const twoDecimals = (value: number): number => Math.round(value * 100) / 100
const threeDecimals = (value: number): number => Math.round(value * 1000) / 1000

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length / 2
  return sorted.length % 2 === 1 ? sorted[Math.floor(mid)]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

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

/** #215: Gibt es die iOS-Frage, und was kam zurück? */
export function createTiltPermissionEvent(hasRequestPermission: boolean, result: TiltPermissionResult): DiagnosticEvent {
  return { kind: 'tilt-permission', hasRequestPermission, result }
}

/** #215: einige Rohwerte des Lagesensors (gerundet), Bildschirm-Winkel und Ausgang. */
export function createTiltSamplesEvent(
  samples: readonly { beta: number | null; gamma: number | null }[],
  screenAngle: number,
  outcome: string | null,
): DiagnosticEvent {
  const round = (v: number | null) => (v === null ? null : oneDecimal(v))
  return {
    kind: 'tilt-samples',
    screenAngle,
    samples: samples.map((s) => ({ beta: round(s.beta), gamma: round(s.gamma) })),
    outcome,
  }
}
