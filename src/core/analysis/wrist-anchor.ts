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
 * @param prev     vorherige geglättete Position (oder null vor der ersten Hand-0)
 * @param hand0    aktuelle Hand-0 in Pixeln (oder null, wenn die Hand fehlt)
 * @param alpha    Basis-EMA-Gewicht im Stillstand (ANCHOR_POS_ALPHA) — ruhig,
 *                 zitterfrei.
 * @param maxAlpha Optionales Ober-Gewicht bei schneller Bewegung. Fehlt es, ist
 *                 die Glättung eine reine EMA mit `alpha` (Rückwärtskompat).
 * @param speedRef Bewegungs-Distanz (px) zwischen prev und hand0, ab der voll auf
 *                 `maxAlpha` hochgeregelt wird. Der Nachlauf beim Lagenwechsel
 *                 verschwindet, ohne im Stillstand ein Zittern einzuhandeln.
 */
export function resolveWristAnchor(
  prev: WristAnchorPos | null,
  hand0: WristAnchorPos | null,
  alpha: number,
  maxAlpha?: number,
  speedRef?: number,
): WristAnchorState {
  if (hand0) {
    // Erste Hand-0 → exakt dort initialisieren, kein Nachlauf. Danach EMA.
    if (!prev) {
      return { pos: { x: hand0.x, y: hand0.y }, hasEverSeenHand: true }
    }
    // Geschwindigkeits-adaptives Gewicht: im Stillstand `alpha`, bei schneller
    // Bewegung Richtung `maxAlpha` (One-Euro-Philosophie: ruhig ↔ reaktiv).
    let effAlpha = alpha
    if (maxAlpha !== undefined) {
      const dist = Math.hypot(hand0.x - prev.x, hand0.y - prev.y)
      const t = speedRef && speedRef > 0 ? Math.min(1, dist / speedRef) : dist > 0 ? 1 : 0
      effAlpha = alpha + (maxAlpha - alpha) * t
    }
    const pos = {
      x: prev.x * (1 - effAlpha) + hand0.x * effAlpha,
      y: prev.y * (1 - effAlpha) + hand0.y * effAlpha,
    }
    return { pos, hasEverSeenHand: true }
  }
  // Hand fehlt: letzte Position einfrieren. prev !== null ⇒ es gab schon eine
  // Hand-0 (der Anker wird nur von Hand-0 gesetzt). Kein Pose-15-Seed.
  return { pos: prev, hasEverSeenHand: prev !== null }
}
