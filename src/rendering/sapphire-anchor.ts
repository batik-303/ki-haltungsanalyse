/**
 * Render a sapphire-styled anchor point with glow, gradients, and ⚓ symbol.
 */
export function drawSapphireAnchor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  now: number,
) {
  const pulse = Math.sin(now / 500) * 0.15 + 0.85

  // Outer glow (pulsing)
  const grad3 = ctx.createRadialGradient(x, y, r, x, y, r * 3.5)
  grad3.addColorStop(0, 'rgba(33,150,243,0.25)')
  grad3.addColorStop(0.5, 'rgba(21,101,192,0.08)')
  grad3.addColorStop(1, 'rgba(21,101,192,0)')
  ctx.globalAlpha = pulse
  ctx.beginPath()
  ctx.arc(x, y, r * 3.5, 0, Math.PI * 2)
  ctx.fillStyle = grad3
  ctx.fill()
  ctx.globalAlpha = 1

  // Middle glow ring
  ctx.beginPath()
  ctx.arc(x, y, r * 2, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(100,181,246,0.3)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Main sapphire body (gradient)
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
  grad.addColorStop(0, '#64B5F6')
  grad.addColorStop(0.4, '#2196F3')
  grad.addColorStop(0.8, '#1565C0')
  grad.addColorStop(1, '#0D47A1')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // White edge highlight
  ctx.strokeStyle = 'rgba(227,242,253,0.6)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Inner sparkle (facet effect)
  const sparkX = x - r * 0.35
  const sparkY = y - r * 0.35
  ctx.beginPath()
  ctx.arc(sparkX, sparkY, r * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(sparkX + r * 0.1, sparkY + r * 0.15, r * 0.15, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fill()

  // Anchor symbol
  ctx.font = 'bold ' + Math.round(r * 0.9) + 'px sans-serif'
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('⚓', x, y)
  ctx.textBaseline = 'alphabetic'
}
