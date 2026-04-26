/**
 * Render a dashed target outline showing where to stand before calibration.
 */
export function drawTargetZone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  distanceOk: boolean,
) {
  const centerX = width / 2
  const targetShoulderW = width * 0.28
  const targetHeadY = height * 0.15
  const targetShoulderY = height * 0.38
  const targetHipY = height * 0.7

  ctx.globalAlpha = distanceOk ? 0.2 : 0.12
  ctx.strokeStyle = distanceOk ? '#2ecc71' : '#5b9bd5'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 6])

  // Head circle
  ctx.beginPath()
  ctx.arc(centerX, targetHeadY + 30, 25, 0, Math.PI * 2)
  ctx.stroke()

  // Shoulders line
  ctx.beginPath()
  ctx.moveTo(centerX - targetShoulderW, targetShoulderY)
  ctx.lineTo(centerX + targetShoulderW, targetShoulderY)
  ctx.stroke()

  // Body outline
  ctx.beginPath()
  ctx.moveTo(centerX - targetShoulderW, targetShoulderY)
  ctx.lineTo(centerX - targetShoulderW * 0.7, targetHipY)
  ctx.moveTo(centerX + targetShoulderW, targetShoulderY)
  ctx.lineTo(centerX + targetShoulderW * 0.7, targetHipY)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.globalAlpha = 1
}
