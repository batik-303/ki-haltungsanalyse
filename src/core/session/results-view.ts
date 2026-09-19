import type { FocusMode, SessionStats } from '../types'

// Sichtbare Mode-Labels für die Kopf-Chip des Results-Screens.
const MODE_LABELS: Record<FocusMode, string> = {
  violin: '🎻 Geige',
  wrist: '🤚 Handgelenk',
  shoulder: '💪 Schulter',
}

// Ruhe-Impuls je Modus — bewusst als Einladung formuliert (Präsens/Futur),
// nicht als Behauptung über die gerade gemessene Haltung. So bleibt die
// Botschaft positiv und trifft, ohne ein Ergebnis zu unterstellen, das den
// Daten widersprechen könnte (Feedback-Philosophie).
const MODE_CALM_MESSAGES: Record<FocusMode, string> = {
  violin:
    'Lass die Geige leicht auf der Schulter ruhen — ohne festzuhalten. Nimm dieses Gefühl mit in die nächste Übung.',
  wrist:
    'Lass dein Handgelenk locker und getragen. Nimm dieses Gefühl mit — beim nächsten Mal einfach dort weiterspielen.',
  shoulder:
    'Lass deine Schultern weich und tief. Nimm dieses Gefühl mit — beim nächsten Mal einfach dort weiterspielen.',
}

/** Aufbereitete Werte für den „Anker-Fokus"-Results-Screen (Variante A, #21/#44). */
export interface ResultsView {
  /** Mode-Chip, z. B. „🎻 Geige". */
  modeLabel: string
  /** Gesamtdauer als mm:ss. */
  totalDurationStr: string
  /** „Im Anker"-Dauer (Flow-Anteil der Gesamtzeit) als mm:ss. */
  anchorDurationStr: string
  /** Gerundeter Flow-Anteil in Prozent. */
  flowPercent: number
  /** Längste ununterbrochene ruhige Serie als mm:ss. */
  streakStr: string
  /** Neue persönliche Bestmarke erreicht? */
  isNewRecord: boolean
  /** Überschrift der Erfolgs-Karte — immer positiv formuliert. */
  successTitle: string
  /** Modusgerechter Ruhe-Impuls (Einladung, keine Ergebnis-Behauptung). */
  calmMessage: string
  /** Ankerpunkte der Session (fehlt, wenn keine erfasst wurden). */
  anchorPoints?: number
}

/** Formatiert Sekunden als mm:ss ohne führende Minuten-Null. */
function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Leitet aus rohen Session-Statistiken das View-Modell des Results-Screens ab.
 * Reine Funktion — keine React-, DOM- oder Persistenz-Abhängigkeit.
 *
 * @param stats Statistiken der beendeten Session
 * @param focusMode Aktiver Fokus-Modus (Instrument/Körperteil)
 * @param personalBestStreak Bisherige Bestmarke der längsten Serie (Sekunden)
 */
export function computeResultsView(
  stats: SessionStats,
  focusMode: FocusMode,
  personalBestStreak: number,
): ResultsView {
  const totalSeconds = stats.durationMs / 1000
  const anchorSeconds = totalSeconds * (stats.zonePercentages.flow / 100)

  const isNewRecord = stats.maxFlowStreak > 0 && stats.maxFlowStreak >= personalBestStreak

  return {
    modeLabel: MODE_LABELS[focusMode],
    totalDurationStr: formatMmSs(totalSeconds),
    anchorDurationStr: formatMmSs(anchorSeconds),
    flowPercent: Math.round(stats.zonePercentages.flow),
    streakStr: formatMmSs(stats.maxFlowStreak),
    isNewRecord,
    successTitle: isNewRecord ? 'Neue persönliche Bestmarke' : 'Deine längste ruhige Serie',
    calmMessage: MODE_CALM_MESSAGES[focusMode],
    anchorPoints: stats.anchorPoints,
  }
}
