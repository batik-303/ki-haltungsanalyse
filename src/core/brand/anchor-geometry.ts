// Reine Geometrie der Blue-Anchor-Marke — „vereinfachte Viertelnote": leuchtender
// Ankerpunkt (Notenkopf) + zentrierter, elastischer „Weg" (Hals). Gewählte
// Variante „Gummiband" aus #37. Kein React, kein DOM — nur Werte fürs SVG.

/** Fester viewBox der Solo-Marke; garantiert scharfe Skalierung auf jeder Größe. */
export const ANCHOR_MARK_VIEWBOX = '0 0 120 150'

/** Ab dieser Renderbreite (px, einschließlich) gilt die kompakte Favicon-Fassung. */
const COMPACT_MAX_PX = 32

/** Ab dieser Renderbreite (px) wird das weiße Glanzlicht auf dem Punkt gezeichnet. */
const HIGHLIGHT_MIN_PX = 48

/** Referenz-Gummiband-Pfad des Wegs (Hals) aus dem #37-Prototyp. */
const NECK_PATH_FULL = 'M60 104 C 52 78 68 56 60 22'

/** Dezenter geschwungener Weg für Favicon-Größen (Krümmung zurückgenommen). */
const NECK_PATH_COMPACT = 'M60 104 C 57 82 63 58 60 22'

export interface AnchorMarkGeometry {
  /** Pfad des „Wegs" (Notenhals) im 120×150-viewBox. */
  neckPath: string
  /** Strichstärke des Wegs; bei Favicon-Größen dicker für Lesbarkeit. */
  neckStrokeWidth: number
  /** stdDeviation des Glow-Blurs; bei kleinen Größen reduziert, damit der Punkt scharf bleibt. */
  glowStdDeviation: number
  /** Ob das weiße Glanzlicht gezeichnet wird (bei sehr kleinen Größen weggelassen). */
  showHighlight: boolean
}

/**
 * Liefert die größenabhängige Geometrie der Marke. Bei Favicon-Größen (≤32px)
 * wird die Krümmung dezent zurückgenommen und der Hals dicker gezeichnet, damit
 * das Zeichen auch im Browser-Tab lesbar bleibt.
 */
export function computeAnchorMarkGeometry(renderedSizePx: number): AnchorMarkGeometry {
  const compact = renderedSizePx <= COMPACT_MAX_PX
  return {
    neckPath: compact ? NECK_PATH_COMPACT : NECK_PATH_FULL,
    neckStrokeWidth: compact ? 9 : 6.5,
    glowStdDeviation: compact ? 2.4 : 4.5,
    showHighlight: renderedSizePx >= HIGHLIGHT_MIN_PX,
  }
}
