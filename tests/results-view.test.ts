import { describe, it, expect } from 'vitest'
import { computeResultsView } from '../src/core/session/results-view'
import type { SessionStats } from '../src/core/types'

// Reines View-Modell für den „Anker-Fokus"-Results-Screen (Variante A, #21/#44).
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
  it('bildet das Mode-Label aus dem FocusMode', () => {
    const v = computeResultsView(baseStats(), 'violin', 0)
    expect(v.modeLabel).toBe('🎻 Geige')
  })

  it('formatiert die Gesamtdauer als mm:ss ohne führende Minuten-Null', () => {
    const v = computeResultsView(baseStats(), 'violin', 0)
    expect(v.totalDurationStr).toBe('12:34')
  })

  it('berechnet die „Im Anker"-Dauer als Flow-Anteil der Gesamtdauer (mm:ss)', () => {
    // 68 % von 754 s = 512,72 s = 8:32
    const v = computeResultsView(baseStats(), 'violin', 0)
    expect(v.anchorDurationStr).toBe('8:32')
  })

  it('gibt den gerundeten Flow-Prozentsatz zurück', () => {
    const v = computeResultsView(baseStats({ zonePercentages: { flow: 67.6, bewusst: 21, achtung: 9, limit: 2.4 } }), 'violin', 0)
    expect(v.flowPercent).toBe(68)
  })

  it('formatiert die längste Serie als mm:ss', () => {
    const v = computeResultsView(baseStats(), 'violin', 0)
    expect(v.streakStr).toBe('2:23')
  })

  it('reicht die Ankerpunkte durch', () => {
    const v = computeResultsView(baseStats(), 'violin', 0)
    expect(v.anchorPoints).toBe(105)
  })

  it('lässt Ankerpunkte undefiniert, wenn keine erfasst wurden', () => {
    const v = computeResultsView(baseStats({ anchorPoints: undefined }), 'violin', 0)
    expect(v.anchorPoints).toBeUndefined()
  })

  it('erkennt einen neuen Rekord (Serie erreicht oder übertrifft die Bestmarke)', () => {
    const v = computeResultsView(baseStats({ maxFlowStreak: 143 }), 'violin', 143)
    expect(v.isNewRecord).toBe(true)
    expect(v.successTitle).toBe('Neue persönliche Bestmarke')
  })

  it('meldet keinen Rekord unterhalb der Bestmarke, bleibt aber positiv formuliert', () => {
    const v = computeResultsView(baseStats({ maxFlowStreak: 90 }), 'violin', 143)
    expect(v.isNewRecord).toBe(false)
    expect(v.successTitle).toBe('Deine längste ruhige Serie')
  })

  it('meldet keinen Rekord bei einer Null-Serie, selbst wenn die Bestmarke 0 ist', () => {
    const v = computeResultsView(baseStats({ maxFlowStreak: 0 }), 'violin', 0)
    expect(v.isNewRecord).toBe(false)
  })
})
