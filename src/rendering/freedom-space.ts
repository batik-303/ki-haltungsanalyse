import { getTensionColor } from './colors'

/**
 * Render the "Raum der Freiheit" (freedom space) between ear and shoulder.
 */
export function drawFreedomSpace(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  tensionScore: number,
  now: number,
) {
  const freeRatio = Math.max(0, 1 - tensionScore / 100)
  const spaceWidth = 50 + freeRatio * 30
  const halfW = spaceWidth / 2
  const color = getTensionColor(tensionScore)

  const spaceTop = ey + 5
  const spaceBottom = sy - 5
  const fullHeight = spaceBottom - spaceTop
  const visibleTop = spaceTop + fullHeight * (1 - freeRatio) * 0.7
  const centerX = (sx + ex) / 2

  if (fullHeight <= 10) return

  // Outer glow
  const glowGrad = ctx.createLinearGradient(centerX, visibleTop, centerX, spaceBottom)
  glowGrad.addColorStop(0, color)
  glowGrad.addColorStop(1, '#2196F3')
  ctx.beginPath()
  ctx.roundRect(centerX - halfW - 8, visibleTop - 5, (halfW + 8) * 2, spaceBottom - visibleTop + 10, 12)
  ctx.fillStyle = glowGrad
  ctx.globalAlpha = 0.08 + freeRatio * 0.07
  ctx.fill()
  ctx.globalAlpha = 1

  // Main area
  const mainGrad = ctx.createLinearGradient(centerX, visibleTop, centerX, spaceBottom)
  mainGrad.addColorStop(0, color)
  mainGrad.addColorStop(0.5, '#2196F3')
  mainGrad.addColorStop(1, '#1565C0')
  ctx.beginPath()
  ctx.roundRect(centerX - halfW, visibleTop, halfW * 2, spaceBottom - visibleTop, 8)
  ctx.fillStyle = mainGrad
  ctx.globalAlpha = 0.25 + freeRatio * 0.3
  ctx.fill()
  ctx.globalAlpha = 1

  // Border
  ctx.beginPath()
  ctx.roundRect(centerX - halfW, visibleTop, halfW * 2, spaceBottom - visibleTop, 8)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.3 + freeRatio * 0.3
  ctx.stroke()
  ctx.globalAlpha = 1

  // Breathing animation when free
  if (freeRatio > 0.7) {
    const breathe = Math.sin(now / 1500) * 3
    ctx.beginPath()
    ctx.roundRect(centerX - halfW - breathe, visibleTop - breathe, (halfW + breathe) * 2, spaceBottom - visibleTop + breathe * 2, 10)
    ctx.strokeStyle = '#64B5F6'
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.15 * (freeRatio - 0.7) / 0.3
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Pulsing border at high tension
  if (tensionScore > 50) {
    const pulse = Math.sin(now / 300) * 0.5 + 0.5
    ctx.beginPath()
    ctx.roundRect(centerX - halfW - 2, visibleTop - 2, (halfW + 2) * 2, spaceBottom - visibleTop + 4, 8)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.globalAlpha = pulse * 0.4
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}
