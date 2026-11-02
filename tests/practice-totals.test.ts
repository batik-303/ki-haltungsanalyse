import { describe, it, expect } from 'vitest'
import { computePracticeTotals, formatHoursMinutes } from '../src/core/session/practice-totals'

// Übungszeit mit Blue Anchor je Zeitraum (#128): Schreibweise und Zusammenzählen.

describe('formatHoursMinutes', () => {
  it('schreibt Stunden und Minuten aus („3 Std. 20 Min.“)', () => {
    expect(formatHoursMinutes((3 * 3600 + 20 * 60) * 1000)).toBe('3 Std. 20 Min.')
  })

  it('lässt unter einer Stunde die Stunden weg („25 Min.“)', () => {
    expect(formatHoursMinutes(25 * 60_000)).toBe('25 Min.')
  })

  it('zeigt ohne Übungszeit „0 Min.“', () => {
    expect(formatHoursMinutes(0)).toBe('0 Min.')
  })
})

// Lokale Zeit; Mittwoch, 04.11.2026, 12:00 (Woche beginnt Montag, 02.11.).
const NOW = new Date(2026, 10, 4, 12, 0)
const MIN = 60_000
const at = (month: number, day: number, h: number, m: number, minutes: number) => ({
  timestamp: new Date(2026, month, day, h, m).getTime(),
  durationMs: minutes * MIN,
})
const SESSIONS = [
  at(10, 3, 10, 0, 20), // Di 03.11. — diese Woche
  at(10, 2, 0, 1, 10), // Mo 02.11. 00:01 — gerade noch diese Woche
  at(10, 1, 23, 59, 15), // So 01.11. 23:59 — Vorwoche, aber dieser Monat
  at(9, 31, 23, 59, 30), // Sa 31.10. 23:59 — Vormonat
]

describe('computePracticeTotals', () => {
  it('zählt insgesamt alle gespeicherten Übungen zusammen', () => {
    expect(computePracticeTotals(SESSIONS, NOW).totalMs).toBe(75 * MIN)
  })

  it('zählt diese Woche ab Montag 0:00 (Sonntagabend gehört zur Vorwoche)', () => {
    expect(computePracticeTotals(SESSIONS, NOW).weekMs).toBe(30 * MIN)
  })

  it('beginnt die Woche auch an einem Sonntag beim Montag davor', () => {
    const sunday = new Date(2026, 10, 8, 20, 0) // So 08.11.
    expect(computePracticeTotals(SESSIONS, sunday).weekMs).toBe(30 * MIN)
  })

  it('zählt diesen Kalendermonat ab dem 1. um 0:00 (31.10. gehört zum Vormonat)', () => {
    expect(computePracticeTotals(SESSIONS, NOW).monthMs).toBe(45 * MIN)
  })
})
