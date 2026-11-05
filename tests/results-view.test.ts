import { describe, it, expect } from 'vitest'
import { computeResultsView } from '../src/core/session/results-view'
import type { SessionStats } from '../src/core/types'

// Reines View-Modell für die schlichte Ergebnis-Seite (Variante D, #128).
// Prüft nur Ableitungen aus rohen SessionStats — keine React-/DOM-Belange.

// Basis-Session: 12:34 gesamt, 68 % im Flow, längste Serie 2:23, 105 Ankerpunkte.
function baseStats(overrides: Partial<SessionStats> = {}): SessionStats {
  const durationMs = (12 * 60 + 34) * 1000
  return {
    durationMs,
    durationMinutes: 12,
    durationSeconds: 34,
    totalFrames: 4500,
    zones: { flow: 0, bewusst: 0, achtung: 0, limit: 0 },
    zonePercentages: { flow: 68, bewusst: 21, achtung: 9, limit: 2 },
    tensionTimeline: [],
    maxFlowStreak: 143, // 2:23
    anchorPoints: 105,
    ...overrides,
  }
}

describe('computeResultsView', () => {

  it('formatiert die Gesamtdauer als mm:ss ohne führende Minuten-Null', () => {
    const v = computeResultsView(baseStats())
    expect(v.totalDurationStr).toBe('12:34')
  })

  it('formatiert die längste Serie als mm:ss', () => {
    const v = computeResultsView(baseStats())
    expect(v.streakStr).toBe('2:23')
  })

  it('reicht die Ankerpunkte durch', () => {
    const v = computeResultsView(baseStats())
    expect(v.anchorPoints).toBe(105)
  })

  it('zeigt 0 Ankerpunkte, wenn keine erfasst wurden', () => {
    const v = computeResultsView(baseStats({ anchorPoints: undefined }))
    expect(v.anchorPoints).toBe(0)
  })

  it('zeigt die Zeit im Anker in Worten: Minuten groß, Sekunden darunter (#128)', () => {
    // 68 % von 754 s = 512 s = 8 Min. 32 Sek.
    const v = computeResultsView(baseStats())
    expect(v.anchorTime).toEqual({ big: '8', unit: 'Min.', rest: '32 Sek.' })
  })

  it('zeigt unter einer Minute nur die Sekunden (z. B. „41 Sek.“)', () => {
    // 50 % von 82 s = 41 s
    const v = computeResultsView(baseStats({ durationMs: 82_000, zonePercentages: { flow: 50, bewusst: 50, achtung: 0, limit: 0 } }))
    expect(v.anchorTime).toEqual({ big: '41', unit: 'Sek.' })
  })

  it('lässt die Sekunden-Zeile bei glatten Minuten weg (10 Min., nicht „0 Sek.“)', () => {
    const v = computeResultsView(baseStats({ durationMs: 600_000, zonePercentages: { flow: 100, bewusst: 0, achtung: 0, limit: 0 } }))
    expect(v.anchorTime).toEqual({ big: '10', unit: 'Min.' })
  })

  it('zeigt bei null Sekunden im Anker „0 Sek.“', () => {
    const v = computeResultsView(baseStats({ zonePercentages: { flow: 0, bewusst: 100, achtung: 0, limit: 0 } }))
    expect(v.anchorTime).toEqual({ big: '0', unit: 'Sek.' })
  })

  it('zeigt glatte 1 Minute als „1 Min.“ (60 s)', () => {
    const v = computeResultsView(baseStats({ durationMs: 60_000, zonePercentages: { flow: 100, bewusst: 0, achtung: 0, limit: 0 } }))
    expect(v.anchorTime).toEqual({ big: '1', unit: 'Min.' })
  })

  it('zeigt 541 s als „9 Min.“ und „1 Sek.“', () => {
    const v = computeResultsView(baseStats({ durationMs: 541_000, zonePercentages: { flow: 100, bewusst: 0, achtung: 0, limit: 0 } }))
    expect(v.anchorTime).toEqual({ big: '9', unit: 'Min.', rest: '1 Sek.' })
  })
})
