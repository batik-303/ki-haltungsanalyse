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
 * Query the personal best flow streak across all stored sessions.
 * Returns 0 if no sessions exist.
 */
export async function getPersonalBestStreak(): Promise<number> {
  const all = await entries<string, StoredSession>(sessionStore)
  let best = 0
  for (const [key, session] of all) {
    if (key === LATEST_KEY) continue
    if (session?.maxFlowStreak && session.maxFlowStreak > best) {
      best = session.maxFlowStreak
    }
  }
  return best
}
