import { describe, it, expect } from 'vitest'
import { computeTotalPracticeMs, formatHoursMinutes } from '../src/core/session/practice-totals'

// Übungszeit mit Blue Anchor insgesamt (#128): Schreibweise und Zusammenzählen.

describe('formatHoursMinutes', () => {
  it('schreibt Stunden und Minuten aus („3 Std. 20 Min.“)', () => {
    expect(formatHoursMinutes((3 * 3600 + 20 * 60) * 1000)).toBe('3 Std. 20 Min.')
  })

  it('lässt unter einer Stunde die Stunden weg („25 Min.“)', () => {
    expect(formatHoursMinutes(25 * 60_000)).toBe('25 Min.')
  })

  it('zeigt eine kurze Übungszeit unter einer Minute als „unter 1 Min.“ statt „0 Min.“', () => {
    expect(formatHoursMinutes(20_000)).toBe('unter 1 Min.')
  })

  it('zeigt ohne Übungszeit „0 Min.“', () => {
    expect(formatHoursMinutes(0)).toBe('0 Min.')
  })
})

describe('computeTotalPracticeMs', () => {
  it('zählt die Übungszeit aller gespeicherten Übungen zusammen', () => {
    const sessions = [
      { timestamp: 1, durationMs: 20 * 60_000 },
      { timestamp: 2, durationMs: 10 * 60_000 },
      { timestamp: 3, durationMs: 45_000 },
    ]
    expect(computeTotalPracticeMs(sessions)).toBe(30 * 60_000 + 45_000)
  })

  it('ergibt 0 ohne gespeicherte Übungen', () => {
    expect(computeTotalPracticeMs([])).toBe(0)
  })
})
