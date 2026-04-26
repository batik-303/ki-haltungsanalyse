/**
 * Render the golden band connecting the anchor to the current wrist position (violin mode).
 */
export function drawGoldenBand(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  wristX: number,
  wristY: number,
  tensionScore: number,
  now: number,
) {
  const bandLength = Math.abs(wristY - anchorY)
  const bandDir = wristY > anchorY ? 1 : -1
  const visualIntensity = Math.min(1, bandLength / 120)
  const bandIntensity = Math.max(Math.min(1, tensionScore / 60), visualIntensity)

  if (tensionScore <= 3 || bandLength <= 2) return

  const bandW = 4 + bandIntensity * 8

  // Outer glow
  ctx.beginPath()
  ctx.moveTo(anchorX - bandW * 1.5, anchorY)
  ctx.lineTo(anchorX + bandW * 1.5, anchorY)
  ctx.lineTo(anchorX + bandW * 0.8, wristY)
  ctx.lineTo(anchorX - bandW * 0.8, wristY)
  ctx.closePath()
  ctx.fillStyle = '#DAA520'
  ctx.globalAlpha = bandIntensity * 0.15
  ctx.fill()
  ctx.globalAlpha = 1

  // Main band
  ctx.beginPath()
  ctx.moveTo(anchorX - bandW, anchorY)
  ctx.lineTo(anchorX + bandW, anchorY)
  ctx.lineTo(anchorX + bandW * 0.5, wristY)
  ctx.lineTo(anchorX - bandW * 0.5, wristY)
  ctx.closePath()
  ctx.fillStyle = '#DAA520'
  ctx.globalAlpha = 0.15 + bandIntensity * 0.35
  ctx.fill()
  ctx.globalAlpha = 1

  // Core band (narrow, bright)
  ctx.beginPath()
  ctx.moveTo(anchorX - 2, anchorY)
  ctx.lineTo(anchorX + 2, anchorY)
  ctx.lineTo(anchorX + 1.5, wristY)
  ctx.lineTo(anchorX - 1.5, wristY)
  ctx.closePath()
  ctx.fillStyle = '#FFD700'
  ctx.globalAlpha = 0.3 + bandIntensity * 0.5
  ctx.fill()
  ctx.globalAlpha = 1

  // Edge lines
  ctx.beginPath()
  ctx.moveTo(anchorX - bandW * 0.6, anchorY)
  ctx.lineTo(anchorX - bandW * 0.3, wristY)
  ctx.moveTo(anchorX + bandW * 0.6, anchorY)
  ctx.lineTo(anchorX + bandW * 0.3, wristY)
  ctx.strokeStyle = '#B8860B'
  ctx.lineWidth = 1
  ctx.globalAlpha = bandIntensity * 0.4
  ctx.stroke()
  ctx.globalAlpha = 1

  // Direction arrow
  if (tensionScore > 20) {
    const arrowY = wristY + bandDir * 8
    ctx.font = '14px sans-serif'
    ctx.fillStyle = '#DAA520'
    ctx.globalAlpha = 0.7
    ctx.textAlign = 'center'
    ctx.fillText(bandDir > 0 ? '▼' : '▲', anchorX, arrowY)
    ctx.globalAlpha = 1
  }

  // Pulse at high tension
  if (tensionScore > 40) {
    const pp = Math.sin(now / 500) * 0.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(anchorX, anchorY)
    ctx.lineTo(anchorX, wristY)
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 2 + pp * 3
    ctx.globalAlpha = (1 - pp) * 0.2
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}
