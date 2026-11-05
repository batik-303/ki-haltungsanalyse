import { get, set, createStore, entries } from 'idb-keyval'
import type { StoredSession } from '../types'

const sessionStore = createStore('blue-anchor', 'sessions')

const LATEST_KEY = 'latest-session-id'

export async function saveSession(session: StoredSession): Promise<void> {
  await set(session.id, session, sessionStore)
  await set(LATEST_KEY, session.id, sessionStore)
}

export async function loadLatestSession(): Promise<StoredSession | null> {
  const latestId = await get<string>(LATEST_KEY, sessionStore)
  if (!latestId) return null
  const session = await get<StoredSession>(latestId, sessionStore)
  return session ?? null
}

/**
 * Lädt alle gespeicherten Übungen (ohne den „latest"-Zeiger).
 * Hinweis: Wird direkt nach `saveSession` aufgerufen, sieht es die neue Übung
 * schon — idb-keyval legt Transaktionen in Aufruf-Reihenfolge an, und IndexedDB
 * lässt eine spätere Lese-Transaktion auf die frühere Schreib-Transaktion warten.
 */
export async function loadAllSessions(): Promise<StoredSession[]> {
  const all = await entries<string, StoredSession>(sessionStore)
  const sessions: StoredSession[] = []
  for (const [key, session] of all) {
    if (key === LATEST_KEY || typeof session !== 'object' || session === null) continue
    sessions.push(session)
  }
  return sessions
}

const MILESTONES_KEY = 'total-hold-milestones'

export async function getTotalHoldMilestones(): Promise<number> {
  const total = await get<number>(MILESTONES_KEY, sessionStore)
  return total ?? 0
}

export async function addHoldMilestones(count: number): Promise<number> {
  if (count <= 0) return await getTotalHoldMilestones()
  const current = await getTotalHoldMilestones()
  const newTotal = current + count
  await set(MILESTONES_KEY, newTotal, sessionStore)
  return newTotal
}
