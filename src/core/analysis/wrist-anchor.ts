/**
 * Reine Positions-Logik für den Wrist-Saphir-Anker (#79).
 *
 * Der Anker sitzt ausschließlich auf `handLandmarks[0]` (präziser
 * Handgelenksknorren). Init exakt auf der ersten Hand-0 (kein Nachlauf),
 * danach EMA-Glättung. Fehlt die Hand, wird die letzte Position eingefroren —
 * KEIN Rückfall auf das Pose-Handgelenk (Pose-15). Solange nie eine Hand-0
 * gesehen wurde, gibt es keinen Anker (Grau-Zustand: #74).
 */
export interface WristAnchorPos {
  x: number
  y: number
}

export interface WristAnchorState {
  /** Geglättete Ankerposition (Pixel) oder null, solange nie eine Hand-0 da war. */
  pos: WristAnchorPos | null
  /** true, sobald jemals eine Hand-0 die Position gesetzt hat. */
  hasEverSeenHand: boolean
}

/**
 * @param prev  vorherige geglättete Position (oder null vor der ersten Hand-0)
 * @param hand0 aktuelle Hand-0 in Pixeln (oder null, wenn die Hand fehlt)
 * @param alpha EMA-Gewicht (ANCHOR_POS_ALPHA)
 */
export function resolveWristAnchor(
  prev: WristAnchorPos | null,
  hand0: WristAnchorPos | null,
  alpha: number,
): WristAnchorState {
  if (hand0) {
    // Erste Hand-0 → exakt dort initialisieren, kein Nachlauf. Danach EMA.
    const pos = prev
      ? {
          x: prev.x * (1 - alpha) + hand0.x * alpha,
          y: prev.y * (1 - alpha) + hand0.y * alpha,
        }
      : { x: hand0.x, y: hand0.y }
    return { pos, hasEverSeenHand: true }
  }
  // Hand fehlt: letzte Position einfrieren. prev !== null ⇒ es gab schon eine
  // Hand-0 (der Anker wird nur von Hand-0 gesetzt). Kein Pose-15-Seed.
  return { pos: prev, hasEverSeenHand: prev !== null }
}
