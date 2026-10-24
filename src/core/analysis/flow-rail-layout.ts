import { TILT_MAX_DEG } from './wrist-bar'

// ─────────────────────────────────────────────────────────────
//  FLOW-ANSICHT (Wrist-Modus, #77/#99): nur die periphere Leiste,
//  groß in der Mitte, fast volle Bildschirmhöhe.
// ─────────────────────────────────────────────────────────────
//  Das Canvas hat Videogröße. Im Flow füllt es den Bildschirm
//  (object-cover, zentriert), damit die Leiste auf Handy und Laptop
//  nach derselben Regel fast von oben bis unten reicht.
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
const FLOW_TOP_MARGIN_CSS = 16
const FLOW_SIDE_MARGIN_CSS = 16
const FLOW_GAP_ABOVE_BUTTONS_CSS = 8
// Knöpfe unten (session-screen.tsx): Handy = im Flow um 14 px angehobene Leiste
// (bottom-3.5, Handy-Test 24.10.) mit 44-px-Knopf, Rand und Safe-Area; Laptop = Knopf-Reihe + Abstand + Mikrofon über clamp(24px, 6vh, 96px).
const PHONE_MAX_WIDTH_CSS = 480
const FLOW_BUTTONS_PHONE_CSS = 108
const FLOW_BUTTONS_DESKTOP_CSS = 88
const DESKTOP_BUTTONS_OFFSET_MIN_CSS = 24
const DESKTOP_BUTTONS_OFFSET_MAX_CSS = 96
const DESKTOP_BUTTONS_OFFSET_VH = 0.06

export interface FlowRailLayoutInput {
  /** Canvas-Größe in Canvas-Pixeln (= Videogröße). */
  canvasWidth: number
  canvasHeight: number
  /** Sichtbare Größe des Canvas-Elements in CSS-Pixeln (= Bildschirm). */
  viewWidth: number
  viewHeight: number
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

/** Maße und Lage der Flow-Leiste — mittig, fast volle Höhe, Breite folgt der Höhe. */
export function computeFlowRailLayout(input: FlowRailLayoutInput): RailLayout {
  const { canvasWidth, canvasHeight, viewWidth, viewHeight } = input
  const scale = Math.max(viewWidth / canvasWidth, viewHeight / canvasHeight)
  const px = 1 / scale

  const buttonsCss = viewWidth < PHONE_MAX_WIDTH_CSS
    ? FLOW_BUTTONS_PHONE_CSS
    : FLOW_BUTTONS_DESKTOP_CSS + Math.min(
        DESKTOP_BUTTONS_OFFSET_MAX_CSS,
        Math.max(DESKTOP_BUTTONS_OFFSET_MIN_CSS, viewHeight * DESKTOP_BUTTONS_OFFSET_VH),
      )

  // Länge: so hoch wie möglich (inkl. Leuchten oben und unten — es reicht über die
  // runde Kappe hinaus), aber die gekippte Hand bleibt samt halber Strichbreite
  // seitlich im Bild.
  const heightRoomCss = viewHeight - FLOW_TOP_MARGIN_CSS - buttonsCss - FLOW_GAP_ABOVE_BUTTONS_CSS
  const halosPerLength = RAIL_HALO_WIDTH_RATIO * RAIL_ARM_WIDTH_PER_LENGTH // zwei halbe Leuchtbreiten
  const reachPerLength = RAIL_HAND_FRACTION * Math.sin((TILT_MAX_DEG * Math.PI) / 180)
    + (RAIL_HAND_WIDTH_RATIO * RAIL_ARM_WIDTH_PER_LENGTH) / 2
  const totalCss = Math.max(0, Math.min(
    heightRoomCss / (1 + halosPerLength),
    (viewWidth / 2 - FLOW_SIDE_MARGIN_CSS) / reachPerLength,
  ))

  // Senkrecht mittig im freien Bereich zwischen oberem Rand und Knöpfen.
  const haloCss = (totalCss * halosPerLength) / 2
  const topCss = FLOW_TOP_MARGIN_CSS + haloCss + (heightRoomCss - totalCss * (1 + halosPerLength)) / 2
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
