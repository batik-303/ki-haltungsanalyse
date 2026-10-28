// ─────────────────────────────────────────────────────────────
//  RAHMEN DER SPIEGEL-ANSICHT (#114, Entscheidungen aus #104)
// ─────────────────────────────────────────────────────────────
//  Zwischen Kopfzeile und Knopf-Zeile steht das ganze Kamerabild,
//  kein Zoom (wie `object-contain`). Der Rahmen ist genau das sichtbare
//  Bild: Video, Canvas, Randglühen und Kärtchen sitzen darin — so liegt
//  keine Bedienung auf dem Körper.
// ─────────────────────────────────────────────────────────────

export interface SessionFrameInput {
  /** Größe des Kamerabilds in Videopixeln (0, solange noch unbekannt). */
  videoWidth: number
  videoHeight: number
  /** Freier Bereich zwischen Kopfzeile und Knopf-Zeile in CSS-Pixeln. */
  areaWidth: number
  areaHeight: number
}

/** Lage und Größe des Rahmens im freien Bereich, in CSS-Pixeln. */
export interface SessionFrame {
  left: number
  top: number
  width: number
  height: number
}

/** Ganzes Kamerabild eingepasst und mittig im freien Bereich. */
export function computeSessionFrame(input: SessionFrameInput): SessionFrame {
  const { videoWidth, videoHeight, areaWidth, areaHeight } = input
  if (areaWidth <= 0 || areaHeight <= 0) return { left: 0, top: 0, width: 0, height: 0 }
  if (videoWidth <= 0 || videoHeight <= 0) return { left: 0, top: 0, width: areaWidth, height: areaHeight }

  const scale = Math.min(areaWidth / videoWidth, areaHeight / videoHeight)
  const width = videoWidth * scale
  const height = videoHeight * scale
  return { left: (areaWidth - width) / 2, top: (areaHeight - height) / 2, width, height }
}
