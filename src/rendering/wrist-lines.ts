import { lerpColor } from './colors'

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
) {
  // Color: direction-based
  let lineColor: string
  const t = tensionScore
  if (t < 10) {
    lineColor = '#2196F3'
  } else if (lastBendForward) {
    lineColor = lerpColor('#2196F3', '#E74C3C', Math.min(1, t / 80))
  } else {
    lineColor = lerpColor('#2196F3', '#E67E22', Math.min(1, t / 80))
  }

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

  // Arm line (elbow → wrist)
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(wx, wy)
  ctx.strokeStyle = '#5b9bd5'
  ctx.lineWidth = 8
  ctx.globalAlpha = 0.8
  ctx.stroke()
  ctx.globalAlpha = 1

  // Hand line (wrist → finger)
  const lineWidth = 8 + (tensionScore / 100) * 6
  ctx.beginPath()
  ctx.moveTo(wx, wy)
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
  ctx.lineTo(ix, iy)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.25
  ctx.stroke()
  ctx.globalAlpha = 1

  // Glow at tension
  if (tensionScore > 10) {
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(ix, iy)
    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth + 16
    ctx.globalAlpha = (tensionScore / 100) * 0.25
    ctx.stroke()
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
