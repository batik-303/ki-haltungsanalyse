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

export type HintPresence = 'shown' | 'away'

export interface HintPresenceState {
  presence: HintPresence
  /** Seit wann ist der Zustand ununterbrochen in Ordnung? `null` = gerade nicht. */
  okSince: number | null
}

export function createHintPresenceState(): HintPresenceState {
  return { presence: 'shown', okSince: null }
}

export function stepHintPresence(state: HintPresenceState, ok: boolean, nowMs: number): HintPresenceState {
  if (!ok) return { presence: 'shown', okSince: null }
  if (state.presence === 'away') return state
  const okSince = state.okSince ?? nowMs
  return { presence: nowMs - okSince >= HINT_OK_HOLD_MS ? 'away' : 'shown', okSince }
}
