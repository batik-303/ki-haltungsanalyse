/**
 * #147: Wann ein Einrichtungs-Kärtchen (Gerät gerade, Abstand) zu sehen ist.
 *
 * Ist etwas zu tun, steht das Kärtchen da. Ist der Zustand in Ordnung, bleibt
 * es noch kurz stehen (Häkchen lesen) und gleitet dann nach rechts aus dem
 * Bild. Es kommt nur wieder, wenn es gebraucht wird. Reine Logik ohne Uhr:
 * die Zeit kommt als `nowMs` herein.
 */

/** So lange bleibt ein „in Ordnung"-Kärtchen stehen, bevor es weggleitet (ms). */
export const HINT_OK_HOLD_MS = 1500
/** Abstand passt: länger stehen, damit die Zeile zur Spielhaltung lesbar ist (ms). */
export const DISTANCE_OK_HOLD_MS = 3000

export type HintPresence = 'shown' | 'away'

export interface HintPresenceState {
  presence: HintPresence
  /** Seit wann ist der Zustand ununterbrochen in Ordnung? `null` = gerade nicht. */
  okSince: number | null
}

export function createHintPresenceState(): HintPresenceState {
  return { presence: 'shown', okSince: null }
}

export function stepHintPresence(
  state: HintPresenceState,
  ok: boolean,
  nowMs: number,
  holdMs: number = HINT_OK_HOLD_MS,
): HintPresenceState {
  if (!ok) return { presence: 'shown', okSince: null }
  if (state.presence === 'away') return state
  const okSince = state.okSince ?? nowMs
  return { presence: nowMs - okSince >= holdMs ? 'away' : 'shown', okSince }
}
