// Reine Regeln des Log-Empfängers (ohne Datei- und Netz-Zugriff, testbar).

/** Obergrenze je Anfrage; so viel nimmt auch `fetch keepalive` / `sendBeacon` mit. */
export const MAX_LOG_BODY_BYTES = 64 * 1024

export type LogBatchResult =
  | { ok: true; lines: string[] }
  | { ok: false; status: 400 | 413 }

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Prüft ein Bündel vom Gerät und macht daraus je Eintrag eine NDJSON-Zeile. */
export function parseLogBatch(body: string, receivedAt: Date): LogBatchResult {
  if (Buffer.byteLength(body, 'utf8') > MAX_LOG_BODY_BYTES) return { ok: false, status: 413 }
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return { ok: false, status: 400 }
  }
  if (!Array.isArray(parsed) || !parsed.every(isPlainObject)) return { ok: false, status: 400 }
  const stamp = receivedAt.toISOString()
  return { ok: true, lines: parsed.map((entry) => JSON.stringify({ receivedAt: stamp, ...entry })) }
}

/** Eine Log-Datei je Tag (UTC), z. B. `device-2026-11-14.ndjson`. */
export function logFileName(date: Date): string {
  return `device-${date.toISOString().slice(0, 10)}.ndjson`
}
