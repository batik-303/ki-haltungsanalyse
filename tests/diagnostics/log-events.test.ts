import { describe, expect, it } from 'vitest'
import { createCalibrationSavedEvent, createProblemEvent, createHandPickEvent } from '../../src/core/diagnostics/log-events'
import { formatLogMessage } from '../../src/core/diagnostics/log-message'
import type { KnickSide, WristMasterPrint } from '../../src/core/types'

function wristPrint(
  calibKnick: number,
  calibKnickSide: KnickSide,
  flexAngle = 3.25,
  calibKnickMeasured: number = calibKnickSide * calibKnick,
): WristMasterPrint {
  return {
    mode: 'wrist',
    flexAngle,
    flexBendDir: 1,
    calibArmLength2D: 0.3,
    calibKnick,
    calibKnickSide,
    calibKnickMeasured,
    calibKnickFallback: 0,
  }
}

describe('createProblemEvent – Fehler und Warnungen fürs Diagnose-Log', () => {
  it('nimmt Quelle, Text und den Stack des ersten Fehlers', () => {
    const error = new Error('Modell fehlt')
    error.stack = 'Error: Modell fehlt\n    at init (index-abc.js:1:200)'
    expect(createProblemEvent('console.error', ['Laden:', error])).toEqual({
      kind: 'error',
      source: 'console.error',
      message: 'Laden: Error: Modell fehlt',
      stack: 'Error: Modell fehlt\n    at init (index-abc.js:1:200)',
    })
  })

  it('lässt den Stack weg, wenn kein Fehler-Objekt dabei ist', () => {
    expect(createProblemEvent('console.error', ['[Pose] Mikro fehlt'])).toEqual({
      kind: 'error',
      source: 'console.error',
      message: '[Pose] Mikro fehlt',
    })
  })

  // Geräte-Log 14.11.: MediaPipe-Hinweise kamen über console.warn als „error“
  // und verdeckten echte Fehler.
  it('führt console.warn als eigene Art „warning“, nicht als Fehler', () => {
    const warn = 'W1114 20:32:20.273999 2136208 gl_context.cc:1118] OpenGL error checking is disabled'
    expect(createProblemEvent('console.warn', [warn])).toEqual({
      kind: 'warning',
      source: 'console.warn',
      message: warn,
    })
  })

  it('filtert auch Fehler-Grund ohne Error-Objekt, z. B. Punkte bei unhandledrejection', () => {
    expect(createProblemEvent('unhandledrejection', [{ x: 0.1, y: 0.2 }]).message).toBe('[Punkte ausgelassen]')
  })
})

describe('createCalibrationSavedEvent – gespeicherte Handgelenk-Haltung (#170)', () => {
  // Hals = links auf dem Bildschirm = Seite +1 (wie in der Entwickler-Ansicht, #101).
  it('nimmt den gespeicherten Knick, den Beuge-Winkel und die Richtung Hals', () => {
    expect(createCalibrationSavedEvent(wristPrint(12.34, 1))).toEqual({
      kind: 'calibration-saved',
      knick: 12.3,
      flexAngle: 3.3,
      side: 'hals',
      knickRaw: 12.3,
      sideRaw: 'hals',
      armLength: 0.3,
      armLengthMedian: null,
    })
  })

  // #189: Rohwert vor dem Gerade-Fang, damit sich die Grenze (10°) später prüfen lässt.
  it('schreibt beim Gerade-Fang den gemessenen Rohwert mit Richtung mit', () => {
    const event = createCalibrationSavedEvent(wristPrint(0, 0, 3.25, 6.24))
    expect(event).toMatchObject({ knick: 0, side: 'gerade', knickRaw: 6.2, sideRaw: 'hals' })
    expect(createCalibrationSavedEvent(wristPrint(0, 0, 3.25, -9.86))).toMatchObject({ knickRaw: 9.9, sideRaw: 'schnecke' })
    expect(createCalibrationSavedEvent(wristPrint(0, 0, 3.25, 1.2))).toMatchObject({ knickRaw: 1.2, sideRaw: 'gerade' })
  })

  it('erkennt die Richtung Schnecke und die gerade Haltung', () => {
    expect(createCalibrationSavedEvent(wristPrint(8, -1)).side).toBe('schnecke')
    expect(createCalibrationSavedEvent(wristPrint(2, 0)).side).toBe('gerade')
  })

  it('enthält nur Zahlen und die Richtung, keine Punkte', () => {
    expect(formatLogMessage([createCalibrationSavedEvent(wristPrint(12, 1))])).not.toBe('[Punkte ausgelassen]')
    expect(Object.keys(createCalibrationSavedEvent(wristPrint(12, 1))).sort())
      .toEqual(['armLength', 'armLengthMedian', 'flexAngle', 'kind', 'knick', 'knickRaw', 'side', 'sideRaw'])
  })

  // #199/#198: Die Unterarmlänge kommt aus EINEM Bild; der Median über 3 – 2 – 1
  // zeigt, ob dieses Bild ein Ausreißer war.
  it('nennt die Unterarmlänge im Erfassungs-Bild und den Median über 3 – 2 – 1', () => {
    const event = createCalibrationSavedEvent(wristPrint(2, 0), [0.21, 0.2, 0.35, 0.19, 0.2])
    expect(event).toMatchObject({ armLength: 0.3, armLengthMedian: 0.2 })
  })

  it('ohne Countdown-Bilder ist der Median null', () => {
    expect(createCalibrationSavedEvent(wristPrint(2, 0), [])).toMatchObject({ armLengthMedian: null })
  })
})

// #199: Beweis-Log der Hand-Auswahl — nur Zahlen und Etiketten, keine Punkte.
describe('createHandPickEvent', () => {
  it('nennt Zahl der Hände, Etiketten, Abstände und die gewählte Hand', () => {
    const event = createHandPickEvent({
      detection: null,
      candidates: [
        { label: 'Left', distance: 2.0349 },
        { label: 'Left', distance: 0.1234 },
      ],
      chosen: 1,
    })
    expect(event).toEqual({
      kind: 'hand-pick',
      hands: 2,
      labels: ['Left', 'Left'],
      distances: [2.03, 0.12],
      chosen: 1,
    })
  })

  it('zeigt fehlende Abstände und keine Wahl als null', () => {
    const event = createHandPickEvent({ detection: null, candidates: [{ label: 'Right', distance: null }], chosen: -1 })
    expect(event).toEqual({ kind: 'hand-pick', hands: 1, labels: ['Right'], distances: [null], chosen: null })
  })
})
