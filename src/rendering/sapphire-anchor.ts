/**
 * Render a sapphire-styled anchor point with glow, gradients, and ⚓ symbol.
 * When streakSeconds > 0, glow intensifies and pulse radius grows (capped at 60s).
 * When colorOverride is provided, the anchor is tinted with that color instead of sapphire blue.
 */
export function drawSapphireAnchor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  now: number,
  streakSeconds = 0,
  colorOverride?: string,
) {
  const pulse = Math.sin(now / 500) * 0.15 + 0.85

  // Color palette: default sapphire blue, or override
  const colors = colorOverride === '#F5C842'
    ? { glow0: 'rgba(245,200,66,0.25)', glow1: 'rgba(200,160,40,0.08)', glow2: 'rgba(200,160,40,0)',
        ring: '245,200,66', body: ['#FDE68A', '#F5C842', '#D4A017', '#B8860B'], edge: 'rgba(255,248,220,0.6)' }
    : colorOverride === '#9B59B6'
    ? { glow0: 'rgba(155,89,182,0.25)', glow1: 'rgba(120,60,150,0.08)', glow2: 'rgba(120,60,150,0)',
        ring: '155,89,182', body: ['#D2B4DE', '#9B59B6', '#7D3C98', '#6C3483'], edge: 'rgba(235,220,245,0.6)' }
    : { glow0: 'rgba(33,150,243,0.25)', glow1: 'rgba(21,101,192,0.08)', glow2: 'rgba(21,101,192,0)',
        ring: '100,181,246', body: ['#64B5F6', '#2196F3', '#1565C0', '#0D47A1'], edge: 'rgba(227,242,253,0.6)' }

  // Streak-based glow scaling (0..1, capped at 60s)
  const streakFactor = Math.min(1, streakSeconds / 60)
  const glowR = r * (3.5 + streakFactor * 2.5) // grows from 3.5x to 6x

  // Outer glow (pulsing, grows with streak)
  const grad3 = ctx.createRadialGradient(x, y, r, x, y, glowR)
  grad3.addColorStop(0, colors.glow0)
  grad3.addColorStop(0.5, colors.glow1)
  grad3.addColorStop(1, colors.glow2)
  ctx.globalAlpha = pulse * (0.85 + streakFactor * 0.15)
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, Math.PI * 2)
  ctx.fillStyle = grad3
  ctx.fill()
  ctx.globalAlpha = 1

  // Middle glow ring (brighter with streak)
  ctx.beginPath()
  ctx.arc(x, y, r * (2 + streakFactor * 0.8), 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${colors.ring},${0.3 + streakFactor * 0.2})`
  ctx.lineWidth = 1.5 + streakFactor * 1
  ctx.stroke()

  // Main body (gradient)
  const b = colors.body
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
  grad.addColorStop(0, b[0]!)
  grad.addColorStop(0.4, b[1]!)
  grad.addColorStop(0.8, b[2]!)
  grad.addColorStop(1, b[3]!)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // Edge highlight
  ctx.strokeStyle = colors.edge
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

  // Streak readout (small, below anchor)
  if (streakSeconds > 0) {
    const secs = Math.floor(streakSeconds)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#E3F2FD'
    ctx.globalAlpha = 0.4 + streakFactor * 0.3
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(`${secs}s`, x, y + r + 8)
    ctx.globalAlpha = 1
    ctx.textBaseline = 'alphabetic'
  }
}
