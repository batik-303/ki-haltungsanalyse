// Übungszeit mit Blue Anchor je Zeitraum (#128). Reine Funktionen.
import type { StoredSession } from '../types'

/** Schreibt eine Dauer als „3 Std. 20 Min."; unter einer Stunde nur „25 Min.". */
export function formatHoursMinutes(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours} Std. ${minutes} Min.` : `${minutes} Min.`
}

/** Was von einer gespeicherten Übung fürs Zusammenzählen gebraucht wird
 *  (`timestamp` = Zeitpunkt des Speicherns, also Ende der Übung). */
export type PracticeEntry = Pick<StoredSession, 'timestamp' | 'durationMs'>

export interface PracticeTotals {
  weekMs: number
  monthMs: number
  totalMs: number
}

/** Montag 0:00 der Woche von `now`, lokale Zeit. */
function startOfWeek(now: Date): number {
  const daysSinceMonday = (now.getDay() + 6) % 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday).getTime()
}

/** Zählt die Übungszeit für diese Woche (Mo–So), diesen Monat und insgesamt zusammen. */
export function computePracticeTotals(entries: readonly PracticeEntry[], now: Date): PracticeTotals {
  const weekStart = startOfWeek(now)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  let weekMs = 0
  let monthMs = 0
  let totalMs = 0
  for (const e of entries) {
    totalMs += e.durationMs
    if (e.timestamp >= weekStart) weekMs += e.durationMs
    if (e.timestamp >= monthStart) monthMs += e.durationMs
  }
  return { weekMs, monthMs, totalMs }
}
