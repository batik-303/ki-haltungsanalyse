// ─────────────────────────────────────────────────────────────
//  ANKERGRÖSSE (Wrist-Modus, #102/#106)
// ─────────────────────────────────────────────────────────────
//  Das Canvas hat Videogröße und wird je nach Gerät verkleinert (Handy) oder
//  vergrößert (Laptop). Damit der Anker überall gleich groß aussieht, wird
//  seine Größe in CSS-Pixeln festgelegt und in Canvas-Pixel umgerechnet.
// ─────────────────────────────────────────────────────────────

export interface ContainPxInput {
  /** Canvas-Größe in Canvas-Pixeln (= Videogröße). */
  canvasWidth: number
  canvasHeight: number
  /** Sichtbare Größe des Canvas-Elements in CSS-Pixeln. */
  viewWidth: number
  viewHeight: number
}

/** Canvas-Pixel pro CSS-Pixel, wenn das Canvas per `object-contain` eingepasst ist. */
export function computeContainPx(input: ContainPxInput): number {
  const { canvasWidth, canvasHeight, viewWidth, viewHeight } = input
  if (!viewWidth || !viewHeight) return 1
  const cssPerCanvas = Math.min(viewWidth / canvasWidth, viewHeight / canvasHeight)
  return cssPerCanvas > 0 ? 1 / cssPerCanvas : 1
}

/** Radius des Ankers auf dem Körper in CSS-Pixeln (≈ bisherige Laptop-Größe). */
export const ANCHOR_RADIUS_CSS = 18
/** Leichtes Pulsieren um den Radius, in CSS-Pixeln. */
const ANCHOR_PULSE_CSS = 1.5
const ANCHOR_PULSE_PERIOD_MS = 600

/** Radius des Ankers auf dem Körper in Canvas-Pixeln — auf allen Geräten gleich groß. */
export function computeAnchorRadius(px: number, now: number): number {
  return (ANCHOR_RADIUS_CSS + Math.sin(now / ANCHOR_PULSE_PERIOD_MS) * ANCHOR_PULSE_CSS) * px
}

/** Anker in der Leiste pro Armbreite (wächst mit der Linienstärke). */
const RAIL_ANCHOR_PER_ARM_WIDTH = 1.4
/** Zuschlag in CSS-Pixeln, plus Wachstum beim einmaligen Aufleuchten. */
const RAIL_ANCHOR_EXTRA_CSS = 2
const RAIL_ANCHOR_GLOW_CSS = 4

/** Radius des Saphir-Ankers in der peripheren Leiste in Canvas-Pixeln (Analyse und Flow). */
export function computeRailAnchorRadius(armWidth: number, px: number, anchorGlow: number): number {
  return armWidth * RAIL_ANCHOR_PER_ARM_WIDTH + (RAIL_ANCHOR_EXTRA_CSS + anchorGlow * RAIL_ANCHOR_GLOW_CSS) * px
}
