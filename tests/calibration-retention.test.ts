import { describe, it, expect, beforeEach } from 'vitest'
import { usePoseStore } from '../src/store/pose-store'
import { selectSessionPhase } from '../src/store/selectors'
import type { MasterPrint } from '../src/core/types'

// V0.1 — Kalibrierung über Sessions erhalten (#35).
//
// Ziel: Eine einmal erstellte Kalibrierung (`MasterPrint`) bleibt in-memory
// erhalten, bis man sie **bewusst** neu macht. Sie darf nicht mehr bei
// jedem Sessionstart, „Nochmal üben" oder Sitzungsende verworfen werden.
//
// Einziger Verwerf-Punkt = bewusstes „Neu kalibrieren" (`recalibrate`).
// Ausnahme: `setFocusMode` verwirft weiterhin (anderes Körperziel → neue
// Referenz, gewollt), ebenso `goHome` (klarer Neustart). Siehe CONTEXT.md.

const VIOLIN_PRINT: MasterPrint = { mode: 'violin', calibWristX: 0.5, calibWristY: 0.5 }

// Setzt den Store in einen „fertig kalibriert, Sitzung vorbei"-Zustand.
function seedCalibrated() {
  usePoseStore.setState({
    focusMode: 'violin',
    selectedInstrument: 'violin',
    masterPrint: VIOLIN_PRINT,
    calibratedShoulderWidth: 0.42,
    lastCalibrationAt: 1234,
    sessionActive: false,
  })
}

function expectCalibrationKept() {
  const s = usePoseStore.getState()
  expect(s.masterPrint).toEqual(VIOLIN_PRINT)
  expect(s.calibratedShoulderWidth).toBe(0.42)
  expect(s.lastCalibrationAt).toBe(1234)
}

beforeEach(() => {
  usePoseStore.getState().reset()
})

describe('goToSession bewahrt eine vorhandene Kalibrierung', () => {
  it('lässt masterPrint/Schulterbreite/Zeitstempel unangetastet', () => {
    seedCalibrated()
    usePoseStore.getState().goToSession()
    expectCalibrationKept()
    expect(usePoseStore.getState().appScreen).toBe('session')
  })

  it('landet direkt im „bereit"-Zustand (ohne erzwungene Neu-Kalibrierung)', () => {
    seedCalibrated()
    usePoseStore.getState().goToSession()
    expect(selectSessionPhase(usePoseStore.getState())).toBe('ready-to-start')
  })
})

describe('enterSession bewahrt eine vorhandene Kalibrierung', () => {
  it('geht mit erhaltener Kalibrierung direkt in die bereite Session', () => {
    seedCalibrated()
    usePoseStore.getState().enterSession('violin')
    expectCalibrationKept()
    const s = usePoseStore.getState()
    expect(s.appScreen).toBe('session')
    expect(s.selectedInstrument).toBe('violin')
    expect(selectSessionPhase(s)).toBe('ready-to-start')
  })
})

describe('practiceAgain (results „Nochmal üben")', () => {
  it('führt mit erhaltener Kalibrierung direkt in die Session', () => {
    seedCalibrated()
    usePoseStore.setState({ appScreen: 'results' })
    usePoseStore.getState().practiceAgain()
    expect(usePoseStore.getState().appScreen).toBe('session')
    expectCalibrationKept()
    expect(selectSessionPhase(usePoseStore.getState())).toBe('ready-to-start')
  })

  it('setzt Sitzung und Statistik zurück, ohne die Kalibrierung anzutasten', () => {
    seedCalibrated()
    usePoseStore.setState({
      appScreen: 'results',
      sessionActive: true,
      sessionZones: { flow: 10, bewusst: 5, achtung: 3, limit: 1 },
      tensionScore: 60,
      lastSessionStats: {
        durationMs: 1000, durationMinutes: 0, durationSeconds: 1, totalFrames: 30,
        zones: { flow: 10, bewusst: 5, achtung: 3, limit: 1 },
        zonePercentages: { flow: 50, bewusst: 25, achtung: 15, limit: 10 },
        tensionTimeline: [], maxFlowStreak: 5,
      },
    })
    usePoseStore.getState().practiceAgain()
    const s = usePoseStore.getState()
    expect(s.sessionActive).toBe(false)
    expect(s.lastSessionStats).toBeNull()
    expect(s.tensionScore).toBe(0)
    expect(s.sessionZones).toEqual({ flow: 0, bewusst: 0, achtung: 0, limit: 0 })
    expectCalibrationKept()
  })
})

describe('endSession bewahrt die Kalibrierung (Session-Wiederholung)', () => {
  it('lässt masterPrint/Zeitstempel/Schulterbreite nach dem Beenden stehen', () => {
    seedCalibrated()
    usePoseStore.setState({ sessionActive: true })
    usePoseStore.getState().endSession(null)
    expect(usePoseStore.getState().sessionActive).toBe(false)
    expectCalibrationKept()
  })
})

describe('setFocusMode verwirft die Kalibrierung weiterhin', () => {
  it('verwirft masterPrint bei Wechsel des Körperziels', () => {
    seedCalibrated()
    usePoseStore.getState().setFocusMode('wrist')
    const s = usePoseStore.getState()
    expect(s.masterPrint).toBeNull()
    expect(s.calibratedShoulderWidth).toBeNull()
    expect(s.lastCalibrationAt).toBeNull()
  })
})

describe('recalibrate — der einzige bewusste Verwerf-Punkt', () => {
  it('verwirft die Kalibrierung vollständig und geht zurück in positioning', () => {
    seedCalibrated()
    usePoseStore.setState({ sessionActive: true })
    usePoseStore.getState().recalibrate()
    const s = usePoseStore.getState()
    expect(s.masterPrint).toBeNull()
    expect(s.calibratedShoulderWidth).toBeNull()
    expect(s.lastCalibrationAt).toBeNull()
    expect(s.sessionActive).toBe(false)
    expect(selectSessionPhase(s)).toBe('positioning')
  })
})
