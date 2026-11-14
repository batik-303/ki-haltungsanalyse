// Die Ereignisse im Diagnose-Log (docs/spec/stabilisierung.md, Abschnitt 6).
// Nie im Log: Kamerabilder, Video, Punkte je Bild, Personendaten.
import { formatLogMessage } from './log-message'

export type ErrorSource = 'onerror' | 'unhandledrejection' | 'console.error' | 'console.warn'

export type DiagnosticEvent =
  | { kind: 'error'; source: ErrorSource; message: string; stack?: string }
  | { kind: 'model-load'; model: 'pose' | 'hand'; ms: number; ok: boolean }
  | { kind: 'fps'; fps: number }
  | {
      kind: 'device'
      userAgent: string
      screen: { width: number; height: number }
      devicePixelRatio: number
      orientation: string
    }

export function createErrorEvent(source: ErrorSource, parts: readonly unknown[]): DiagnosticEvent {
  const error = parts.find((part): part is Error => part instanceof Error)
  return {
    kind: 'error',
    source,
    message: formatLogMessage(parts),
    ...(error?.stack !== undefined && { stack: formatLogMessage([error.stack]) }),
  }
}
