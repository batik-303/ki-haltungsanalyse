import type { AnchorColor } from '../core/analysis/anchor-color'

// Paletten je Anker-Farbe (#88): blau = Saphir, gelb = Amber #ffb800 (Glossar
// „gold"), grau = Kamera sieht das Handgelenk nicht sicher.
const PALETTES: Record<AnchorColor, { glow0: string; glow1: string; glow2: string; ring: string; body: [string, string, string, string]; edge: string }> = {
  blue: { glow0: 'rgba(33,150,243,0.25)', glow1: 'rgba(21,101,192,0.08)', glow2: 'rgba(21,101,192,0)',
    ring: '100,181,246', body: ['#64B5F6', '#2196F3', '#1565C0', '#0D47A1'], edge: 'rgba(227,242,253,0.6)' },
  yellow: { glow0: 'rgba(255,184,0,0.25)', glow1: 'rgba(204,140,0,0.08)', glow2: 'rgba(204,140,0,0)',
    ring: '255,184,0', body: ['#FFE08A', '#FFB800', '#D99A00', '#A87600'], edge: 'rgba(255,248,220,0.6)' },
  grey: { glow0: 'rgba(158,158,158,0.18)', glow1: 'rgba(117,117,117,0.06)', glow2: 'rgba(117,117,117,0)',
    ring: '158,158,158', body: ['#E0E0E0', '#9E9E9E', '#757575', '#545454'], edge: 'rgba(245,245,245,0.5)' },
}

/**
 * Render a sapphire-styled anchor point with glow, gradients, and ⚓ symbol.
 * When streakSeconds > 0, glow intensifies and pulse radius grows (capped at 60s).
 * `tone` färbt den Anker (blau/gelb/grau), `opacity` dient dem Überblenden.
 */
export function drawSapphireAnchor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  now: number,
  streakSeconds = 0,
  tone: AnchorColor = 'blue',
  opacity = 1,
) {
  if (opacity <= 0) return
  const pulse = Math.sin(now / 500) * 0.15 + 0.85
  const colors = PALETTES[tone]

  // Streak-based glow scaling (0..1, capped at 60s)
  const streakFactor = Math.min(1, streakSeconds / 60)
  const glowR = r * (3.5 + streakFactor * 2.5) // grows from 3.5x to 6x

  // Outer glow (pulsing, grows with streak)
  const grad3 = ctx.createRadialGradient(x, y, r, x, y, glowR)
  grad3.addColorStop(0, colors.glow0)
  grad3.addColorStop(0.5, colors.glow1)
  grad3.addColorStop(1, colors.glow2)
  ctx.globalAlpha = pulse * (0.85 + streakFactor * 0.15) * opacity
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, Math.PI * 2)
  ctx.fillStyle = grad3
  ctx.fill()
  ctx.globalAlpha = opacity

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
  ctx.globalAlpha = 1

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
