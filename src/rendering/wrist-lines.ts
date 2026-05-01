import { getTensionColor } from './colors'

/**
 * Render wrist analysis lines: arm line, hand line (color-coded), dashed reference.
 */
export function drawWristLines(
  ctx: CanvasRenderingContext2D,
  ex: number, ey: number,  // elbow
  wx: number, wy: number,  // wrist
  ix: number, iy: number,  // index finger
  tensionScore: number,
  lastBendForward: boolean,
  angleDiff: number,
  wristRepairStatus?: { repaired: boolean; inDeadzone: boolean; timeInZone: number },
  wristGlowLevel?: number,
  masterPrintAngle?: number,
) {
  // Color: pure blue in dead zone (< 10), then tension color for clear peripheral readability.
  const lineColor = tensionScore < 10 ? '#2196F3' : getTensionColor(tensionScore)

  // Dashed reference line (straight extension of arm through wrist)
  const armDirX = wx - ex
  const armDirY = wy - ey
  const armLen = Math.sqrt(armDirX * armDirX + armDirY * armDirY)
  const handLen = Math.sqrt((ix - wx) ** 2 + (iy - wy) ** 2)
  const refEndX = wx + (armDirX / armLen) * handLen
  const refEndY = wy + (armDirY / armLen) * handLen

  ctx.setLineDash([8, 5])
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.lineTo(refEndX, refEndY)
  ctx.strokeStyle = '#2196F3'
  ctx.lineWidth = 4
  ctx.globalAlpha = 0.5
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.setLineDash([])



  // ── Gerade Linie im reparierten Zustand ──
  if (wristRepairStatus?.repaired && masterPrintAngle !== undefined) {
    // Berechne Zielpunkt für "gerade" Linie nach MasterPrint-Winkel
    const armLen = Math.sqrt((wx - ex) ** 2 + (wy - ey) ** 2)
    const handLen = Math.sqrt((ix - wx) ** 2 + (iy - wy) ** 2)
    // Richtung: Armvektor
    const armDirX = (wx - ex) / (armLen || 1)
    const armDirY = (wy - ey) / (armLen || 1)
    // Gerade Linie: wrist → Zielpunkt (gleiche Länge wie Hand)
    const straightX = wx + armDirX * handLen
    const straightY = wy + armDirY * handLen
    // Dezente Linie
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(straightX, straightY)
    ctx.strokeStyle = '#bfc9d1'
    ctx.lineWidth = 8
    ctx.globalAlpha = 0.18
    ctx.stroke()
    ctx.globalAlpha = 1
    // Optional: dezenter Punkt am Ziel
    ctx.beginPath()
    ctx.arc(straightX, straightY, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#bfc9d1'
    ctx.globalAlpha = 0.12
    ctx.fill()
    ctx.globalAlpha = 1
    // Arm-Linie bleibt wie gehabt
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.lineTo(wx, wy)
    ctx.strokeStyle = '#bfc9d1'
    ctx.lineWidth = 8
    ctx.globalAlpha = 0.12
    ctx.stroke()
    ctx.globalAlpha = 1
    // Glow wie gehabt
    if (wristGlowLevel && wristGlowLevel > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(wx, wy)
      ctx.lineTo(straightX, straightY)
      ctx.strokeStyle = '#5b9bd5'
      ctx.shadowColor = '#5b9bd5'
      ctx.shadowBlur = 32
      ctx.lineWidth = 18
      ctx.globalAlpha = 0.18 + 0.22 * wristGlowLevel
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }
    return
  }

  // ── Sapphire Glow nur bei "repariert" ──
  if (wristRepairStatus?.repaired || (wristGlowLevel && wristGlowLevel > 0)) {
    const t = wristRepairStatus?.timeInZone ?? 0
    const baseGlow = Math.min(1, t / 1200)
    const flash = wristGlowLevel ?? 0
    const intensity = Math.max(baseGlow, flash)
    // Gerade Linie für Glow
    const armLen = Math.sqrt((wx - ex) ** 2 + (wy - ey) ** 2)
    const handLen = Math.sqrt((ix - wx) ** 2 + (iy - wy) ** 2)
    const armDirX = (wx - ex) / (armLen || 1)
    const armDirY = (wy - ey) / (armLen || 1)
    const straightX = wx + armDirX * handLen
    const straightY = wy + armDirY * handLen;
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(straightX, straightY)
    ctx.strokeStyle = '#5b9bd5'
    ctx.shadowColor = '#5b9bd5'
    ctx.shadowBlur = 22 + 38 * intensity
    const lineWidth = 8 + (tensionScore / 100) * 14
    ctx.lineWidth = lineWidth + 28 * intensity
    ctx.globalAlpha = 0.18 + 0.22 * intensity
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.restore()
  }

  // Broken hand line (wrist -> kink -> finger) für Knick-Visualisierung
  const perpX = -armDirY / armLen
  const perpY = armDirX / armLen
  const bendStrength = Math.min(1, angleDiff / 20)
  // Larger kink for forward bend to compensate for 2D foreshortening
  const baseKink = lastBendForward ? 24 : 18
  const kinkOffset = (baseKink + (tensionScore / 100) * 14) * bendStrength * (lastBendForward ? 1 : -1)
  const kinkX = wx + (ix - wx) * 0.35 + perpX * kinkOffset
  const kinkY = wy + (iy - wy) * 0.35 + perpY * kinkOffset

  // Hand line (wrist -> kink -> finger) — thicker scaling for peripheral visibility
  const lineWidth = 8 + (tensionScore / 100) * 14
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.lineTo(kinkX, kinkY)
  ctx.lineTo(ix, iy)
  ctx.strokeStyle = lineColor
  ctx.lineWidth = lineWidth
  ctx.globalAlpha = 0.9
  ctx.stroke()
  ctx.globalAlpha = 1

  // Edge highlights
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(wx, wy)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.3
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.lineTo(kinkX, kinkY)
  ctx.lineTo(ix, iy)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.25
  ctx.stroke()
  ctx.globalAlpha = 1

  // Kein Tension-Glow mehr bei Abweichung – nur Knick und Farbe zeigen die Abweichung.

  // Highlight the "break" point.
  if (angleDiff > 1) {
    ctx.beginPath()
    ctx.arc(kinkX, kinkY, 4 + bendStrength * 2, 0, Math.PI * 2)
    ctx.fillStyle = lineColor
    ctx.globalAlpha = 0.8
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // Angle display
  ctx.font = 'bold 14px sans-serif'
  ctx.fillStyle = lineColor
  ctx.globalAlpha = 0.8
  ctx.textAlign = 'left'
  ctx.fillText(Math.round(angleDiff) + '°', wx + 25, wy - 5)
  ctx.globalAlpha = 1

  // Small dots at elbow and finger
  ctx.beginPath()
  ctx.arc(ex, ey, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#5b9bd544'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ix, iy, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#5b9bd544'
  ctx.fill()
}
