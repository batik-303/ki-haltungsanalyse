import { describe, expect, it } from 'vitest'
import { MAX_LOG_BODY_BYTES, logFileName, parseLogBatch } from '../../scripts/device-log'

const NOW = new Date('2026-11-14T09:30:00.000Z')

describe('parseLogBatch – Empfänger für Geräte-Logs', () => {
  it('macht aus einem Bündel je Eintrag eine NDJSON-Zeile mit Empfangszeit', () => {
    const body = JSON.stringify([{ kind: 'error', message: 'kaputt' }, { kind: 'fps', fps: 28 }])
    expect(parseLogBatch(body, NOW)).toEqual({
      ok: true,
      lines: [
        '{"receivedAt":"2026-11-14T09:30:00.000Z","kind":"error","message":"kaputt"}',
        '{"receivedAt":"2026-11-14T09:30:00.000Z","kind":"fps","fps":28}',
      ],
    })
  })

  it('lehnt Anfragen über 64 KiB mit 413 ab', () => {
    expect(MAX_LOG_BODY_BYTES).toBe(64 * 1024)
    const body = JSON.stringify([{ kind: 'error', message: 'x'.repeat(MAX_LOG_BODY_BYTES) }])
    expect(parseLogBatch(body, NOW)).toEqual({ ok: false, status: 413 })
  })

  it('lehnt kaputtes JSON, Nicht-Listen und Einträge ohne Objekt mit 400 ab', () => {
    expect(parseLogBatch('{nein', NOW)).toEqual({ ok: false, status: 400 })
    expect(parseLogBatch('{"kind":"error"}', NOW)).toEqual({ ok: false, status: 400 })
    expect(parseLogBatch('[1, "a"]', NOW)).toEqual({ ok: false, status: 400 })
  })
})

describe('logFileName – eine Datei je Tag', () => {
  it('benennt die Datei nach dem Datum', () => {
    expect(logFileName(NOW)).toBe('device-2026-11-14.ndjson')
  })
})
