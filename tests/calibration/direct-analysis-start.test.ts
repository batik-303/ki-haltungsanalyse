import { describe, it, expect, beforeEach } from 'vitest'
import { usePoseStore } from '../../src/store/pose-store'
import { selectSessionPhase } from '../../src/store/selectors'
import type { MasterPrint, SessionStats } from '../../src/core/types'

// T2 (#58, Karte #56): Kalibrierung geht direkt in die Analyse — kein „Start"-Schritt.
//
// `calibrate(...)` schaltet die Analyse **sofort scharf**: die Session läuft
// (sessionActive), und die abgeleitete Phase geht direkt auf `tracking`. Die
// frühere Zwischen-Phase `ready-to-start` (mit „Start"-Knopf und „Session
// starten"-CTA) entfällt vollständig.

const VIOLIN_PRINT: MasterPrint = { mode: 'violin', calibWristX: 0.5, calibWristY: 0.5 }

const OLD_STATS: SessionStats = {
  durationMs: 1000, durationMinutes: 0, durationSeconds: 1, totalFrames: 30,
  zones: { flow: 10, bewusst: 5, achtung: 3, limit: 1 },
  zonePercentages: { flow: 50, bewusst: 25, achtung: 15, limit: 10 },
  tensionTimeline: [], maxFlowStreak: 5,
}

beforeEach(() => {
  usePoseStore.getState().reset()
})

describe('calibrate schaltet die Analyse sofort scharf', () => {
  it('startet die Session direkt (sessionActive) mit gesetztem Startzeitpunkt', () => {
    usePoseStore.getState().calibrate(VIOLIN_PRINT, 0.42)
    const s = usePoseStore.getState()
    expect(s.masterPrint).toEqual(VIOLIN_PRINT)
    expect(s.calibratedShoulderWidth).toBe(0.42)
    expect(s.sessionActive).toBe(true)
    expect(s.sessionStart).toBeGreaterThan(0)
    expect(s.isCalibrating).toBe(false)
  })

  it('führt direkt in die Phase tracking (kein Zwischenschritt)', () => {
    usePoseStore.getState().calibrate(VIOLIN_PRINT, 0.42)
    expect(selectSessionPhase(usePoseStore.getState())).toBe('tracking')
  })

  it('setzt Zonen und alte Statistik zurück (frische Session)', () => {
    usePoseStore.setState({
      sessionZones: { flow: 9, bewusst: 9, achtung: 9, limit: 9 },
      lastSessionStats: OLD_STATS,
    })
    usePoseStore.getState().calibrate(VIOLIN_PRINT, 0.42)
    const s = usePoseStore.getState()
    expect(s.sessionZones).toEqual({ flow: 0, bewusst: 0, achtung: 0, limit: 0 })
    expect(s.lastSessionStats).toBeNull()
  })
})

describe("die Zwischen-Phase ready-to-start entfällt", () => {
  it('ein kalibrierter Zustand ist immer tracking — nie ein Start-Zwischenschritt', () => {
    // Selbst wenn sessionActive (transient) false ist, gibt es mit MasterPrint
    // keinen „bereit, aber noch nicht gestartet"-Zustand mehr.
    usePoseStore.setState({ masterPrint: VIOLIN_PRINT, distanceOk: true, sessionActive: false })
    expect(selectSessionPhase(usePoseStore.getState())).toBe('tracking')
  })

  it('ohne Kalibrierung bleiben positioning / ready-to-calibrate erhalten', () => {
    usePoseStore.setState({ masterPrint: null, distanceOk: false })
    expect(selectSessionPhase(usePoseStore.getState())).toBe('positioning')
    usePoseStore.setState({ distanceOk: true })
    expect(selectSessionPhase(usePoseStore.getState())).toBe('ready-to-calibrate')
  })
})
