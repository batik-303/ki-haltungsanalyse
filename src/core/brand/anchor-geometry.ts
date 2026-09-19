// Reine Geometrie der Blue-Anchor-Marke — „vereinfachte Viertelnote": leuchtender
// Ankerpunkt (Notenkopf) + gerader, senkrechter „Weg" (Hals als Steg). Variante
// „Aufwärts" aus #48; ersetzt bewusst das elastische Gummiband (#37/#41).
// Kein React, kein DOM — nur Werte fürs SVG (`line` + glühender `circle`).

/** Fester viewBox der Solo-Marke; garantiert scharfe Skalierung auf jeder Größe. */
export const ANCHOR_MARK_VIEWBOX = '0 0 120 150'

/** Ab dieser Renderbreite (px, einschließlich) gilt die kompakte Favicon-Fassung. */
const COMPACT_MAX_PX = 32

/** Ab dieser Renderbreite (px) wird das weiße Glanzlicht auf dem Punkt gezeichnet. */
const HIGHLIGHT_MIN_PX = 48

/** Endpunkte des geraden, senkrechten Stegs im 120×150-viewBox. */
interface StegSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Ankerpunkt (Notenkopf) im 120×150-viewBox. */
interface AnchorDot {
  cx: number
  cy: number
  r: number
}

export interface AnchorMarkGeometry {
  /** Gerader, senkrechter Steg (Notenhals) als Linien-Endpunkte. */
  steg: StegSegment
  /** Strichstärke des Stegs; bei Favicon-Größen dicker für Lesbarkeit. */
  stegStrokeWidth: number
  /** Leuchtender Ankerpunkt (Notenkopf) unter dem Steg. */
  dot: AnchorDot
  /** stdDeviation des Glow-Blurs; bei kleinen Größen reduziert, damit der Punkt scharf bleibt. */
  glowStdDeviation: number
  /** Ob das weiße Glanzlicht gezeichnet wird (bei sehr kleinen Größen weggelassen). */
  showHighlight: boolean
}

/** Zentrierter Ankerpunkt; der Steg-Fuß reicht bis knapp in den Punkt. */
const DOT: AnchorDot = { cx: 60, cy: 112, r: 22 }

/** Senkrechter Steg von oben bis knapp in den Ankerpunkt (kein Spalt). */
const STEG: StegSegment = { x1: 60, y1: 22, x2: 60, y2: 94 }

/**
 * Liefert die größenabhängige Geometrie der Marke. Steg und Punkt sind
 * größenunabhängig positioniert; bei Favicon-Größen (≤32px) wird der Steg dicker
 * und der Glow-Blur kleiner gezeichnet, damit das Zeichen im Browser-Tab lesbar
 * bleibt, und das Glanzlicht entfällt.
 */
export function computeAnchorMarkGeometry(renderedSizePx: number): AnchorMarkGeometry {
  const compact = renderedSizePx <= COMPACT_MAX_PX
  return {
    steg: STEG,
    stegStrokeWidth: compact ? 11 : 8,
    dot: DOT,
    glowStdDeviation: compact ? 2.4 : 4.5,
    showHighlight: renderedSizePx >= HIGHLIGHT_MIN_PX,
  }
}
