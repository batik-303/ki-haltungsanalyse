import { TILT_MAX_DEG } from './wrist-bar'

// ─────────────────────────────────────────────────────────────
//  FLOW-ANSICHT (Wrist-Modus, #77/#99, #114): nur die periphere
//  Leiste, mittig, höchstens ≈ 60 % der Bildschirmhöhe.
// ─────────────────────────────────────────────────────────────
//  Das Canvas hat Videogröße. Im Flow füllt es den Bereich über der
//  Knopf-Zeile (object-cover, zentriert) — die Knöpfe liegen also nie
//  im Canvas, eine Reserve für sie braucht es hier nicht.
// ─────────────────────────────────────────────────────────────

/** Anteil der Hand an der Gesamtlänge der Leiste (wie in der Analyse-Ansicht). */
export const RAIL_HAND_FRACTION = 0.36
/** Strichstärke des Arms pro Leistenlänge (16 CSS-Pixel bei 350 CSS-Pixel Länge). */
export const RAIL_ARM_WIDTH_PER_LENGTH = 16 / 350
/** Hand-Strich etwas schmaler als der Arm. */
export const RAIL_HAND_WIDTH_RATIO = 0.8
/** Breite des weichen Leuchtens hinter den Linien pro Armbreite. */
export const RAIL_HALO_WIDTH_RATIO = 2.6

// Ränder in CSS-Pixeln — gemessen bis zum Ende des Leuchtens, nicht bis zum Linienende.
const FLOW_EDGE_MARGIN_CSS = 16
/** Höchstens dieser Anteil der Bildschirmhöhe, samt Leuchten (Entscheidung 3 aus #104). */
export const FLOW_RAIL_MAX_SCREEN_FRACTION = 0.6

export interface FlowRailLayoutInput {
  /** Canvas-Größe in Canvas-Pixeln (= Videogröße). */
  canvasWidth: number
  canvasHeight: number
  /** Sichtbare Größe des Canvas-Elements in CSS-Pixeln (= Bereich über der Knopf-Zeile). */
  viewWidth: number
  viewHeight: number
  /** Ganze Bildschirmhöhe in CSS-Pixeln — Maßstab für die 60 %. */
  screenHeight: number
}

/** Lage und Maße einer peripheren Leiste in Canvas-Pixeln (Analyse oder Flow). */
export interface RailLayout {
  /** Mitte der Leiste (x) in Canvas-Pixeln. */
  cx: number
  /** Oberes Ende (Handspitze in Ruhe) und unteres Ende (Arm) in Canvas-Pixeln. */
  top: number
  bottom: number
  /** Strichstärke des Arms in Canvas-Pixeln. */
  armWidth: number
  /** Canvas-Pixel pro CSS-Pixel. */
  px: number
}

/** Maße und Lage der Flow-Leiste — mittig, höchstens 60 % der Bildschirmhöhe, Breite folgt der Länge. */
export function computeFlowRailLayout(input: FlowRailLayoutInput): RailLayout {
  const { canvasWidth, canvasHeight, viewWidth, viewHeight, screenHeight } = input
  const scale = Math.max(viewWidth / canvasWidth, viewHeight / canvasHeight)
  const px = 1 / scale

  // Länge samt Leuchten oben und unten (es reicht über die runde Kappe hinaus):
  // höchstens 60 % des Bildschirms und mit Rand im Bereich; die gekippte Hand
  // bleibt samt halber Strichbreite seitlich im Bild.
  const heightRoomCss = Math.min(
    screenHeight * FLOW_RAIL_MAX_SCREEN_FRACTION,
    viewHeight - 2 * FLOW_EDGE_MARGIN_CSS,
  )
  const halosPerLength = RAIL_HALO_WIDTH_RATIO * RAIL_ARM_WIDTH_PER_LENGTH // zwei halbe Leuchtbreiten
  const reachPerLength = RAIL_HAND_FRACTION * Math.sin((TILT_MAX_DEG * Math.PI) / 180)
    + (RAIL_HAND_WIDTH_RATIO * RAIL_ARM_WIDTH_PER_LENGTH) / 2
  const totalCss = Math.max(0, Math.min(
    heightRoomCss / (1 + halosPerLength),
    (viewWidth / 2 - FLOW_EDGE_MARGIN_CSS) / reachPerLength,
  ))

  // Senkrecht mittig im Bereich über der Knopf-Zeile.
  const topCss = (viewHeight - totalCss) / 2
  const visibleTop = (canvasHeight - viewHeight * px) / 2
  const top = visibleTop + topCss * px

  return {
    cx: canvasWidth / 2,
    top,
    bottom: top + totalCss * px,
    armWidth: totalCss * RAIL_ARM_WIDTH_PER_LENGTH * px,
    px,
  }
}
