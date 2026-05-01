/**
 * Render wrist feedback: yellow dashed line (wrist→MCP) on deviation, nothing on correct.
 * Minimal, peripherally readable. Anchor is drawn separately by sapphire-anchor module.
 */
export function drawWristLines(
  ctx: CanvasRenderingContext2D,
  wx: number, wy: number,  // wrist (anchor position)
  mx: number, my: number,  // MCP (hand endpoint)
  angleDiff: number,        // degrees deviation from calibration
  wristGlowLevel?: number,
) {
  const DEADZONE_DEG = 10
  const MIN_LINE_LEN = 60 // minimum visible length in pixels

  // Compute direction from wrist to MCP, ensure minimum length
  let dx = mx - wx
  let dy = my - wy
  const dist = Math.sqrt(dx * dx + dy * dy)
  // Normalize and extend to minimum length for visibility
  if (dist > 0) {
    const len = Math.max(dist, MIN_LINE_LEN)
    dx = (dx / dist) * len
    dy = (dy / dist) * len
  } else {
    // Fallback: straight up if MCP overlaps wrist
    dx = 0
    dy = -MIN_LINE_LEN
  }
  const endX = wx + dx
  const endY = wy + dy

  // Within deadzone: nothing to draw (clean state)
  if (angleDiff <= DEADZONE_DEG && (!wristGlowLevel || wristGlowLevel <= 0)) {
    return
  }

  // ── Return glow (sapphire flash on wrist→MCP line when returning to correct) ──
  if (wristGlowLevel && wristGlowLevel > 0 && angleDiff <= DEADZONE_DEG) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(endX, endY)
    ctx.strokeStyle = '#5b9bd5'
    ctx.shadowColor = '#5b9bd5'
    ctx.shadowBlur = 18 + 24 * wristGlowLevel
    ctx.lineWidth = 6 + 10 * wristGlowLevel
    ctx.globalAlpha = 0.2 + 0.3 * wristGlowLevel
    ctx.stroke()
    ctx.restore()
    return
  }

  // ── Deviation: yellow dashed line from wrist toward MCP ──
  if (angleDiff > DEADZONE_DEG) {
    // Intensity scales with deviation (subtle at 10°, strong at 30°+)
    const intensity = Math.min(1, (angleDiff - DEADZONE_DEG) / 20)
    const lineWidth = 4 + intensity * 6
    const alpha = 0.6 + intensity * 0.3

    ctx.save()
    ctx.setLineDash([10, 6])
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(endX, endY)
    ctx.strokeStyle = '#F5C842' // warm yellow
    ctx.lineWidth = lineWidth
    ctx.globalAlpha = alpha
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Small dot at endpoint
    ctx.beginPath()
    ctx.arc(endX, endY, 3 + intensity * 2, 0, Math.PI * 2)
    ctx.fillStyle = '#F5C842'
    ctx.globalAlpha = alpha * 0.8
    ctx.fill()
    ctx.globalAlpha = 1
  }
}
