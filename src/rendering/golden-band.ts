/**
 * Render a directional elastic line from the fixed anchor to the live wrist position.
 * Gold line = violin sinking, silver-blue line = violin rising.
 * Thickness + opacity scale with tension. Invisible at tension < 3.
 */
export function drawGoldenBand(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  wristX: number,
  wristY: number,
  tensionScore: number,
  now: number,
  driftDirection: number,
) {
  if (tensionScore <= 3) return

  const intensity = Math.min(1, tensionScore / 100)
  // Sinken: driftDirection > 0, Steigen: < 0
  const sinking = driftDirection > 0

  // Farben und Dicke je nach Richtung
  const coreColor = sinking ? '#FFD700' : '#64B5F6'
  const glowColor = sinking ? '#DAA520' : '#90CAF9'
  // Sinken: dicker (bis 14px), Steigen: dünner (bis 6px)
  const lineWidth = sinking
    ? 3 + intensity * 11 // 3–14px
    : 1 + intensity * 5 // 1–6px

  // Opazität: 0.15 → 0.7
  const baseOpacity = 0.15 + intensity * 0.55

  // ── Outer glow ──
  ctx.beginPath()
  ctx.moveTo(anchorX, anchorY)
  ctx.lineTo(wristX, wristY)
  ctx.strokeStyle = glowColor
  ctx.lineWidth = lineWidth * 2.2
  ctx.lineCap = 'round'
  ctx.globalAlpha = baseOpacity * 0.22
  ctx.stroke()
  ctx.globalAlpha = 1

  // ── Main line ──
  ctx.beginPath()
  ctx.moveTo(anchorX, anchorY)
  ctx.lineTo(wristX, wristY)
  ctx.strokeStyle = glowColor
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.globalAlpha = baseOpacity
  ctx.stroke()
  ctx.globalAlpha = 1

  // ── Bright core ──
  ctx.beginPath()
  ctx.moveTo(anchorX, anchorY)
  ctx.lineTo(wristX, wristY)
  ctx.strokeStyle = coreColor
  ctx.lineWidth = Math.max(1, lineWidth * 0.45)
  ctx.lineCap = 'round'
  ctx.globalAlpha = baseOpacity + 0.15
  ctx.stroke()
  ctx.globalAlpha = 1

  // ── Richtungspfeil am Handgelenk (tension > 10) ──
  if (tensionScore > 10) {
    const dx = wristX - anchorX
    const dy = wristY - anchorY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 5) {
      const arrowX = wristX + (dx / dist) * 10
      const arrowY = wristY + (dy / dist) * 10
      ctx.font = '14px sans-serif'
      ctx.fillStyle = coreColor
      ctx.globalAlpha = Math.min(0.8, baseOpacity + 0.1)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(sinking ? '▼' : '▲', arrowX, arrowY)
      ctx.globalAlpha = 1
      ctx.textBaseline = 'alphabetic'
    }
  }

  // ── Puls bei hoher Spannung (>80) ──
  if (tensionScore > 80) {
    const pulse = Math.sin(now / 400) * 0.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(anchorX, anchorY)
    ctx.lineTo(wristX, wristY)
    ctx.strokeStyle = coreColor
    ctx.lineWidth = lineWidth + pulse * (sinking ? 6 : 2)
    ctx.lineCap = 'round'
    ctx.globalAlpha = (1 - pulse) * 0.2
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}
