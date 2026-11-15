// Farbwechsel des Handgelenk-Ankers fürs Diagnose-Log (#200).
// Liest die fertige Farbe nur mit; Analyse, Grenzen und Farb-Logik bleiben unberührt.
import type { AnchorColor, KnickSide } from '../types'
import { knickSideLabel, oneDecimal, type DiagnosticEvent, type GreyReason } from './log-events'

export type ColorChangeInput = {
  color: AnchorColor
  /** Knick in Grad; `null`, wenn kein Körper im Bild ist. */
  knick: number | null
  side: KnickSide | null
  nowMs: number
  /** Grund der unsicheren Sicht in diesem Bild (#199); geht nur beim Wechsel nach Grau ins Log. */
  reason?: GreyReason | null
}

/** Factory: meldet ein Ereignis nur beim Wechsel der Farbe, nicht bei jedem Bild. */
export function createColorChangeLog() {
  // Start wie das Grau-Tor: blau. Die Zeit läuft ab dem ersten Bild.
  let last: AnchorColor = 'blue'
  let lastChangeAt: number | null = null

  function update({ color, knick, side, nowMs, reason }: ColorChangeInput): DiagnosticEvent | undefined {
    lastChangeAt ??= nowMs
    if (color === last) return undefined
    const event: DiagnosticEvent = {
      kind: 'color-change',
      from: last,
      to: color,
      knick: knick === null ? null : oneDecimal(knick),
      side: side === null ? null : knickSideLabel(side),
      msSinceLast: Math.round(nowMs - lastChangeAt),
      ...(color === 'grey' && reason && { reason }),
    }
    last = color
    lastChangeAt = nowMs
    return event
  }

  function reset(): void {
    last = 'blue'
    lastChangeAt = null
  }

  return { update, reset }
}
