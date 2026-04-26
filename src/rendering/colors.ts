/**
 * Utility: linear interpolation between two hex colors.
 */
export function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.replace('#', ''), 16)
  const bh = parseInt(b.replace('#', ''), 16)
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff
  return '#' + ((1 << 24) +
    (Math.round(ar + (br - ar) * t) << 16) +
    (Math.round(ag + (bg - ag) * t) << 8) +
    Math.round(ab + (bb - ab) * t)).toString(16).slice(1)
}

/**
 * Get the tension color: Blue → Yellow → Purple.
 */
export function getTensionColor(tensionScore: number): string {
  if (tensionScore < 50) {
    return lerpColor('#2196F3', '#F1C40F', tensionScore / 50)
  }
  return lerpColor('#F1C40F', '#9B59B6', (tensionScore - 50) / 50)
}
