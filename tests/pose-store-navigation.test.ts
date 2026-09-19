import { describe, it, expect, beforeEach } from 'vitest'
import { usePoseStore } from '../src/store/pose-store'
import type { MasterPrint } from '../src/core/types'

// Reine Store-Logik der Navigations-Affordanzen aus dem Trichtermodell (#30):
// „Zurück" (Anpassung, ohne Sitzungsende) vs. „Home" (Abbruch ohne Auswertung).
// Siehe CONTEXT.md → „Navigations- & Modus-Vokabular".

const VIOLIN_PRINT: MasterPrint = { mode: 'violin', calibWristX: 0.5, calibWristY: 0.5 }

// Setzt den Store in einen realistischen „mitten in der Sitzung"-Zustand:
// Instrument gewählt, kalibriert, Sitzung läuft, Analyse- und Statistikwerte gefüllt.
function seedActiveSession() {
  usePoseStore.setState({
    appScreen: 'session',
    selectedInstrument: 'violin',
    focusMode: 'wrist',
    sensitivity: 'high',
    viewMode: 'analyse',
    masterPrint: VIOLIN_PRINT,
    calibratedShoulderWidth: 0.42,
    lastCalibrationAt: 1234,
    sessionActive: true,
    sessionZones: { flow: 10, bewusst: 5, achtung: 3, limit: 1 },
    tensionScore: 60,
    lastSessionStats: null,
  })
}

beforeEach(() => {
  // Sauberer Ausgangszustand pro Test.
  usePoseStore.getState().goHome()
})

// ── results „Nochmal üben" = neue Sitzung, gleiche Konfiguration → session ──
// Seit #35 bleibt die Kalibrierung erhalten und wir gehen direkt in die
// Session (setup wurde mit #26 aus dem V1-Flow genommen).

describe('practiceAgain', () => {
  it('führt direkt in die "session" (kein setup-Zwischenschritt mehr)', () => {
    usePoseStore.setState({ appScreen: 'results' })
    usePoseStore.getState().practiceAgain()
    expect(usePoseStore.getState().appScreen).toBe('session')
  })

  it('bewahrt Instrument, focusMode und sensitivity (gleiche Konfiguration)', () => {
    usePoseStore.setState({
      appScreen: 'results',
      selectedInstrument: 'violin',
      focusMode: 'wrist',
      sensitivity: 'high',
    })
    usePoseStore.getState().practiceAgain()
    const s = usePoseStore.getState()
    expect(s.selectedInstrument).toBe('violin')
    expect(s.focusMode).toBe('wrist')
    expect(s.sensitivity).toBe('high')
  })

  it('setzt Sitzung und Statistik zurück, bewahrt aber die Kalibrierung (#35)', () => {
    usePoseStore.setState({
      appScreen: 'results',
      masterPrint: VIOLIN_PRINT,
      calibratedShoulderWidth: 0.42,
      lastCalibrationAt: 1234,
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
    // Kalibrierung bleibt erhalten (#35) — nur Sitzung/Statistik werden geleert.
    expect(s.masterPrint).toEqual(VIOLIN_PRINT)
    expect(s.calibratedShoulderWidth).toBe(0.42)
    expect(s.lastCalibrationAt).toBe(1234)
    expect(s.sessionActive).toBe(false)
    expect(s.lastSessionStats).toBeNull()
    expect(s.tensionScore).toBe(0)
    expect(s.sessionZones).toEqual({ flow: 0, bewusst: 0, achtung: 0, limit: 0 })
  })
})

// ── session „Home" = Abbruch ohne Auswertung (Regressionsschutz für goHome) ──

describe('goHome als Sitzungs-Abbruch aus "session"', () => {
  it('landet auf "home" und verwirft die Sitzung ohne results', () => {
    seedActiveSession()
    usePoseStore.getState().goHome()
    const s = usePoseStore.getState()
    expect(s.appScreen).toBe('home')
    expect(s.sessionActive).toBe(false)
    expect(s.lastSessionStats).toBeNull() // keine Auswertung
    expect(s.masterPrint).toBeNull()
    expect(s.selectedInstrument).toBeNull()
  })
})

// ── viewMode-Wechsel bewahrt die Kalibrierung (Regressionsschutz, pose-store.ts) ──

describe('setViewMode bewahrt die Kalibrierung', () => {
  it('wechselt viewMode ohne masterPrint/Kalibrierung anzutasten', () => {
    seedActiveSession() // viewMode: 'analyse', kalibriert
    usePoseStore.getState().setViewMode('flow')
    const s = usePoseStore.getState()
    expect(s.viewMode).toBe('flow')
    expect(s.masterPrint).toEqual(VIOLIN_PRINT)
    expect(s.calibratedShoulderWidth).toBe(0.42)
    expect(s.lastCalibrationAt).toBe(1234)
  })
})
