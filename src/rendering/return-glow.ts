/**
 * Render the return-to-anchor expanding ring animation.
 */
export function drawReturnGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  coreR: number,
  glowTimer: number,
  isViolin: boolean,
) {
  if (glowTimer <= 0) return

  const gp = 1 - (glowTimer / 1.5)
  const ringColor = isViolin ? '#FFD700' : '#2196F3'
  const secondRingColor = isViolin ? '#DAA520' : '#64B5F6'
  const centerColor = isViolin ? '#FFF8DC' : '#E3F2FD'

  // Outer expanding ring
  ctx.beginPath()
  ctx.arc(x, y, coreR + 80 * gp, 0, Math.PI * 2)
  ctx.strokeStyle = ringColor
  ctx.lineWidth = 4 * (1 - gp)
  ctx.globalAlpha = (1 - gp) * 0.6
  ctx.stroke()
  ctx.globalAlpha = 1

  // Second ring (delayed)
  if (gp > 0.15) {
    ctx.beginPath()
    ctx.arc(x, y, coreR + 80 * (gp - 0.15), 0, Math.PI * 2)
    ctx.strokeStyle = secondRingColor
    ctx.lineWidth = 3 * (1 - gp)
    ctx.globalAlpha = (1 - gp) * 0.4
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // White center flash
  ctx.beginPath()
  ctx.arc(x, y, coreR + 25 * Math.max(0, 1 - gp * 2), 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = Math.max(0, 0.8 - gp)
  ctx.fill()
  ctx.globalAlpha = 1

  // Colored center glow
  ctx.beginPath()
  ctx.arc(x, y, coreR + 3, 0, Math.PI * 2)
  ctx.fillStyle = centerColor
  ctx.globalAlpha = Math.min(1, glowTimer * 0.8)
  ctx.fill()
  ctx.globalAlpha = 1
}
