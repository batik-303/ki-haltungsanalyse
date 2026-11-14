// Diagnose-Logger für den Gerätetest (docs/spec/stabilisierung.md, Abschnitt 6).
// Nur im Test-Build (`__DIAGNOSE__`, VITE_DIAGNOSE=1) aufgerufen; jeder Aufruf
// steht hinter `if (__DIAGNOSE__)`, so wirft Vite das Modul im Produktions-Build
// komplett heraus. Das Modul hat deshalb keine Wirkung beim Import.
// Schickt Fehler, Modell-Ladezeit, Bildrate und einmal je Sitzung das Gerät an
// `POST /__log` (Preview-Server). Nie Bilder, Video, Punkte je Bild, Personendaten.
import { createFrameRateMeter } from '@/core/diagnostics/frame-rate-meter'
import { createLogBatcher } from '@/core/diagnostics/log-batcher'
import { createCalibrationSavedEvent, createErrorEvent, type DiagnosticEvent, type ErrorSource } from '@/core/diagnostics/log-events'
import type { MasterPrint } from '@/core/types'

const LOG_URL = '/__log'
const MAX_BODY_BYTES = 64 * 1024
const FLUSH_INTERVAL_MS = 5000
const FPS_WINDOW_MS = 10_000

type Logger = { record: (event: DiagnosticEvent) => void; frameRate: ReturnType<typeof createFrameRateMeter> }

let logger: Logger | undefined

function randomSessionId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

function currentOrientation(): string {
  return screen.orientation?.type ?? (matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape')
}

export function installDiagnosticLogger(): void {
  if (logger) return
  const sessionId = randomSessionId()
  const startedAt = performance.now()
  const batcher = createLogBatcher(MAX_BODY_BYTES)

  const record = (event: DiagnosticEvent): void => {
    batcher.add({ sessionId, t: Math.round(performance.now() - startedAt), ...event })
  }

  const flush = (useBeacon: boolean): void => {
    for (const body of batcher.drain()) {
      if (useBeacon && navigator.sendBeacon(LOG_URL, body)) continue
      // Fehler beim Senden bleiben still, sonst würde der Logger sich selbst loggen.
      fetch(LOG_URL, { method: 'POST', body, keepalive: true }).catch(() => undefined)
    }
  }

  const recordError = (source: ErrorSource, parts: readonly unknown[]): void => {
    record(createErrorEvent(source, parts))
  }

  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      recordError(`console.${level}`, args)
    }
  }
  window.addEventListener('error', (e) => recordError('onerror', [e.error ?? e.message]))
  window.addEventListener('unhandledrejection', (e) => recordError('unhandledrejection', [e.reason]))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })
  setInterval(() => flush(false), FLUSH_INTERVAL_MS)

  record({
    kind: 'device',
    userAgent: navigator.userAgent,
    screen: { width: screen.width, height: screen.height },
    devicePixelRatio: window.devicePixelRatio,
    orientation: currentOrientation(),
  })
  logger = { record, frameRate: createFrameRateMeter(FPS_WINDOW_MS) }
}

/** Ladezeit eines MediaPipe-Modells (WASM + Modelldatei) in Millisekunden. */
export function reportModelLoad(model: 'pose' | 'hand', ms: number, ok: boolean): void {
  logger?.record({ kind: 'model-load', model, ms: Math.round(ms), ok })
}

/** Ein Bild der Erkennungs-Schleife; alle 10 s geht die Bildrate ins Log. */
export function reportFrame(nowMs: number): void {
  if (!logger) return
  const fps = logger.frameRate.tick(nowMs)
  if (fps !== undefined) logger.record({ kind: 'fps', fps: Math.round(fps * 10) / 10 })
}

/** Gespeicherte Haltung (nur Handgelenk-Modus): Knick, Beuge-Winkel, Richtung. */
export function reportCalibrationSaved(mp: MasterPrint): void {
  if (mp.mode === 'wrist') logger?.record(createCalibrationSavedEvent(mp))
}
