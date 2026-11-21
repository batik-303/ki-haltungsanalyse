// #215: Neigungs-Verlauf fürs Diagnose-Log, solange das Gerät-Kärtchen aktiv ist.
// Damit lässt sich messen, wie weit ein Tablet auf dem Notenständer zurücklehnt.
import { oneDecimal, type DiagnosticEvent } from './log-events'

export interface TiltTrace {
  /** Eine Probe je `intervalMs`; nach `batchSize` Proben kommt ein `tilt-trace`-Ereignis. */
  tick: (nowMs: number, tiltDeg: number | null) => DiagnosticEvent | undefined
  reset: () => void
}

export function createTiltTrace(intervalMs: number, batchSize: number): TiltTrace {
  let tilts: (number | null)[] = []
  let lastAt = -Infinity

  return {
    tick(nowMs, tiltDeg) {
      if (nowMs - lastAt < intervalMs) return undefined
      lastAt = nowMs
      tilts.push(tiltDeg === null ? null : oneDecimal(tiltDeg))
      if (tilts.length < batchSize) return undefined
      const event: DiagnosticEvent = { kind: 'tilt-trace', tilts }
      tilts = []
      return event
    },
    reset() {
      tilts = []
      lastAt = -Infinity
    },
  }
}
