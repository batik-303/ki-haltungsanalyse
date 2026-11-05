import type { SessionStats } from '../types'

/** Zeit in Worten: große Zahl + Einheit, optional die Sekunden als zweite Zeile. */
export interface AnchorTimeWords {
  big: string
  unit: 'Min.' | 'Sek.'
  rest?: string
}

/** Aufbereitete Werte für die schlichte Ergebnis-Seite (Variante D, #127/#128). */
export interface ResultsView {
  /** Dauer dieser Übung als mm:ss. */
  totalDurationStr: string
  /** „Im Anker"-Dauer (Flow-Anteil der Gesamtzeit) in Worten für den blauen Kreis. */
  anchorTime: AnchorTimeWords
  /** Längste ununterbrochene ruhige Serie als mm:ss. */
  streakStr: string
  /** Ankerpunkte der Session (0, wenn keine erfasst wurden). */
  anchorPoints: number
}

/** „8 Min." + „32 Sek."; unter einer Minute nur „41 Sek."; glatte Minuten ohne Sekunden-Zeile. */
function formatAnchorTimeWords(totalSeconds: number): AnchorTimeWords {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  if (minutes === 0) return { big: String(seconds), unit: 'Sek.' }
  if (seconds === 0) return { big: String(minutes), unit: 'Min.' }
  return { big: String(minutes), unit: 'Min.', rest: `${seconds} Sek.` }
}

/** Formatiert Sekunden als mm:ss ohne führende Minuten-Null. */
function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Leitet aus rohen Session-Statistiken das View-Modell der Ergebnis-Seite ab.
 * Reine Funktion — keine React-, DOM- oder Persistenz-Abhängigkeit.
 */
export function computeResultsView(stats: SessionStats): ResultsView {
  const totalSeconds = stats.durationMs / 1000
  const anchorSeconds = totalSeconds * (stats.zonePercentages.flow / 100)

  return {
    totalDurationStr: formatMmSs(totalSeconds),
    anchorTime: formatAnchorTimeWords(anchorSeconds),
    streakStr: formatMmSs(stats.maxFlowStreak),
    anchorPoints: stats.anchorPoints ?? 0,
  }
}
