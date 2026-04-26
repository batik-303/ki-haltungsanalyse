import { get, set, createStore } from 'idb-keyval'
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
