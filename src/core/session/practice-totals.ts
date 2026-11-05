// Übungszeit mit Blue Anchor insgesamt (#128). Reine Funktionen.
import type { StoredSession } from '../types'

/** Schreibt eine Dauer als „3 Std. 20 Min."; unter einer Stunde nur „25 Min.";
 *  unter einer Minute „unter 1 Min." (positiv statt „0 Min.", #128). */
export function formatHoursMinutes(durationMs: number): string {
  if (durationMs > 0 && durationMs < 60_000) return 'unter 1 Min.'

  const totalMinutes = Math.floor(durationMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours} Std. ${minutes} Min.` : `${minutes} Min.`
}

/** Zählt die Übungszeit aller gespeicherten Übungen zusammen („Insgesamt").
 *  Woche/Monat sind bewusst nicht dabei — später möglicher Abo-Mehrwert (#128). */
export function computeTotalPracticeMs(entries: readonly Pick<StoredSession, 'durationMs'>[]): number {
  let totalMs = 0
  for (const e of entries) totalMs += e.durationMs
  return totalMs
}
