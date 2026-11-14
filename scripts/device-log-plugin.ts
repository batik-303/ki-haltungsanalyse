// Log-Empfänger für den Gerätetest (docs/spec/stabilisierung.md, Abschnitt 6).
// Läuft nur in `vite preview`: `POST /__log` hängt die Einträge an
// logs/device-<datum>.ndjson an. Im statischen Build ist davon nichts enthalten.
// Kein Token (Entscheidung #161); Schutz ist das Größenlimit je Anfrage.
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { MAX_LOG_BODY_BYTES, logFileName, parseLogBatch } from './device-log.ts'

const LOG_DIR = path.resolve(process.cwd(), 'logs')

export function deviceLogPlugin(): Plugin {
  return {
    name: 'device-log',
    configurePreviewServer(server) {
      server.middlewares.use('/__log', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const chunks: Buffer[] = []
        let size = 0
        let tooLarge = false
        req.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_LOG_BODY_BYTES) tooLarge = true
          else chunks.push(chunk)
        })
        req.on('end', () => {
          if (tooLarge) {
            res.statusCode = 413
            res.end()
            return
          }
          const now = new Date()
          const result = parseLogBatch(Buffer.concat(chunks).toString('utf8'), now)
          if (!result.ok) {
            res.statusCode = result.status
            res.end()
            return
          }
          fs.mkdirSync(LOG_DIR, { recursive: true })
          fs.appendFileSync(path.join(LOG_DIR, logFileName(now)), result.lines.map((l) => `${l}\n`).join(''))
          res.statusCode = 204
          res.end()
        })
      })
    },
  }
}
